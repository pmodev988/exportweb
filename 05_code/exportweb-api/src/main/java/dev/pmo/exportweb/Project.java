package dev.pmo.exportweb;
import java.util.*;
public record Project(Company company,String plan,String theme,List<String> languages,String sourceLanguage,List<Page> pages,WorkspaceData workspace,Design design,Websites websites,SiteSettings site,SystemSettings system) {
 public Project {workspace=workspace==null?WorkspaceData.empty():workspace;design=design==null?new Design("multi","static"):design;websites=websites==null?Websites.empty():websites;site=site==null?SiteSettings.empty():site;system=system==null?SystemSettings.empty():system;}
 public Project(Company company,String plan,String theme,List<String> languages,String sourceLanguage,List<Page> pages,WorkspaceData workspace,Design design,Websites websites){this(company,plan,theme,languages,sourceLanguage,pages,workspace,design,websites,null,null);}
 public Project(Company company,String plan,String theme,List<String> languages,String sourceLanguage,List<Page> pages,WorkspaceData workspace,Design design){this(company,plan,theme,languages,sourceLanguage,pages,workspace,design,null);}
 public Project(Company company,String plan,String theme,List<String> languages,String sourceLanguage,List<Page> pages,WorkspaceData workspace){this(company,plan,theme,languages,sourceLanguage,pages,workspace,null);}
 public record Design(String pageMode,String motion){}
 public Project(Company company,String plan,String theme,List<String> languages,String sourceLanguage,List<Page> pages){this(company,plan,theme,languages,sourceLanguage,pages,WorkspaceData.empty());}
 public record Company(String name,String product,String strength,String excluded,String description,List<String> markets){}
 public record Content(String title,String html,String menuTitle){public Content(String title,String html){this(title,html,null);}}
 public record EntryInfo(String date,String summary,String image){public EntryInfo {date=Objects.toString(date,"");summary=Objects.toString(summary,"");image=Objects.toString(image,"");}}
 public record Page(String id,String parent,String title,String path,Map<String,Content> content,String menuCode,String ownerPageId,Boolean detailDeleted,EntryInfo entry,String kind,String navPlacement,Boolean footerExpanded,List<String> mountIds,Boolean hidden){
  public Page(String id,String parent,String title,String path,Map<String,Content> content,String menuCode,String ownerPageId,Boolean detailDeleted,EntryInfo entry,String kind,String navPlacement,Boolean footerExpanded,List<String> mountIds){this(id,parent,title,path,content,menuCode,ownerPageId,detailDeleted,entry,kind,navPlacement,footerExpanded,mountIds,false);}
  public Page {hidden=Boolean.TRUE.equals(hidden);menuCode=Objects.toString(menuCode,"");ownerPageId=Objects.toString(ownerPageId,"");detailDeleted=Boolean.TRUE.equals(detailDeleted);entry=entry==null?new EntryInfo("","",""):entry;kind=kind==null?(ownerPageId.isEmpty()?"menu":"detail"):kind;navPlacement=Objects.toString(navPlacement,"header");footerExpanded=Boolean.TRUE.equals(footerExpanded);mountIds=mountIds==null?null:List.copyOf(mountIds);}
  public Page(String id,String parent,String title,String path,Map<String,Content> content,String menuCode,String ownerPageId,Boolean detailDeleted,EntryInfo entry){this(id,parent,title,path,content,menuCode,ownerPageId,detailDeleted,entry,null,null,null,null);}
  public Page(String id,String parent,String title,String path,Map<String,Content> content){this(id,parent,title,path,content,"","",false,null);}
  public Page(String id,String parent,String title,String path,Map<String,Content> content,String menuCode,String ownerPageId,boolean detailDeleted){this(id,parent,title,path,content,menuCode,ownerPageId,detailDeleted,null);}
  public boolean isMenu(){return kind.equals("menu")&&ownerPageId.isEmpty();}
  public List<String> mounts(){return detailDeleted?List.of():mountIds==null?List.of(ownerPageId.isEmpty()?id:ownerPageId):mountIds;}
  public Page withContent(Map<String,Content> value){return new Page(id,parent,title,path,value,menuCode,ownerPageId,detailDeleted,entry,kind,navPlacement,footerExpanded,mountIds,hidden);}
  public Page withCode(String value){return new Page(id,parent,title,path,content,value,ownerPageId,detailDeleted,entry,kind,navPlacement,footerExpanded,mountIds,hidden);}
 }
 public static Project empty(){return new Project(new Company("","","","","",List.of()),"","T02",List.of("zh-Hans"),"zh-Hans",List.of());}
 public Project withPlan(String value){return new Project(company,value,theme,languages,sourceLanguage,pages,workspace,design,websites,site,system);}
 public Project withPages(List<Page> value){return new Project(company,plan,theme,languages,sourceLanguage,value,workspace,design,websites,site,system);}
 public Company websiteCompany(){return websites.active().filter(s->s.profileMode().equals("independent")).map(Websites.Site::profile).orElse(company);}
 public Project websiteOnly(){return new Project(websiteCompany(),"",theme,languages,sourceLanguage,pages.stream().filter(p->!p.hidden()).toList(),WorkspaceData.empty(),design,Websites.empty(),site,new SystemSettings(Map.of(),List.of(),system.selected(site)));}
 public Project cleaned(){
  workspace.cleaned();system.validate();
  if(design.pageMode()==null||design.motion()==null||!Set.of("multi","single").contains(design.pageMode())||!Set.of("static","subtle","expressive").contains(design.motion()))throw new IllegalArgumentException("页面形式或动效无效");
  if(company==null||company.markets()==null||company.markets().size()>250||languages==null||languages.isEmpty()||languages.size()>40||!languages.contains(sourceLanguage)||pages==null||pages.size()>600)throw new IllegalArgumentException("公司、语言或栏目数据不完整");
  if(theme==null||!theme.matches("T(0[1-9]|[12][0-9]|3[0-2])")||new HashSet<>(languages).size()!=languages.size()||languages.stream().anyMatch(l->l==null||!l.matches("[a-z]{2,3}(?:-[A-Za-z0-9]{2,8})*")))throw new IllegalArgumentException("网站风格或语言无效");
  for(var value:new String[]{company.name(),company.product(),company.strength(),company.excluded(),company.description(),plan})if(value==null||value.length()>100000)throw new IllegalArgumentException("内容为空或过长");
  if(company.markets().stream().anyMatch(m->m==null||!m.matches("[A-Z]{2}")))throw new IllegalArgumentException("目标市场无效");
  var ids=new HashSet<String>();var paths=new HashSet<String>();
  for(var page:pages)if(page==null||page.id()==null||page.path()==null||page.parent()==null||page.title()==null||page.content()==null||!ids.add(page.id())||!paths.add(page.path())||!page.id().matches("[a-zA-Z0-9-]{1,80}")||!page.path().matches("/(?:[a-z0-9-]+/)*")||page.title().isBlank()||page.title().length()>180)throw new IllegalArgumentException("栏目名称、标识或路径无效");
  for(var page:pages){
   var entry=page.entry();if(entry.summary().length()>2000||entry.image().length()>2000||!entry.image().isEmpty()&&!entry.image().matches("(?:https://[^\\s<>\"]+|/api/v1/assets/[a-f0-9-]{36})"))throw new IllegalArgumentException("列表摘要或封面图片无效");
   if(!entry.date().isEmpty())try{java.time.LocalDate.parse(entry.date());}catch(Exception ex){throw new IllegalArgumentException("列表日期无效");}
   if(!Set.of("menu","detail").contains(page.kind())||!Set.of("header","footer").contains(page.navPlacement()))throw new IllegalArgumentException("菜单类型或显示位置无效");
   if(!page.isMenu()&&!page.parent().isEmpty())throw new IllegalArgumentException("详情不能作为菜单层级");
   if(!page.ownerPageId().isEmpty()&&pages.stream().noneMatch(p->p.id().equals(page.ownerPageId())&&p.isMenu()))throw new IllegalArgumentException("详情所属栏目不存在");
   if(new HashSet<>(page.mounts()).size()!=page.mounts().size()||page.mounts().stream().anyMatch(id->pages.stream().noneMatch(p->p.id().equals(id)&&p.isMenu())))throw new IllegalArgumentException("详情挂载菜单不存在或重复");
   var current=page;var visited=new HashSet<String>();
   while(!current.parent().isEmpty()){
    if(!visited.add(current.id())||visited.size()>8)throw new IllegalArgumentException("栏目层级循环或过深");
    String parent=current.parent();current=pages.stream().filter(p->p.id().equals(parent)&&p.isMenu()).findFirst().orElseThrow(()->new IllegalArgumentException("上级栏目不存在"));
   }
  }
  var clean=withPages(pages.stream().map(p->{
   var contents=new LinkedHashMap<String,Content>();
   p.content().forEach((locale,c)->{if(locale==null||!locale.matches("[a-z]{2,3}(?:-[A-Za-z0-9]{2,8})*")||c==null||c.title()==null||c.title().length()>180||c.html()==null||c.html().length()>2500000||c.menuTitle()!=null&&c.menuTitle().length()>180)throw new IllegalArgumentException("详情内容无效");contents.put(locale,new Content(c.title(),ContentHtml.clean(c.html()),c.menuTitle()==null?p.title():c.menuTitle()));});
   return p.withContent(contents);
  }).toList());
  site.cleaned(clean.pages(),languages);
  var numbered=numbered(clean.pages());
  clean=new Project(company,plan,theme,languages,sourceLanguage,numbered,workspace,design,websites,site,system);
  return new Project(company,plan,theme,languages,sourceLanguage,numbered,workspace,design,websites.cleaned(clean),site,system);
 }
 private static List<Page> numbered(List<Page> pages){var codes=new HashMap<String,String>();number(pages,"","M","header",codes);number(pages,"","F","footer",codes);return pages.stream().map(p->p.withCode(codes.getOrDefault(p.id(),""))).toList();}
 private static void number(List<Page> pages,String parent,String prefix,String placement,Map<String,String> codes){int i=0;for(var p:pages)if(p.isMenu()&&p.parent().equals(parent)&&(!parent.isEmpty()||p.navPlacement().equals(placement))){String code=prefix+String.format("%03d",++i);codes.put(p.id(),code);number(pages,p.id(),code,placement,codes);}}
 public List<String> readyLanguages(){return pages.isEmpty()?List.of():languages.stream().filter(l->pages.stream().filter(p->!p.hidden()&&!p.detailDeleted()&&p.content().containsKey(sourceLanguage)&&!p.content().get(sourceLanguage).html().isBlank()).allMatch(p->p.content().containsKey(l)&&!p.content().get(l).title().isBlank()&&!p.content().get(l).html().isBlank())).toList();}
}
