package dev.pmo.exportweb;
import java.util.*;

/** Website drafts share the organization revision boundary; each keeps stable page IDs. */
public record Websites(String activeId,List<Site> items) {
 public Websites {activeId=activeId==null?"":activeId;items=items==null?List.of():List.copyOf(items);}
 public static Websites empty(){return new Websites("",List.of());}
 public record Document(String theme,List<String> languages,String sourceLanguage,List<Project.Page> pages,Project.Design design,SiteSettings site){public Document(String theme,List<String> languages,String sourceLanguage,List<Project.Page> pages,Project.Design design){this(theme,languages,sourceLanguage,pages,design,SiteSettings.empty());}}
 public record Site(String id,String name,String domain,String profileMode,Project.Company profile,Document document){}
 public Optional<Site> active(){return items.stream().filter(s->s.id().equals(activeId)).findFirst();}
 public Websites cleaned(Project project){
  if(items.size()>50)throw new IllegalArgumentException("网站最多 50 个");
  if(items.isEmpty()){if(!activeId.isEmpty())throw new IllegalArgumentException("当前网站不存在");return this;}
  var ids=new HashSet<String>();var hosts=new HashSet<String>();var cleaned=new ArrayList<Site>();
  for(var site:items){
   if(site==null||site.id()==null||!site.id().matches("[a-zA-Z0-9-]{1,80}")||!ids.add(site.id()))throw new IllegalArgumentException("网站标识无效或重复");
   if(site.name()==null||site.name().isBlank()||site.name().length()>180)throw new IllegalArgumentException("请填写网站名称");
   if(site.domain()==null||site.domain().length()>253||!site.domain().isEmpty()&&(!site.domain().matches("(?=.{1,253}$)(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\\.)+[a-z]{2,63}")||!hosts.add(site.domain())))throw new IllegalArgumentException("网站域名格式无效或重复");
   if(site.profileMode()==null||!List.of("shared","independent").contains(site.profileMode()))throw new IllegalArgumentException("公司资料来源无效");
   var company=site.profileMode().equals("shared")?project.company():site.profile();
   var doc=site.id().equals(activeId)?new Document(project.theme(),project.languages(),project.sourceLanguage(),project.pages(),project.design(),project.site()):site.document();
   if(doc==null)throw new IllegalArgumentException("网站内容不完整");
   var checked=new Project(company,"",doc.theme(),doc.languages(),doc.sourceLanguage(),doc.pages(),WorkspaceData.empty(),doc.design(),Websites.empty(),doc.site(),SystemSettings.empty()).cleaned();
   cleaned.add(new Site(site.id(),site.name(),site.domain(),site.profileMode(),site.profileMode().equals("shared")?null:checked.company(),new Document(checked.theme(),checked.languages(),checked.sourceLanguage(),checked.pages(),checked.design(),checked.site())));
  }
  if(!ids.contains(activeId))throw new IllegalArgumentException("当前网站不存在");
  return new Websites(activeId,cleaned);
 }
}
