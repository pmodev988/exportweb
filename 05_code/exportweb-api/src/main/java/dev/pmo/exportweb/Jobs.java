package dev.pmo.exportweb;
import java.util.*;
import org.springframework.stereotype.Service;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.transaction.support.TransactionTemplate;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.dao.DuplicateKeyException;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;
import tools.jackson.databind.ObjectMapper;
@Service
class Jobs {
 record Ticket(UUID id,String kind,String status,int progress,String message,Object result){}
 record Work(long tenantId,UUID orgId,UUID id){}
 private final JdbcTemplate db;private final TransactionTemplate tx;private final ProjectMapper scopes;private final ObjectMapper json;
 Jobs(JdbcTemplate db,PlatformTransactionManager manager,ProjectMapper scopes,ObjectMapper json){this.db=db;this.tx=new TransactionTemplate(manager);this.scopes=scopes;this.json=json;}
 private <T>T in(Work w,java.util.function.Supplier<T> action){return tx.execute(t->{scopes.scope(w.tenantId(),w.orgId());return action.get();});}
 Ticket create(OpsAccess.Scope scope,UUID person,UUID id,String kind,long revision,Object input){
  if(!Set.of("PLAN","TRANSLATE","IMPORT","EDIT","ARTICLE").contains(kind))throw new ResponseStatusException(HttpStatus.BAD_REQUEST,"不支持的建站任务");
  Work w=new Work(scope.tenantId(),scope.orgId(),id);
  try{return in(w,()->{
   expire(w);
   var old=find(w);if(old!=null){if(!old.get("kind").equals(kind)||((Number)old.get("expected_revision")).longValue()!=revision||!json.readTree((String)old.get("input_text")).equals(json.valueToTree(input)))throw new ResponseStatusException(HttpStatus.CONFLICT,"请求编号已被使用");return ticket(old);}
   db.update("insert into exportweb_job(tenant_id,org_id,id,person_id,host,kind,expected_revision,input) values(?,?,?,?,?,?,?,?::jsonb)",w.tenantId(),w.orgId(),id,person,scope.host(),kind,revision,json.writeValueAsString(input));
   db.update("insert into exportweb_job_outbox(job_id,tenant_id,org_id) values(?,?,?)",id,w.tenantId(),w.orgId());
   return ticket(find(w));
  });}catch(DuplicateKeyException e){throw new ResponseStatusException(HttpStatus.CONFLICT,"本组织已有正在执行的任务，请完成或取消后再操作");}
 }
 private Map<String,Object> find(Work w){var rows=db.queryForList("select *,input::text as input_text,result::text as result_text from exportweb_job where tenant_id=? and org_id=? and id=?",w.tenantId(),w.orgId(),w.id());return rows.isEmpty()?null:rows.getFirst();}
 private void expire(Work w){db.update("update exportweb_job set status='FAILED',message='任务中断，原有内容保留；请核对后重试',updated_at=now() where tenant_id=? and org_id=? and status='RUNNING' and updated_at < now()-interval '5 minutes'",w.tenantId(),w.orgId());}
 private Ticket ticket(Map<String,Object> row){if(row==null)throw new ResponseStatusException(HttpStatus.NOT_FOUND,"任务不存在");return new Ticket((UUID)row.get("id"),(String)row.get("kind"),(String)row.get("status"),((Number)row.get("progress")).intValue(),(String)row.get("message"),row.get("result_text")==null?null:json.readTree((String)row.get("result_text")));}
 Ticket read(OpsAccess.Scope scope,UUID id){var w=new Work(scope.tenantId(),scope.orgId(),id);return in(w,()->{expire(w);return ticket(find(w));});}
 List<Ticket> recent(OpsAccess.Scope scope){var w=new Work(scope.tenantId(),scope.orgId(),UUID.randomUUID());return in(w,()->{expire(w);return db.queryForList("select *,result::text as result_text from exportweb_job where tenant_id=? and org_id=? order by created_at desc limit 10",scope.tenantId(),scope.orgId()).stream().map(this::ticket).toList();});}
 Ticket cancel(OpsAccess.Scope scope,UUID id){var w=new Work(scope.tenantId(),scope.orgId(),id);return in(w,()->{
  db.update("update exportweb_job set status='CANCELLED',message='已取消，原有内容保留',updated_at=now() where tenant_id=? and org_id=? and id=? and status in ('QUEUED','RUNNING')",w.tenantId(),w.orgId(),id);return ticket(find(w));
 });}
 Map<String,Object> claim(Work w){return in(w,()->{
  var row=find(w);if(row==null)return null;
  if("RUNNING".equals(row.get("status")))return null;
  if(db.update("update exportweb_job set status='RUNNING',progress=5,message='正在处理',updated_at=now() where tenant_id=? and org_id=? and id=? and status='QUEUED'",w.tenantId(),w.orgId(),w.id())!=1)return null;
  return row;
 });}
 void checkpoint(Work w,int progress,String message){in(w,()->{if(db.update("update exportweb_job set progress=?,message=?,updated_at=now() where tenant_id=? and org_id=? and id=? and status='RUNNING'",progress,message,w.tenantId(),w.orgId(),w.id())!=1)throw new java.util.concurrent.CancellationException();return null;});}
 void partial(Work w,Object result){in(w,()->{if(db.update("update exportweb_job set result=?::jsonb,updated_at=now() where tenant_id=? and org_id=? and id=? and status='RUNNING'",json.writeValueAsString(result),w.tenantId(),w.orgId(),w.id())!=1)throw new java.util.concurrent.CancellationException();return null;});}
 void complete(Work w,java.util.function.Supplier<Object> save){in(w,()->{
  var row=db.queryForList("select status from exportweb_job where tenant_id=? and org_id=? and id=? for update",w.tenantId(),w.orgId(),w.id());
  if(row.isEmpty()||!"RUNNING".equals(row.getFirst().get("status")))throw new java.util.concurrent.CancellationException();
  Object result=save.get();
  db.update("update exportweb_job set status='SUCCEEDED',progress=100,message='已完成',result=?::jsonb,updated_at=now() where tenant_id=? and org_id=? and id=?",json.writeValueAsString(result),w.tenantId(),w.orgId(),w.id());return null;
 });}
 private void failIn(Work w,String message){db.update("update exportweb_job set status='FAILED',message=?,updated_at=now() where tenant_id=? and org_id=? and id=? and status in ('RUNNING','QUEUED')",message,w.tenantId(),w.orgId(),w.id());}
 void fail(Work w,String message){in(w,()->{failIn(w,message);return null;});}
}
