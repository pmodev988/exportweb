package dev.pmo.exportweb;
import java.util.*;

public record SiteSettings(String logo,Contacts communications,List<String> publishLanguages,String publicationTarget,Map<String,Presentation> presentations,Structure structure,Map<String,Map<String,String>> labels,List<String> communicationIds) {
 public SiteSettings(String logo,Contacts communications,List<String> publishLanguages,String publicationTarget,Map<String,Presentation> presentations,Structure structure,Map<String,Map<String,String>> labels){this(logo,communications,publishLanguages,publicationTarget,presentations,structure,labels,null);}
 public SiteSettings(String logo,Contacts communications,List<String> publishLanguages,String publicationTarget,Map<String,Presentation> presentations,Structure structure){this(logo,communications,publishLanguages,publicationTarget,presentations,structure,null);}
 public SiteSettings(String logo,Contacts communications,List<String> publishLanguages,String publicationTarget,Map<String,Presentation> presentations){this(logo,communications,publishLanguages,publicationTarget,presentations,null);}
 public record Structure(String template,long revision){}
 public SiteSettings {communicationIds=communicationIds==null?null:List.copyOf(communicationIds);logo=Objects.toString(logo,"");communications=communications==null?new Contacts("","","",""):communications;publicationTarget=Objects.toString(publicationTarget,"platform");presentations=presentations==null?Map.of():Map.copyOf(presentations);publishLanguages=publishLanguages==null?null:List.copyOf(publishLanguages);labels=labels==null?Map.of():labels.entrySet().stream().collect(java.util.stream.Collectors.toUnmodifiableMap(Map.Entry::getKey,e->Map.copyOf(e.getValue())));}
 public String label(String locale,String key,String fallback){return labels.getOrDefault(locale,Map.of()).getOrDefault(key,fallback);}
 public static SiteSettings empty(){return new SiteSettings("",null,null,"platform",null);}
 public record Contacts(String whatsapp,String email,String phone,String link){
  public Contacts {whatsapp=Objects.toString(whatsapp,"").trim();email=Objects.toString(email,"").trim();phone=Objects.toString(phone,"").trim();link=Objects.toString(link,"").trim();}
  void validate(){
   for(String value:List.of(whatsapp,phone))if(!value.isEmpty()&&(!value.matches("\\+?[0-9 ()-]+")||value.replaceAll("\\D","").length()<6||value.replaceAll("\\D","").length()>20))throw new IllegalArgumentException("通讯号码请使用国际区号和数字");
   if(!email.isEmpty()&&(email.length()>254||!email.matches("[^\\s@<>\\r\\n]+@[^\\s@<>]+\\.[^\\s@<>]+")||email.contains("?")||email.contains("#")))throw new IllegalArgumentException("通讯邮箱格式无效");
   if(!link.isEmpty()){try{var u=java.net.URI.create(link);if(link.length()>2000||!"https".equals(u.getScheme())||u.getHost()==null||u.getUserInfo()!=null)throw new IllegalArgumentException();}catch(Exception ex){throw new IllegalArgumentException("通讯链接请输入完整 HTTPS 地址");}}
  }
 }
 public record Presentation(String mode,boolean pagination,int pageSize){}
 public SiteSettings cleaned(List<Project.Page> pages,List<String> languages){
  if(!logo.isEmpty()&&!logo.matches("/api/v1/assets/[a-f0-9-]{36}"))throw new IllegalArgumentException("Logo 文件无效");
  communications.validate();
  if(communicationIds!=null&&(new HashSet<>(communicationIds).size()!=communicationIds.size()||communicationIds.stream().anyMatch(id->id==null||!id.matches("[a-zA-Z0-9-]{1,80}"))))throw new IllegalArgumentException("通讯选择无效");
  if(labels.size()>300)throw new IllegalArgumentException("网站文字语言过多");
  labels.forEach((locale,values)->{if(!languages.contains(locale)||values.size()>4||!Set.of("cta","nav","notice","footer").containsAll(values.keySet())||values.values().stream().anyMatch(v->v.length()>600))throw new IllegalArgumentException("网站按钮与说明无效");});
  if(structure!=null&&(structure.template()==null||!structure.template().matches("[a-z0-9-]{0,80}")||structure.revision()<0))throw new IllegalArgumentException("架构版本无效");
  if(!Set.of("platform","external").contains(publicationTarget))throw new IllegalArgumentException("发布位置无效");
  if(publishLanguages!=null&&(new HashSet<>(publishLanguages).size()!=publishLanguages.size()||!languages.containsAll(publishLanguages)))throw new IllegalArgumentException("发布语言不在网站语言范围内");
  if(presentations.size()>60)throw new IllegalArgumentException("栏目显示设置过多");
  presentations.forEach((id,p)->{if(p==null||!Set.of("list","tabs","carousel").contains(p.mode())||p.pageSize()<1||p.pageSize()>100||pages.stream().noneMatch(n->n.id().equals(id)&&n.isMenu()))throw new IllegalArgumentException("栏目显示设置无效");});
  return this;
 }
 public List<String> selectedLanguages(List<String> enabled){return publishLanguages==null?enabled:publishLanguages;}
}
