package dev.pmo.exportweb;
import java.util.*;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.web.bind.annotation.*;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.core.oidc.user.OidcUser;
import org.springframework.security.web.csrf.CsrfToken;
import org.springframework.http.*;
import org.springframework.core.io.ByteArrayResource;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;
@RestController
class BusinessApi {
 private final OpsAccess access;private final ProjectStore store;private final Jobs jobs;
 @org.springframework.beans.factory.annotation.Autowired private WebsitePackage websitePackage;
 BusinessApi(OpsAccess access,ProjectStore store,Jobs jobs){this.access=access;this.store=store;this.jobs=jobs;}
 private OpsAccess.Scope scope(HttpServletRequest r,OidcUser user){return access.authorize(r.getServerName().toLowerCase(Locale.ROOT),user,null);}
 @GetMapping("/health") Map<String,String> health(){return Map.of("status","UP","version","0.1.0");}
 @GetMapping("/api/v1/csrf") Map<String,String> csrf(CsrfToken token){return Map.of("header",token.getHeaderName(),"token",token.getToken());}
 private String first(String... values){return Arrays.stream(values).filter(Objects::nonNull).map(String::strip).filter(v->!v.isEmpty()).findFirst().orElse("");}
 @GetMapping("/api/v1/account") Map<String,Object> account(@AuthenticationPrincipal OidcUser user){
  if(user==null)throw new ResponseStatusException(HttpStatus.UNAUTHORIZED,"请先登录");
  String login=first(user.getEmail(),Objects.equals(user.getPreferredUsername(),user.getSubject())?null:user.getPreferredUsername());
  String name=Arrays.stream(new String[]{user.getFullName(),user.getNickName(),login}).filter(Objects::nonNull).map(String::strip).filter(v->!v.isEmpty()&&!v.equals(user.getSubject())).findFirst().orElse("");
  return Map.of("personId",user.getSubject(),"name",name,"login",login);
 }
 @GetMapping("/api/v1/session") Map<String,Object> session(HttpServletRequest r,@AuthenticationPrincipal OidcUser user){
  var membership=access.membership(r.getServerName().toLowerCase(Locale.ROOT),user);var entry=membership.entry();var organization=membership.organization();
  var result=new LinkedHashMap<String,Object>(account(user));result.put("orgId",organization.orgId().toString());result.put("organizations",List.of(organization));result.put("sharedEntry",entry.orgId()==null);result.put("catalogCode",OpsAccess.PRODUCT_CODE);result.put("productName",entry.serviceName());return result;
 }
 record OrganizationSelection(UUID orgId){}
 @PostMapping("/api/v1/session/organization") Map<String,Object> select(HttpServletRequest r,@AuthenticationPrincipal OidcUser user,@RequestBody OrganizationSelection input){
  // Compatibility for an older open page: validate the sole membership, never set a browser-selected scope.
  var current=session(r,user);
  if(input.orgId()==null||!input.orgId().toString().equals(current.get("orgId")))throw new ResponseStatusException(HttpStatus.FORBIDDEN,"组织由账号所属关系自动确定，不能切换组织。");
  return current;
 }
 @GetMapping("/api/v1/project") ProjectStore.Snapshot read(HttpServletRequest r,@AuthenticationPrincipal OidcUser user){return store.read(scope(r,user));}
 @PutMapping("/api/v1/project") ProjectStore.Snapshot save(HttpServletRequest r,@AuthenticationPrincipal OidcUser user,@RequestHeader("If-Match")long revision,@RequestBody Project project){return store.save(scope(r,user),revision,project);}
 record PublishRequest(String host){}
 @PostMapping("/api/v1/publications") Map<String,String> publish(HttpServletRequest r,@AuthenticationPrincipal OidcUser user,@RequestHeader("If-Match")long revision,@RequestBody(required=false) PublishRequest input){
  var scope=scope(r,user);String host=input==null||input.host()==null||input.host().isBlank()?scope.host():input.host().trim().toLowerCase(Locale.ROOT);
  var site=access.resolve(host);
  if(site.tenantId()!=scope.tenantId()||!site.orgId().equals(scope.orgId()))throw new ResponseStatusException(HttpStatus.FORBIDDEN,"独立网站地址与组织不匹配");
  access.authorize(host,user,scope.orgId());
  return Map.of("url",store.publish(site,revision));
 }
 @PostMapping("/api/v1/plan") Jobs.Ticket plan(HttpServletRequest r,@AuthenticationPrincipal OidcUser user,@RequestHeader("If-Match")long revision,@RequestHeader("Idempotency-Key")UUID id){
  return enqueue(r,user,revision,id,"PLAN",Map.of());
 }
 @PostMapping("/api/v1/translations") Jobs.Ticket translations(HttpServletRequest r,@AuthenticationPrincipal OidcUser user,@RequestHeader("If-Match")long revision,@RequestHeader("Idempotency-Key")UUID id){
  return enqueue(r,user,revision,id,"TRANSLATE",Map.of());
 }
 record ImportRequest(String url,boolean details,Boolean images,Boolean videos){ImportRequest(String url,boolean details){this(url,details,true,true);}}
 record EditRequest(String pageId,String instruction){}
 record ArticleRequest(String siteId,String articleId){}
 @PostMapping("/api/v1/articles/generate") Jobs.Ticket article(HttpServletRequest r,@AuthenticationPrincipal OidcUser user,@RequestBody ArticleRequest input,@RequestHeader("If-Match")long revision,@RequestHeader("Idempotency-Key")UUID id){
  var project=store.read(scope(r,user)).project();
  if(!project.websites().activeId().equals(input.siteId())||input.articleId()==null||input.articleId().length()>80)throw new IllegalArgumentException("请在文章所属网站生成内容");
  var data=BusinessWorkspace.copy(project);boolean found=false;for(var a:data.path("articles"))if(a.path("id").asText().equals(input.articleId())&&a.path("siteId").asText().equals(input.siteId()))found=true;
  if(!found)throw new IllegalArgumentException("请先保存文章");
  return enqueue(r,user,revision,id,"ARTICLE",input);
 }
 @PostMapping("/api/v1/website-edit") Jobs.Ticket editWebsite(HttpServletRequest r,@AuthenticationPrincipal OidcUser user,@RequestBody EditRequest input,@RequestHeader("If-Match")long revision,@RequestHeader("Idempotency-Key")UUID id){if(input.instruction()==null||input.instruction().isBlank()||input.instruction().length()>5000)throw new IllegalArgumentException("请填写 5000 字以内的编辑要求");return enqueue(r,user,revision,id,"EDIT",input);}
 @PostMapping("/api/v1/website-import") Jobs.Ticket websiteImport(HttpServletRequest r,@AuthenticationPrincipal OidcUser user,@RequestBody ImportRequest input,@RequestHeader("If-Match")long revision,@RequestHeader("Idempotency-Key")UUID id){
  try{PublicWebsiteReader.validate(java.net.URI.create(input.url().trim()));}catch(Exception ex){throw new IllegalArgumentException("请输入公开网站的 HTTPS 地址");}
  return enqueue(r,user,revision,id,"IMPORT",input);
 }
 private Jobs.Ticket enqueue(HttpServletRequest r,OidcUser user,long revision,UUID id,String kind,Object input){
  var scope=scope(r,user);if(store.read(scope).revision()!=revision)throw new ResponseStatusException(HttpStatus.CONFLICT);
  return jobs.create(scope,UUID.fromString(user.getSubject()),id,kind,revision,input);
 }
 @GetMapping("/api/v1/jobs") List<Jobs.Ticket> recent(HttpServletRequest r,@AuthenticationPrincipal OidcUser user){return jobs.recent(scope(r,user));}
 @GetMapping("/api/v1/jobs/{id}") Jobs.Ticket job(HttpServletRequest r,@AuthenticationPrincipal OidcUser user,@PathVariable UUID id){return jobs.read(scope(r,user),id);}
 @PostMapping("/api/v1/jobs/{id}/cancel") Jobs.Ticket cancel(HttpServletRequest r,@AuthenticationPrincipal OidcUser user,@PathVariable UUID id){return jobs.cancel(scope(r,user),id);}
 @PostMapping("/api/v1/assets") Map<String,String> upload(HttpServletRequest r,@AuthenticationPrincipal OidcUser user,@RequestParam MultipartFile file)throws java.io.IOException{
  return Map.of("url",store.asset(scope(r,user),file.getBytes(),Objects.toString(file.getContentType(),""),file.getOriginalFilename()));
 }
 @GetMapping("/api/v1/website-versions") List<Map<String,Object>> websiteVersions(HttpServletRequest r,@AuthenticationPrincipal OidcUser user,@RequestParam(defaultValue="0")int offset){return store.websiteVersions(scope(r,user),offset);}
 record VersionNote(String note){}
 @PostMapping("/api/v1/website-versions") Map<String,Long> saveWebsiteVersion(HttpServletRequest r,@AuthenticationPrincipal OidcUser user,@RequestHeader("If-Match")long revision,@RequestBody VersionNote body){return Map.of("version",store.saveWebsiteVersion(scope(r,user),revision,body.note()));}
 @GetMapping("/api/v1/website-versions/{number}") Map<String,Object> websiteVersion(HttpServletRequest r,@AuthenticationPrincipal OidcUser user,@PathVariable long number){return store.websiteVersion(scope(r,user),number);}
 @PostMapping("/api/v1/website-versions/{number}/restore") ProjectStore.Snapshot restoreWebsiteVersion(HttpServletRequest r,@AuthenticationPrincipal OidcUser user,@RequestHeader("If-Match")long revision,@PathVariable long number){return store.restoreWebsiteVersion(scope(r,user),revision,number);}
 @PostMapping("/api/v1/website-export") ResponseEntity<ByteArrayResource> exportWebsite(HttpServletRequest r,@AuthenticationPrincipal OidcUser user,@RequestHeader("If-Match")long revision)throws java.io.IOException{return ResponseEntity.ok().contentType(MediaType.parseMediaType("application/zip")).header("Content-Disposition","attachment; filename=website.zip").header("Cache-Control","no-store").body(new ByteArrayResource(websitePackage.create(scope(r,user),revision)));}
 @GetMapping("/api/v1/assets/{id}") ResponseEntity<ByteArrayResource> asset(HttpServletRequest r,@AuthenticationPrincipal OidcUser user,@PathVariable UUID id){return media(store.asset(scope(r,user),id,false));}
 @GetMapping("/media/{id}") ResponseEntity<ByteArrayResource> publicAsset(HttpServletRequest r,@PathVariable UUID id){return media(store.asset(access.resolve(r.getServerName()),id,true));}
 private ResponseEntity<ByteArrayResource> media(Map<String,Object> row){return ResponseEntity.ok().contentType(MediaType.parseMediaType((String)row.get("media_type"))).header("X-Content-Type-Options","nosniff").header("Cache-Control","private, no-store").body(new ByteArrayResource((byte[])row.get("content")));}
 @GetMapping(value="/api/v1/preview",produces=MediaType.TEXT_HTML_VALUE) String preview(HttpServletRequest r,@AuthenticationPrincipal OidcUser user,@RequestParam(defaultValue="")String locale,@RequestParam(defaultValue="hero")String page){return SiteHtml.render(store.read(scope(r,user)).project(),locale,page,true);}
 @GetMapping(value="/",produces=MediaType.TEXT_HTML_VALUE) ResponseEntity<String> website(HttpServletRequest r,@RequestParam(defaultValue="")String locale,@RequestParam(defaultValue="hero")String page){
  var entry=access.entry(r.getServerName());if(entry.orgId()==null)return ResponseEntity.status(303).location(java.net.URI.create("/workspace/")).build();
  return ResponseEntity.ok(SiteHtml.render(store.published(new OpsAccess.Scope(entry.tenantId(),entry.orgId(),entry.runtimeScopeId(),entry.host())),locale,page,false));
 }
 @GetMapping(value="/p/{*path}",produces=MediaType.TEXT_HTML_VALUE) String detail(HttpServletRequest r,@PathVariable String path,@RequestParam(defaultValue="")String locale){
  var project=store.published(access.resolve(r.getServerName()));
  var page=project.pages().stream().filter(p->p.path().equals(path)).findFirst().orElseThrow(()->new ResponseStatusException(HttpStatus.NOT_FOUND,"页面不存在"));
  return SiteHtml.render(project,locale,page.id(),false);
 }
 @ExceptionHandler(IllegalArgumentException.class) ResponseEntity<?> invalid(IllegalArgumentException error,HttpServletRequest request){return ResponseEntity.badRequest().body(Map.of("message",Objects.toString(error.getMessage(),"输入不正确"),"traceId",Objects.toString(request.getAttribute("traceId"),"")));}
 @ExceptionHandler(ResponseStatusException.class) ResponseEntity<?> unavailable(ResponseStatusException error,HttpServletRequest request){return ResponseEntity.status(error.getStatusCode()).body(Map.of("message",Objects.toString(error.getReason(),"操作未完成"),"traceId",Objects.toString(request.getAttribute("traceId"),"")));}
}
