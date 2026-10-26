package dev.pmo.exportweb;
import java.util.*;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
final class SiteHtml {
 private static String e(String value){return ContentHtml.text(value);}
 private static List<Project.Page> trail(Project project,Project.Page page){var result=new ArrayList<Project.Page>();var seen=new HashSet<String>();while(page!=null&&seen.add(page.id())){result.addFirst(page);String parent=page.ownerPageId().isEmpty()?page.parent():page.ownerPageId();page=project.pages().stream().filter(p->p.id().equals(parent)).findFirst().orElse(null);}return result;}
 private static String breadcrumb(Project project,Project.Page page,String lang,boolean preview){return trail(project,page).stream().map(p->{var c=p.content().get(lang);String title=c==null||c.menuTitle()==null?p.title():c.menuTitle();return "<a href=\""+(preview?"/api/v1/preview?":p.path().equals("/")?"/?":"/p"+e(p.path())+"?")+"locale="+e(lang)+"&amp;page="+e(p.id())+"\">"+e(title)+"</a>";}).collect(java.util.stream.Collectors.joining("<span aria-hidden=\"true\"> / </span>"));}
 static String render(Project project,String locale,String pageId,boolean preview){
  var allowed=ThemeCatalog.marketLanguages(project.websiteCompany().markets());
  var enabled=project.site().selectedLanguages(project.languages()).stream().filter(allowed::contains).toList();
  if(!enabled.contains(locale))locale=enabled.isEmpty()?project.sourceLanguage():enabled.getFirst();
  final String lang=locale;
  var page=project.pages().stream().filter(p->p.id().equals(pageId)).findFirst().orElse(project.pages().isEmpty()?null:project.pages().getFirst());
  if(page!=null&&!preview&&page.hidden())throw new org.springframework.web.server.ResponseStatusException(org.springframework.http.HttpStatus.NOT_FOUND,"页面不存在");
  if(page==null)throw new IllegalArgumentException("没有可显示的页面");
  var content=page.content().getOrDefault(lang,new Project.Content(page.title(),""));
  String hrefPrefix=preview?"/api/v1/preview?":"?";
  String languages="<label class=\"site-language-control\"><span class=\"sr-only\">语言</span><select data-site-language aria-label=\"语言\">"+enabled.stream().map(l->"<option "+(l.equals(lang)?"selected ":"")+"value=\""+(preview?hrefPrefix:"/".equals(page.path())?"/?":"/p"+e(page.path())+"?")+"locale="+e(l)+"&amp;page="+e(page.id())+"\">"+e(new Locale.Builder().setLanguageTag(l).build().getDisplayName(Locale.forLanguageTag(l)))+"</option>").reduce("",String::concat)+"</select></label>";
  boolean single=project.design().pageMode().equals("single");
  String body=(single&&page.isMenu()?project.pages().stream().filter(Project.Page::isMenu).toList():List.of(page)).stream().map(p->section(project,p,lang,preview)).reduce("",String::concat);
  String logo=project.site().logo();if(!preview)logo=logo.replace("/api/v1/assets/","/media/");
  String communication=contacts(project.system().selected(project.site()));
  return "<!doctype html><html lang=\""+e(lang)+"\" dir=\""+(lang.matches("^(ar|he|fa|ur)(-.*)?$")?"rtl":"ltr")+"\"><head><meta charset=\"utf-8\"><meta name=\"viewport\" content=\"width=device-width,initial-scale=1\"><title>"+e(content.title())+" · "+e(project.websiteCompany().name())+"</title>"+SiteMetadata.head(project,content,lang)+"<link rel=\"stylesheet\" href=\"/workspace/site-theme.css\"><style>"+CSS+"</style></head><body><article data-page-mode=\""+project.design().pageMode()+"\" class=\""+e(ThemeCatalog.classes(project.theme()))+(communication.isEmpty()?"":" has-site-contacts")+"\">"+communication+"<header class=\"mock-nav\">"+languages+"<div class=\"site-brand\">"+(logo.isEmpty()?"":"<img class=\"site-logo\" alt=\"Logo\" src=\""+e(logo)+"\">")+"<b>"+e(project.websiteCompany().name())+"</b></div><button class=\"site-mobile-toggle\" type=\"button\" data-site-mobile-toggle aria-expanded=\"false\" aria-label=\"打开或关闭网站菜单\"><svg viewBox=\"0 0 24 24\" aria-hidden=\"true\"><path d=\"M4 6h16M4 12h16M4 18h16\"/></svg></button><nav aria-label=\""+e(project.site().label(lang,"nav","网站栏目"))+"\">"+menu(project,"",page.id(),lang,hrefPrefix,"header",false)+"</nav></header>"+(project.site().label(lang,"notice","").isEmpty()?"":"<p class=\"mock-notice\">"+e(project.site().label(lang,"notice",""))+"</p>")+"<main class=\"site-modules\">"+body+(preview?"":"<p class='site-inquiry-entry'><a href='/inquiry'>Contact / 询盘 / お問い合わせ</a></p>")+"</main><footer class=\"mock-footer\">"+"<nav class=\"site-footer-nav\" aria-label=\"页脚菜单\">"+menu(project,"",page.id(),lang,hrefPrefix,"footer",false)+"</nav>"+e(project.site().label(lang,"footer",project.websiteCompany().name()))+"</footer></article><script src=\"/workspace/site-view.js\" defer></script></body></html>";

 }
 private static String section(Project project,Project.Page page,String lang,boolean preview){
  var content=page.content().getOrDefault(lang,new Project.Content(page.title(),""));
  String html=ContentHtml.clean(content.html());if(!preview)html=html.replace("/api/v1/assets/","/media/");
  boolean home=page.path().equals("/");
  var contact=project.pages().stream().filter(p->p.id().equals("contact")).findFirst();
  String action=contact.map(p->"<a class=\"mock-cta\" href=\""+(preview?"/api/v1/preview?":"/p"+e(p.path())+"?")+"locale="+e(lang)+"&amp;page="+e(p.id())+"\">"+e(project.site().label(lang,"cta",ThemeCatalog.cta(project.theme(),lang)))+"</a>").orElse("");
  String layout=html.matches("(?is).*<(img|video|iframe)\\b.*")?" detail-layout-media":html.matches("(?is).*<table\\b.*")?" detail-layout-data":" detail-layout-reading";
  return "<section id=\"page-"+e(page.id())+"\" class=\"site-page "+(home?"site-lead":"mock-section site-detail"+layout)+"\">"+(home?ThemeCatalog.hero(project.theme(),project.design().motion(),content.title(),project.websiteCompany().name(),"<div class=\"ck-content rich-content\">"+html+"</div>",action):"<div class=\"site-page-breadcrumb\">"+breadcrumb(project,page,lang,preview)+"</div><div class=\"module-heading\"><h1>"+e(content.title())+"</h1></div><div class=\"module-copy ck-content rich-content smart-detail-content\">"+html+"</div>")+(page.isMenu()?collection(project,page,lang,preview):"")+"</section>";

 }
 private static String collection(Project project,Project.Page page,String lang,boolean preview){
  var config=project.site().presentations().getOrDefault(page.id(),new SiteSettings.Presentation("list",false,10));
  var entries=project.pages().stream().filter(p->!p.id().equals(page.id())&&!p.hidden()&&p.mounts().contains(page.id())&&!p.detailDeleted()&&p.content().containsKey(lang)&&!p.content().get(lang).html().isBlank()).toList();
  StringBuilder html=new StringBuilder("<div class=\"sw-collection\" data-sw-collection data-mode=\"").append(config.mode()).append("\" data-size=\"").append(config.pagination()?config.pageSize():Math.max(1,entries.size())).append("\"><div class=\"sw-collection-controls\" data-sw-tabs></div><div class=\"sw-items\">");int i=0;
  for(var entry:entries){String title=entry.content().get(lang).title(),image=entry.entry().image(),href=(preview?"/api/v1/preview?":"/p"+entry.path()+"?")+"locale="+lang+"&page="+entry.id();if(!preview)image=image.replace("/api/v1/assets/","/media/");
   html.append("<article class=\"sw-collection-item\" data-sw-item=\"").append(i++).append("\">");if(!image.isEmpty()&&!config.mode().equals("list"))html.append("<img src=\"").append(e(image)).append("\" alt=\"").append(e(title)).append("\" loading=\"lazy\">");
   html.append("<div>").append(config.mode().equals("list")?"<time>"+e(entry.entry().date())+"</time>":"").append("<h3 data-sw-entry-title>").append(e(title)).append("</h3>").append(config.mode().equals("list")?"":"<p>"+e(entry.entry().summary())+"</p>").append("<a href=\"").append(e(href)).append("\">查看详情</a></div></article>");
  }
  if(entries.isEmpty())html.append("<p class=\"empty\">暂无内容。</p>");return html.append("</div><div class=\"sw-collection-controls\" data-sw-pager></div></div>").toString();
 }
 private static String menu(Project p,String parent,String current,String lang,String prefix,String placement,boolean expanded){
  StringBuilder b=new StringBuilder("<ul class=\"site-menu-list"+(parent.isEmpty()?" site-menu-root":"")+"\">");
  for(var n:p.pages())if(n.isMenu()&&n.parent().equals(parent)&&(!parent.isEmpty()||n.navPlacement().equals(placement))){
   var text=n.content().get(lang);String title=text==null||text.menuTitle()==null?n.title():text.menuTitle();
   String target=prefix.equals("?")?("/".equals(n.path())?"/?":"/p"+e(n.path())+"?"):prefix;
   boolean onDetail=p.pages().stream().anyMatch(x->x.id().equals(current)&&!x.isMenu());
   String href=p.design().pageMode().equals("single")&&!onDetail?"#page-"+e(n.id()):target+"locale="+e(lang)+"&amp;page="+e(n.id());
   b.append("<li class=\"site-nav-item\" data-current-branch=\"").append(p.pages().stream().filter(x->x.id().equals(current)).anyMatch(x->trail(p,x).stream().anyMatch(a->a.id().equals(n.id())))).append("\"><div class=\"site-nav-label\"><a class=\"").append(parent.isEmpty()?"site-nav-direct":"site-menu-link").append("\" ").append(n.id().equals(current)?"aria-current=\"page\" ":"").append("href=\"").append(href).append("\">").append(e(title)).append("</a>");
   boolean currentBranch=p.pages().stream().filter(x->x.id().equals(current)).anyMatch(x->trail(p,x).stream().anyMatch(a->a.id().equals(n.id())));
   boolean open=currentBranch||placement.equals("footer")&&(expanded||n.footerExpanded());
   boolean children=p.pages().stream().anyMatch(x->x.parent().equals(n.id()));
   if(children)b.append("<button type=\"button\" data-site-toggle aria-expanded=\"").append(open).append("\" aria-label=\"展开 ").append(e(title)).append("\"><svg viewBox=\"0 0 24 24\" aria-hidden=\"true\"><path d=\"m6 9 6 6 6-6\"/></svg></button>");
   b.append("</div>");if(children)b.append("<div class=\"site-dropdown\"").append(open?"":" hidden").append(">").append(menu(p,n.id(),current,lang,prefix,placement,open)).append("</div>");b.append("</li>");
  }
  return b.append("</ul>").toString();
 }
 static String contacts(SiteSettings.Contacts c){return contacts(new SystemSettings(Map.of(),List.of()).selected(new SiteSettings("",c,null,"platform",Map.of())));}
 static String contacts(List<SystemSettings.Contact> contacts){
  if(contacts.isEmpty())return "";var html=new StringBuilder("<nav class=\"site-contact-widget\" aria-label=\"联系\">");
  for(var contact:contacts){String url=contact.href(),path=switch(contact.type()){
   case "email"->"M3 5h18v14H3ZM3 6l9 7 9-7";case "phone"->"M6 3h4l1 5-3 2a14 14 0 0 0 6 6l2-3 5 1v4a3 3 0 0 1-3 3C9 20 4 15 3 6a3 3 0 0 1 3-3Z";case "whatsapp"->"M20 11.5a8 8 0 0 1-12 7L3 20l1.5-5A8 8 0 1 1 20 11.5ZM8 7c0 5 4 8 7 8l1-2-3-1-1 1-2-2 1-1-1-3Z";default->"M10 13a5 5 0 0 0 7 0l3-3a5 5 0 0 0-7-7l-2 2M14 11a5 5 0 0 0-7 0l-3 3a5 5 0 0 0 7 7l2-2";};
   html.append("<a class=\"site-contact site-contact-").append(e(contact.type())).append("\" title=\"").append(e(contact.label())).append("\" aria-label=\"").append(e(contact.label())).append("\" href=\"").append(e(url)).append("\" ").append(url.startsWith("https:")?"target=\"_blank\" rel=\"noopener noreferrer\"":"").append("><svg viewBox=\"0 0 24 24\" aria-hidden=\"true\"><path d=\"").append(path).append("\"/></svg></a>");
  }return html.append("</nav>").toString();
 }
 static final String CSS="""
 body{margin:0;font:16px/1.65 system-ui,sans-serif;color:#193d43;background:#f3f6f5}.designed-site{max-width:1440px;margin:auto}.sr-only{position:absolute;width:1px;height:1px;overflow:hidden;clip-path:inset(50%)}.ck-content img,.ck-content video,.ck-content iframe{max-width:100%}.ck-content iframe{width:100%;aspect-ratio:16/9;border:0}.ck-content table{border-collapse:collapse}.ck-content td,.ck-content th{border:1px solid #b4c8c5;padding:10px}.ck-content .image-style-side{float:right;max-width:50%;margin-left:20px}.ck-content .rich-columns{display:grid;grid-template-columns:repeat(2,1fr);gap:20px}@media(max-width:640px){.ck-content .rich-columns{display:block}}
 """;
}
