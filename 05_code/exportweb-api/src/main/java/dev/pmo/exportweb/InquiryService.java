package dev.pmo.exportweb;
import java.util.*;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;
import tools.jackson.databind.ObjectMapper;
import tools.jackson.databind.node.*;
@Service class InquiryService {
 record Input(UUID id,String name,String email,String company,String country,String subject,String message,String website){}
 private final ProjectStore store;private final ProjectMapper projects;private final InquiryMapper db;private final ObjectMapper json;private final int hourly;
 InquiryService(ProjectStore store,ProjectMapper projects,InquiryMapper db,ObjectMapper json,@Value("${exportweb.inquiry.max-per-hour:10}")int hourly){this.store=store;this.projects=projects;this.db=db;this.json=json;if(hourly<1||hourly>1000)throw new IllegalArgumentException("询盘限流配置无效");this.hourly=hourly;}
 static String digest(String value){try{return HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(value.getBytes(StandardCharsets.UTF_8)));}catch(Exception e){throw new IllegalStateException(e);}}
 private static String text(String value,int max,String name){if(value==null||value.isBlank()||value.length()>max)throw new IllegalArgumentException(name+"：请填写有效内容");return value.strip();}
 @Transactional void accept(OpsAccess.Scope scope,Input input,String client){
  if(input.id()==null||input.website()!=null&&!input.website().isBlank())throw new IllegalArgumentException("提交无效");
  String name=text(input.name(),120,"姓名"),email=text(input.email(),254,"邮箱").toLowerCase(Locale.ROOT),company=text(input.company(),160,"公司"),subject=text(input.subject(),180,"主题"),message=text(input.message(),5000,"内容"),country=text(input.country(),2,"国家代码").toUpperCase(Locale.ROOT);
  if(!email.matches("[^\\s@<>]+@[^\\s@<>]+\\.[^\\s@<>]+")||!country.matches("[A-Z]{2}"))throw new IllegalArgumentException("邮箱或国家代码无效");
  store.published(scope);var snapshot=store.read(scope);projects.lock(scope.tenantId(),scope.orgId());snapshot=store.read(scope);
  String hash=digest(json.writeValueAsString(List.of(name,email,company,country,subject,message))),clientHash=digest(scope.orgId()+":"+client);var existing=db.read(scope.tenantId(),scope.orgId(),input.id());
  if(existing!=null){if(!hash.equals(existing.get("digest")))throw new ResponseStatusException(HttpStatus.CONFLICT,"请勿以相同提交编号发送不同内容");return;}
  if(db.recentCount(scope.tenantId(),scope.orgId(),clientHash)>=hourly)throw new ResponseStatusException(HttpStatus.TOO_MANY_REQUESTS,"提交过于频繁，请稍后重试");
  db.insert(scope.tenantId(),scope.orgId(),input.id(),"inquiry-"+input.id(),scope.host(),name,email,company,country,subject,message,hash,clientHash);
 }
 @Transactional(readOnly=true) List<Map<String,Object>> list(OpsAccess.Scope s,int offset){if(offset<0||offset>100000)throw new IllegalArgumentException("分页无效");projects.scope(s.tenantId(),s.orgId());return db.list(s.tenantId(),s.orgId(),offset);}
 @Transactional(readOnly=true) Map<String,Object> read(OpsAccess.Scope s,UUID id){projects.scope(s.tenantId(),s.orgId());var row=db.read(s.tenantId(),s.orgId(),id);if(row==null)throw new ResponseStatusException(HttpStatus.NOT_FOUND,"询盘不存在");var result=new LinkedHashMap<String,Object>();for(String k:List.of("id","company_id","host","sender_name","email","company_name","country","subject","message","state","note","revision","created_at","updated_at"))result.put(k,row.get(k));return result;}
 @Transactional(readOnly=true) Map<String,Object> summary(OpsAccess.Scope s,String from,String to){var a=java.time.LocalDate.parse(from);var b=java.time.LocalDate.parse(to);if(a.isAfter(b))throw new IllegalArgumentException("日期范围无效");projects.scope(s.tenantId(),s.orgId());return db.summary(s.tenantId(),s.orgId(),from,to);}
 @Transactional void update(OpsAccess.Scope s,UUID id,long revision,String state,String note){if(!Set.of("NEW","HANDLED","SPAM").contains(state)||note==null||note.length()>3000)throw new IllegalArgumentException("处理状态或记录无效");if(state.equals("HANDLED")&&note.isBlank())throw new IllegalArgumentException("请记录处理结果；不能把标记已处理当成已发送");projects.scope(s.tenantId(),s.orgId());if(db.update(s.tenantId(),s.orgId(),id,revision,state,note)!=1)throw new ResponseStatusException(HttpStatus.CONFLICT,"询盘已更新，请刷新后继续");}
}
