package dev.pmo.exportweb;
import java.util.*;
import java.util.concurrent.TimeUnit;
import org.springframework.context.annotation.*;
import org.springframework.stereotype.Component;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.*;
import org.springframework.amqp.rabbit.annotation.RabbitListener;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.amqp.rabbit.connection.CorrelationData;
import org.springframework.amqp.core.*;
import org.springframework.amqp.core.Queue;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.transaction.support.TransactionTemplate;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.web.server.ResponseStatusException;
import tools.jackson.databind.ObjectMapper;

@Configuration
@EnableScheduling
class TaskQueue {
 @Bean Queue exportwebTaskQueue(@Value("${exportweb.jobs.queue:exportweb.business}")String name){return QueueBuilder.durable(name).withArgument("x-dead-letter-exchange","").withArgument("x-dead-letter-routing-key",name+".failed").build();}
 @Bean Queue failedQueue(@Value("${exportweb.jobs.queue:exportweb.business}")String name){return QueueBuilder.durable(name+".failed").build();}
}
@Component
@Profile("worker")
class JobWorker {
 private final Jobs jobs;private final ProjectStore store;private final OpsAccess access;private final AiTasks ai;private final WebsiteImport importer;private final ObjectMapper json;
 private final JdbcTemplate db;private final TransactionTemplate tx;private final RabbitTemplate rabbit;private final String queue;
 JobWorker(Jobs jobs,ProjectStore store,OpsAccess access,AiTasks ai,WebsiteImport importer,ObjectMapper json,JdbcTemplate db,PlatformTransactionManager manager,RabbitTemplate rabbit,@Value("${exportweb.jobs.queue:exportweb.business}")String queue){
  this.jobs=jobs;this.store=store;this.access=access;this.ai=ai;this.importer=importer;this.json=json;this.db=db;this.tx=new TransactionTemplate(manager);this.rabbit=rabbit;this.queue=queue;
 }
 @Scheduled(fixedDelayString="${exportweb.jobs.delivery-delay-ms:2000}") void deliver(){
  tx.execute(t->{
   for(var row:db.queryForList("select * from exportweb_job_outbox where available_at<=now() order by available_at limit 10 for update skip locked")){
    var work=new Jobs.Work(((Number)row.get("tenant_id")).longValue(),(UUID)row.get("org_id"),(UUID)row.get("job_id"));
    try{
     var confirm=new CorrelationData(UUID.randomUUID().toString());
     rabbit.convertAndSend("",queue,json.writeValueAsString(work),message->{message.getMessageProperties().setDeliveryMode(MessageDeliveryMode.PERSISTENT);message.getMessageProperties().setContentType("application/json");return message;},confirm);
     if(!confirm.getFuture().get(5,TimeUnit.SECONDS).isAck()||confirm.getReturned()!=null)throw new IllegalStateException();
     db.update("delete from exportweb_job_outbox where job_id=?",work.id());
    }catch(Exception ex){
     int attempts=((Number)row.get("attempts")).intValue()+1;
     db.update("update exportweb_job_outbox set attempts=?,available_at=now()+make_interval(secs=>?) where job_id=?",attempts,Math.min(300,2*(1<<Math.min(7,attempts))),work.id());
    }
   }return null;
  });
 }
 static void sameScope(OpsAccess.Scope expected,OpsAccess.Scope current){if(current.tenantId()!=expected.tenantId()||!current.orgId().equals(expected.orgId())||!Objects.equals(current.runtimeScopeId(),expected.runtimeScopeId()))throw new IllegalArgumentException("组织使用范围已变化，请重新运行任务");}
 @RabbitListener(queues="${exportweb.jobs.queue:exportweb.business}",concurrency="1") void run(String message){
  Jobs.Work work=json.readValue(message,Jobs.Work.class);var row=jobs.claim(work);if(row==null)return;
  try{
   String host=(String)row.get("host");UUID person=(UUID)row.get("person_id");
   var scope=access.authorizePerson(host,person,work.orgId());
   if(scope.tenantId()!=work.tenantId()||!scope.orgId().equals(work.orgId()))throw new IllegalArgumentException("组织地址已变化");
   var snapshot=store.read(scope);long expected=((Number)row.get("expected_revision")).longValue();
   if(snapshot.revision()!=expected)throw new IllegalArgumentException("资料已修改，请按最新资料重新操作");
   String kind=(String)row.get("kind");
   jobs.checkpoint(work,10,switch(kind){case "IMPORT"->"正在读取网站";case "PLAN"->"正在生成外贸建议";case "EDIT"->"正在编辑页面";case "ARTICLE"->"正在生成文章";default->"正在翻译页面";});
   Object result;
   if(kind.equals("IMPORT")){
    var input=json.readTree((String)row.get("input_text"));result=importer.read(input.path("url").asText(),input.path("details").asBoolean(),snapshot.project().sourceLanguage(),input.path("images").asBoolean(true),input.path("videos").asBoolean(true),(n,count)->jobs.checkpoint(work,10+n*80/Math.max(1,count),"正在读取第 "+n+" / "+count+" 页")).forSite(snapshot.project().websites().activeId());
   }
   else if(kind.equals("ARTICLE")){var input=json.readTree((String)row.get("input_text"));result=ai.article(scope,snapshot.project(),input.path("siteId").asText(),input.path("articleId").asText());}
   else if(kind.equals("PLAN"))result=snapshot.project().withPlan(ai.plan(scope,snapshot.project().company()));
    else if(kind.equals("EDIT")){var input=json.readTree((String)row.get("input_text"));result=ai.edit(scope,snapshot.project(),input.path("pageId").asText(),input.path("instruction").asText());}
   else if(kind.equals("TRANSLATE"))result=ai.translate(scope,snapshot.project(),()->jobs.checkpoint(work,40,"正在翻译页面"));
   else throw new IllegalArgumentException("任务类型无效");
   jobs.checkpoint(work,95,"正在保存结果");
   var current=access.authorizePerson(host,person,work.orgId());
   sameScope(scope,current);
   jobs.complete(work,()->Set.of("IMPORT","ARTICLE").contains(kind)?result:store.save(current,expected,(Project)result));
  }catch(java.util.concurrent.CancellationException ex){}
  catch(ResponseStatusException ex){jobs.fail(work,Objects.toString(ex.getReason(),"任务未完成，原有内容保留"));}
  catch(IllegalArgumentException ex){jobs.fail(work,ex.getMessage());}
  catch(Exception ex){jobs.fail(work,"任务未完成，原有内容保留；请核对后重试");}
 }
}
