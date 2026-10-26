package dev.pmo.exportweb;
import java.net.URI;
import java.net.http.*;
import java.nio.charset.StandardCharsets;
import java.nio.file.*;
import java.security.*;
import java.time.*;
import java.util.*;
import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import org.springframework.security.oauth2.core.oidc.user.OidcUser;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.http.HttpStatus;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;
@Component
class OpsAccess {
 static final int PRODUCT_CODE=302;
 record Scope(long tenantId,UUID orgId,UUID runtimeScopeId,String host){}
 record Entry(long tenantId,UUID orgId,UUID runtimeScopeId,String host,String serviceName){
  Entry(long tenantId,UUID orgId,UUID runtimeScopeId,String host){this(tenantId,orgId,runtimeScopeId,host,"302");}
 }
 record Choice(UUID orgId,UUID runtimeScopeId,String name){}
 record Membership(Entry entry,Choice organization){}
 private record AccessResult(List<Choice> choices,String reason){}
 private final String endpoint,keyFile;private final ObjectMapper json;
 private final HttpClient http=HttpClient.newBuilder().connectTimeout(Duration.ofSeconds(5)).followRedirects(HttpClient.Redirect.NEVER).build();
 OpsAccess(@Value("${exportweb.identity.url}")String endpoint,@Value("${exportweb.identity.key-file}")String keyFile,ObjectMapper json){this.endpoint=endpoint;this.keyFile=keyFile;this.json=json;}
 JsonNode call(String path,Object payload){
  try{
   URI target=URI.create(endpoint+path);if(!"https".equals(target.getScheme()))throw new IllegalStateException();
   String body=json.writeValueAsString(payload),time=Long.toString(Instant.now().getEpochSecond()),nonce=UUID.randomUUID().toString();
   String hash=HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(body.getBytes(StandardCharsets.UTF_8)));
   byte[] key=Base64.getDecoder().decode(Files.readString(Path.of(keyFile)).strip());
   String signature;
   try{if(key.length!=32)throw new IllegalStateException();var mac=Mac.getInstance("HmacSHA256");mac.init(new SecretKeySpec(key,"HmacSHA256"));signature=Base64.getUrlEncoder().withoutPadding().encodeToString(mac.doFinal(("POST\n"+path+"\n"+time+"\n"+nonce+"\n"+hash+"\n"+PRODUCT_CODE).getBytes(StandardCharsets.UTF_8)));}finally{Arrays.fill(key,(byte)0);}
   var req=HttpRequest.newBuilder(target).timeout(Duration.ofSeconds(10)).header("Content-Type","application/json").header("X-OPS-Consumer",Integer.toString(PRODUCT_CODE)).header("X-OPS-Time",time).header("X-OPS-Nonce",nonce).header("X-OPS-Signature",signature).POST(HttpRequest.BodyPublishers.ofString(body)).build();
   var response=http.send(req,HttpResponse.BodyHandlers.ofString());
   if(response.statusCode()!=200)throw new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE,"组织的服务访问尚未开通或已失效");
   return json.readTree(response.body());
  }catch(ResponseStatusException e){throw e;}catch(Exception e){throw new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE,"暂时无法核对组织访问权限");}
 }
 Entry entry(String host){
  return entry(host,null);
 }
 Entry entry(String host,String identityEntry){
  if(host==null||!host.matches("[a-z0-9][a-z0-9.-]{1,251}[a-z0-9]"))throw new ResponseStatusException(HttpStatus.BAD_REQUEST,"访问地址无效");
  if(identityEntry!=null)try{
   var origin=URI.create(identityEntry);
   if(!"https".equals(origin.getScheme())||origin.getHost()==null||origin.getUserInfo()!=null||!origin.getRawPath().isEmpty()||origin.getRawQuery()!=null||origin.getRawFragment()!=null||identityEntry.length()>300)throw new IllegalArgumentException();
  }catch(IllegalArgumentException invalid){throw new ResponseStatusException(HttpStatus.BAD_REQUEST,"登录来源地址无效");}
  var result=call("/internal/v2/runtime/service-domain-resolve",identityEntry==null?Map.of("host",host):Map.of("host",host,"identityEntry",identityEntry));
  try{if(!host.equals(result.path("host").asText())||!result.path("catalogCode").isIntegralNumber()||result.path("catalogCode").asInt()!=PRODUCT_CODE||result.path("tenantId").asLong()<1)throw new IllegalArgumentException();
   if(identityEntry!=null&&!identityEntry.equals(result.path("identityEntry").asText()))throw new IllegalArgumentException();
   String name=result.path("serviceName").asText("").strip();if(name.isEmpty())name=Integer.toString(PRODUCT_CODE);
   if(result.path("orgId").isNull()&&result.path("runtimeScopeId").isNull())return new Entry(result.path("tenantId").asLong(),null,null,host,name);
   return new Entry(result.path("tenantId").asLong(),UUID.fromString(result.path("orgId").asText()),UUID.fromString(result.path("runtimeScopeId").asText()),host,name);
  }catch(Exception e){throw new ResponseStatusException(HttpStatus.FORBIDDEN,"该入口不是有效的产品组织地址");}
 }
 Scope resolve(String host){
  var entry=entry(host);if(entry.orgId()==null)throw new ResponseStatusException(HttpStatus.FORBIDDEN,"此地址是服务入口；独立网站地址须由平台管理员指派给组织");
  return new Scope(entry.tenantId(),entry.orgId(),entry.runtimeScopeId(),host);
 }
 UUID person(OidcUser user){
  if(user==null)throw new ResponseStatusException(HttpStatus.UNAUTHORIZED,"请登录");
  try{return UUID.fromString(user.getSubject());}catch(Exception e){throw new ResponseStatusException(HttpStatus.FORBIDDEN,"账号身份无效");}
 }
 List<Choice> choices(String host,OidcUser user){return accessResult(entry(host),person(user)).choices();}
 Membership membership(String host,OidcUser user){
  UUID person=person(user);var entry=entry(host);return new Membership(entry,organization(entry,person));
 }
 private Choice organization(Entry entry,UUID person){
  var result=accessResult(entry,person);var available=result.choices();
  if(available.isEmpty())throw new ResponseStatusException(HttpStatus.FORBIDDEN,denial(result.reason()));
  if(available.size()!=1)throw new ResponseStatusException(HttpStatus.FORBIDDEN,"账号组织资料异常，请联系管理员核对唯一所属组织。");
  return available.getFirst();
 }
 private static String denial(String reason){
  return switch(reason){
   case "SERVICE_ENTITLEMENT_REQUIRED" -> "当前账号尚未取得 302 的有效使用权益。请管理员在 OPS「订阅与席位」核对组织订阅及本账号席位，并核对成员服务授权。";
   case "SERVICE_ENTITLEMENT_STALE" -> "302 使用权益尚未同步完成，暂时无法确认访问权限。请稍后重试；持续出现时请管理员检查权益同步。";
   case "SERVICE_SUSPENDED" -> "当前账号的 302 使用权益已停用，请管理员在 OPS 核对订阅与席位状态。";
   case "SERVICE_EXPIRED" -> "当前账号的 302 使用权益已到期，请管理员在 OPS 核对订阅与席位的有效期。";
   default -> "当前登录账号没有有效的 302 组织使用权限。请管理员核对账号所属组织、组织服务及成员授权。";
  };
 }
 private AccessResult accessResult(Entry entry,UUID person){
  var result=call("/internal/v2/runtime/product-scopes",Map.of("personId",person.toString(),"tenantId",entry.tenantId(),"entryHost",entry.host()));
  var choices=new ArrayList<Choice>();var seen=new HashSet<UUID>();
  for(var row:result.path("scopes"))if("ORG".equals(row.path("subjectType").asText()))try{
   var org=UUID.fromString(row.path("orgId").asText());var runtime=UUID.fromString(row.path("runtimeScopeId").asText());
   if(entry.orgId()!=null&&(!entry.orgId().equals(org)||!entry.runtimeScopeId().equals(runtime)))continue;
   if(!seen.add(org))throw new IllegalArgumentException();choices.add(new Choice(org,runtime,row.path("name").asText()));
  }catch(Exception invalid){throw new ResponseStatusException(HttpStatus.FORBIDDEN,"组织权限返回无效");}
  return new AccessResult(List.copyOf(choices),result.path("accessReason").asText(""));
 }
 Scope authorize(String host,OidcUser user){
  return authorizePerson(host,person(user));
 }
 Scope authorize(String host,OidcUser user,UUID selected){return authorizePerson(host,person(user),selected);}
 Scope authorizePerson(String host,UUID person){
  return authorizePerson(host,person,null);
 }
 Scope authorizePerson(String host,UUID person,UUID selected){
  var entry=entry(host);
  if(entry.orgId()!=null&&selected!=null&&!selected.equals(entry.orgId()))throw new ResponseStatusException(HttpStatus.FORBIDDEN,"组织与入口不匹配");
  var organization=organization(entry,person);
  if(selected!=null&&!selected.equals(organization.orgId()))throw new ResponseStatusException(HttpStatus.FORBIDDEN,"组织与账号所属组织不匹配");
  return new Scope(entry.tenantId(),organization.orgId(),organization.runtimeScopeId(),host);
 }
}
