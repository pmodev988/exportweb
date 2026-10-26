package dev.pmo.exportweb;
import java.util.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;
import tools.jackson.databind.ObjectMapper;
@Service
class ProjectStore {
 record Snapshot(long revision,Project project,Long publishedRevision,String publicUrl){}
 private final ProjectMapper db;private final ObjectMapper json;private final MediaObjects media;
 ProjectStore(ProjectMapper db,ObjectMapper json,MediaObjects media){this.db=db;this.json=json;this.media=media;}
 private void scope(OpsAccess.Scope scope){db.scope(scope.tenantId(),scope.orgId());}
 private Project document(Map<String,Object> row){return json.readValue((String)row.get("document"),Project.class);}
 @Transactional Snapshot read(OpsAccess.Scope scope){
  scope(scope);db.create(scope.tenantId(),scope.orgId(),json.writeValueAsString(Project.empty()));
  var row=db.read(scope.tenantId(),scope.orgId());var project=document(row);String host=project.websites().active().map(Websites.Site::domain).filter(h->!h.isEmpty()).orElse(scope.host());var published=db.published(scope.tenantId(),scope.orgId(),host);
  return new Snapshot(((Number)row.get("revision")).longValue(),document(row),published==null?null:((Number)published.get("revision")).longValue(),published==null?null:"https://"+published.get("host")+"/");
 }
 @Transactional Snapshot save(OpsAccess.Scope scope,long expected,Project value){
  return save(scope,expected,value,true);
 }
 private Snapshot save(OpsAccess.Scope scope,long expected,Project value,boolean invalidate){
  scope(scope);Project clean=value.cleaned();
  if(invalidate){var previous=db.read(scope.tenantId(),scope.orgId());if(previous!=null){var old=document(previous);
   if(old.websites().activeId().equals(clean.websites().activeId())&&old.sourceLanguage().equals(clean.sourceLanguage())){
    String source=clean.sourceLanguage();clean=clean.withPages(clean.pages().stream().map(p->{var before=old.pages().stream().filter(n->n.id().equals(p.id())).findFirst();
     if(before.isEmpty()||Objects.equals(before.get().content().get(source),p.content().get(source))&&before.get().title().equals(p.title()))return p;
     var translated=new LinkedHashMap<>(p.content());translated.entrySet().removeIf(e->!e.getKey().equals(source)&&Objects.equals(e.getValue(),before.get().content().get(e.getKey())));return p.withContent(translated);
    }).toList()).cleaned();
   }
  }}
  String encoded=json.writeValueAsString(clean);
  if(db.save(scope.tenantId(),scope.orgId(),expected,encoded)!=1)throw new ResponseStatusException(HttpStatus.CONFLICT,"资料已在其他页面更新");
  db.version(scope.tenantId(),scope.orgId(),expected+1,encoded);
  return read(scope);
 }
 @Transactional String publish(OpsAccess.Scope scope,long expected){
  scope(scope);Long revision=db.lock(scope.tenantId(),scope.orgId());
  if(revision==null||revision!=expected)throw new ResponseStatusException(HttpStatus.CONFLICT,"请先保存当前版本");
  var row=db.read(scope.tenantId(),scope.orgId());Project project=document(row).cleaned();
  if(project.websites().active().isPresent()&&!project.websites().active().get().domain().equals(scope.host()))throw new IllegalArgumentException("请先为当前网站设置已指派的域名");
  project=project.websiteOnly();
  project=publicationProject(project);
  db.publish(scope.tenantId(),scope.orgId(),revision,json.writeValueAsString(project),scope.host());
  return "https://"+scope.host()+"/";
 }
 @Transactional(readOnly=true) Project published(OpsAccess.Scope scope){
  scope(scope);var row=db.published(scope.tenantId(),scope.orgId(),scope.host());
  if(row==null)throw new ResponseStatusException(HttpStatus.NOT_FOUND,"网站尚未发布");return document(row);
 }
 @Transactional String asset(OpsAccess.Scope scope,byte[] bytes,String type){
  return asset(scope,bytes,type,"");
 }
 @Transactional String asset(OpsAccess.Scope scope,byte[] bytes,String type,String filename){
  scope(scope);String actual=mediaType(bytes);if(!actual.equals(type))throw new IllegalArgumentException("文件内容与媒体类型不一致");
  if(bytes.length>20971520)throw new IllegalArgumentException("文件超过 20 MB");
  String name=Objects.toString(filename,"").replace('\\','/');name=name.substring(name.lastIndexOf('/')+1).strip();if(name.length()>255||name.chars().anyMatch(c->c<32))throw new IllegalArgumentException("文件名称无效");
  db.lock(scope.tenantId(),scope.orgId());var project=read(scope).project();String site=project.websites().activeId();
  var old=name.isEmpty()?null:db.namedAsset(scope.tenantId(),scope.orgId(),site,name);
  UUID id=old==null?UUID.randomUUID():UUID.fromString(old.get("id").toString());String key=old==null?"exportweb/"+scope.tenantId()+"/"+scope.orgId()+"/"+id:(String)old.get("object_key");
  if(old==null){media.put(key,actual,bytes);db.asset(scope.tenantId(),scope.orgId(),id,actual,key,bytes.length);}else media.replace(key,actual,bytes);
  if(!name.isEmpty())db.nameAsset(scope.tenantId(),scope.orgId(),id,site,name,actual,bytes.length);return "/api/v1/assets/"+id;
 }
 static Project publicationProject(Project p){
  var allowed=ThemeCatalog.marketLanguages(p.websiteCompany().markets());
  var selected=p.site().publishLanguages()==null?p.languages().stream().filter(allowed::contains).toList():p.site().publishLanguages();
  if(selected.isEmpty())throw new IllegalArgumentException("请选择至少一种发布语言");
  if(p.pages().isEmpty())throw new IllegalArgumentException("请先建立网站架构");
  if(!p.readyLanguages().containsAll(selected))throw new IllegalArgumentException("所选语言有未完成正文，请先翻译或补充内容");
  if(!allowed.containsAll(selected))throw new IllegalArgumentException("发布语言不在当前目标市场范围内");
  var pages=p.pages().stream().map(page->{var contents=new LinkedHashMap<String,Project.Content>();for(String locale:selected)if(page.content().containsKey(locale))contents.put(locale,page.content().get(locale));return page.withContent(contents);}).toList();
  return new Project(p.websiteCompany(),"",p.theme(),selected,selected.contains(p.sourceLanguage())?p.sourceLanguage():selected.getFirst(),pages,WorkspaceData.empty(),p.design(),Websites.empty(),p.site(),new SystemSettings(Map.of(),List.of(),p.system().selected(p.site())));
 }
 private Project checkedCurrent(OpsAccess.Scope scope,long expected){scope(scope);Long revision=db.lock(scope.tenantId(),scope.orgId());if(revision==null||revision!=expected)throw new ResponseStatusException(HttpStatus.CONFLICT,"请先保存当前版本");return document(db.read(scope.tenantId(),scope.orgId())).cleaned();}
 private String siteId(Project p){return p.websites().activeId().isEmpty()?"primary":p.websites().activeId();}
 @Transactional long saveWebsiteVersion(OpsAccess.Scope scope,long expected,String note){var p=checkedCurrent(scope,expected);String id=siteId(p);long number=db.nextWebsiteVersion(scope.tenantId(),scope.orgId(),id);db.websiteVersion(scope.tenantId(),scope.orgId(),id,number,expected,json.writeValueAsString(p),Objects.toString(note,"保存网站页面与配置").substring(0,Math.min(500,Objects.toString(note,"保存网站页面与配置").length())));return number;}
 @Transactional List<Map<String,Object>> websiteVersions(OpsAccess.Scope scope,int offset){if(offset<0)throw new IllegalArgumentException("分页无效");var p=read(scope).project();return db.websiteVersions(scope.tenantId(),scope.orgId(),siteId(p),offset);}
 @Transactional Map<String,Object> websiteVersion(OpsAccess.Scope scope,long number){var p=read(scope).project();var row=db.websiteVersionRead(scope.tenantId(),scope.orgId(),siteId(p),number);if(row==null)throw new ResponseStatusException(HttpStatus.NOT_FOUND,"版本不存在");var result=new LinkedHashMap<>(row);result.put("document",document(row).websiteOnly());return result;}
 @Transactional Snapshot restoreWebsiteVersion(OpsAccess.Scope scope,long expected,long number){
  var current=checkedCurrent(scope,expected);var row=db.websiteVersionRead(scope.tenantId(),scope.orgId(),siteId(current),number);if(row==null)throw new ResponseStatusException(HttpStatus.NOT_FOUND,"版本不存在");
  var old=document(row);saveWebsiteVersion(scope,expected,"恢复前自动保存");
  var restored=new Project(current.company(),current.plan(),old.theme(),old.languages(),old.sourceLanguage(),old.pages(),current.workspace(),old.design(),current.websites(),old.site(),current.system());
  var saved=save(scope,expected,restored,false);saveWebsiteVersion(scope,saved.revision(),"从 W"+String.format("%04d",number)+" 恢复为草稿");return saved;
 }
 @Transactional(readOnly=true) Map<String,Object> asset(OpsAccess.Scope scope,UUID id,boolean visitor){
  scope(scope);
  if(visitor&&!json.writeValueAsString(published(scope)).contains("/api/v1/assets/"+id))throw new ResponseStatusException(HttpStatus.NOT_FOUND);
  var row=db.assetRead(scope.tenantId(),scope.orgId(),id);if(row==null)throw new ResponseStatusException(HttpStatus.NOT_FOUND);
  row.put("content",media.get((String)row.get("object_key")));return row;
 }
 static String mediaType(byte[] b){
  if(b.length<12)throw new IllegalArgumentException("文件格式无效");
  if((b[0]&255)==137&&b[1]==80&&b[2]==78&&b[3]==71)return "image/png";
  if((b[0]&255)==255&&(b[1]&255)==216&&(b[2]&255)==255)return "image/jpeg";
  String first=new String(b,0,12,java.nio.charset.StandardCharsets.ISO_8859_1);
  if(first.startsWith("GIF87a")||first.startsWith("GIF89a"))return "image/gif";
  if(first.startsWith("RIFF")&&first.endsWith("WEBP"))return "image/webp";
  if(first.substring(4,8).equals("ftyp"))return "video/mp4";
  if((b[0]&255)==0x1a&&(b[1]&255)==0x45&&(b[2]&255)==0xdf&&(b[3]&255)==0xa3)return "video/webm";
  throw new IllegalArgumentException("请选择 PNG、JPEG、GIF、WebP、MP4 或 WebM 文件");
 }
}
