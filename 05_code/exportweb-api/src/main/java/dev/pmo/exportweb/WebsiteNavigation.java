package dev.pmo.exportweb;

import java.net.URI;
import java.util.*;
import org.jsoup.nodes.*;

/** Menu identity is its location in the navigation, not the document it opens. */
final class WebsiteNavigation {
 static final String FOOTER="footer,#footer,[role=contentinfo]";
 static final String NAV="nav,[role=navigation],header .menu,header .navigation,#menu,#navigation,"+FOOTER;
 record Menu(URI url,String title,String position,String parent,boolean home){}

 static LinkedHashMap<String,Menu> read(Document document,URI source,int limit,List<String> warnings){
  completeEmptyMenus(document,source,warnings);
  var menus=new LinkedHashMap<String,Menu>();var keys=new IdentityHashMap<Element,String>();
  var navigation=document.select(NAV);if(navigation.isEmpty())navigation=document.select("header");
  for(var nav:navigation)for(var link:nav.select("a[href]")){
   if(keys.containsKey(link))continue;
   URI target=WebsiteImport.target(source,link);String name=label(link);if(target==null||name.isBlank())continue;
   String position=link.closest(FOOTER)!=null?"footer":"header",parent="";
   Element li=link.closest("li"),ancestor=li==null||li.parent()==null?null:li.parent().closest("li");
   while(ancestor!=null){var a=ancestor.selectFirst("a[href]");if(keys.containsKey(a)){parent=keys.get(a);break;}ancestor=ancestor.parent()==null?null:ancestor.parent().closest("li");}
   if(parent.isEmpty()&&li!=null&&li.parent()!=null){var heading=li.parent().previousElementSibling();var a=heading==null?null:heading.selectFirst("a[href]");if(keys.containsKey(a))parent=keys.get(a);}
   boolean home=homeAddress(target).equals(homeAddress(source));if(home)target=WebsiteImport.canonical(source);
   String key=position+"|"+parent+"|"+target+"|"+name;keys.put(link,key);
   menus.putIfAbsent(key,new Menu(target,name,position,parent,home&&position.equals("header")&&parent.isEmpty()));
   if(menus.size()>limit)throw new IllegalArgumentException("网站栏目超过 "+limit+" 个，请选择一个业务子站后读取");
  }
  if(menus.values().stream().noneMatch(Menu::home)){
   var withHome=new LinkedHashMap<String,Menu>();withHome.put("home",new Menu(WebsiteImport.canonical(source),"首页","header","",true));withHome.putAll(menus);menus=withHome;
  }
  if(menus.size()>limit)throw new IllegalArgumentException("网站栏目超过 "+limit+" 个，请选择一个业务子站后读取");
  return menus;
 }

 static String label(Element link){
  var copy=link.clone();copy.select("[aria-hidden=true],svg,.pro_icon,.menu-icon,.dropdown-icon").remove();
  String name=copy.text().trim();if(name.isBlank())name=link.attr("aria-label").trim();return name.substring(0,Math.min(180,name.length()));
 }
 static URI homeAddress(URI address){
  var uri=WebsiteImport.canonical(address);String path=uri.getPath().replaceFirst("(?i)/index\\.html?$","/");
  try{return new URI(uri.getScheme(),null,uri.getHost(),uri.getPort(),path,uri.getQuery(),null);}catch(Exception e){return uri;}
 }

 // Some sites leave a script-populated dropdown empty but include the same menu
 // as a static footer/sidebar navigation. Reuse only an unambiguous matching group.
 static void completeEmptyMenus(Document document,URI source,List<String> warnings){
  for(var nav:document.select(NAV))for(var empty:nav.select("ul,ol")){
   if(!empty.select("a[href]").isEmpty()||empty.hasAttr("data-import-checked"))continue;
   empty.attr("data-import-checked","true");Element li=empty.closest("li"),owner=li==null?null:li.selectFirst("a[href]");
   if(owner==null)continue;URI target=WebsiteImport.target(source,owner);String name=label(owner);if(target==null||name.isBlank())continue;
   var matches=new LinkedHashMap<String,Element>();
   for(var other:document.select(NAV).select("a[href]")){
    if(other==owner||!target.equals(WebsiteImport.target(source,other))||!name.equals(label(other)))continue;
    Element boundary=other.closest(NAV);
    for(Element heading=other;heading!=null&&heading!=boundary;heading=heading.parent()){
     Element list=heading.nextElementSibling();
     if(list==null||!Set.of("ul","ol").contains(list.tagName())||list.select("a[href]").isEmpty())continue;
     String signature=list.select("a[href]").stream().map(a->WebsiteImport.target(source,a)+"|"+label(a)).reduce("",(a,b)->a+"\n"+b);
     matches.putIfAbsent(signature,list);break;
    }
   }
   if(matches.size()==1){for(var child:matches.values().iterator().next().children())empty.appendChild(child.clone());}
   else warnings.add(name+"：子菜单由脚本加载，未找到唯一的静态导航，未能完整读取；请核对原网站。");
  }
 }
}
