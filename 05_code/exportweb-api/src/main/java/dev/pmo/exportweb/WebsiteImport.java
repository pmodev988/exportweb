package dev.pmo.exportweb;

import java.io.*;
import java.net.URI;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.*;
import org.jsoup.Jsoup;
import org.jsoup.nodes.*;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

@Service
class WebsiteImport {
 record Result(List<Project.Page> pages,List<String> warnings,String source,String language,String siteId) {
  Result(List<Project.Page> pages,List<String> warnings,String source,String language){this(pages,warnings,source,language,"");}
  Result forSite(String id){return new Result(pages,warnings,source,language,id);}
 }
 private final PublicWebsiteReader reader;private final int maxPages,maxBytes;
 WebsiteImport(PublicWebsiteReader reader,@Value("${exportweb.import.max-pages:60}")int maxPages,@Value("${exportweb.import.max-bytes:2097152}")int maxBytes){
  this.reader=reader;this.maxPages=Math.min(60,Math.max(1,maxPages));this.maxBytes=Math.min(2097152,Math.max(1024,maxBytes));
 }
 Result read(String input,boolean details,String language){return read(input,details,language,(n,count)->{});}
 Result read(String input,boolean details,String language,java.util.function.BiConsumer<Integer,Integer> progress){return read(input,details,language,true,true,progress);}
 Result read(String input,boolean details,String language,boolean images,boolean videos,java.util.function.BiConsumer<Integer,Integer> progress){
  URI url;
  try{url=canonical(URI.create(input.trim()));PublicWebsiteReader.validate(url);}catch(Exception ex){throw new IllegalArgumentException("请输入有效的公开网站 HTTPS 地址");}
  try{
   var root=reader.get(url,maxBytes);var first=parse(root);url=root.url();
   String declared=first.selectFirst("html").attr("lang");
   if(declared.matches("[a-z]{2,3}(?:-[A-Za-z0-9]{2,8})*"))language=declared.equals("zh")||declared.equalsIgnoreCase("zh-CN")?"zh-Hans":declared;
   var warnings=new ArrayList<String>();var discovered=WebsiteNavigation.read(first,url,maxPages,warnings);
   var ids=new LinkedHashMap<String,String>();var usedIds=new HashSet<String>();
   discovered.forEach((key,node)->{String value=node.home()&&!usedIds.contains("hero")?"hero":id(URI.create(node.url().toString()+"#"+node.position()));if(!usedIds.add(value)){value=id(key);usedIds.add(value);}ids.put(key,value);});
   var pages=new ArrayList<Project.Page>();int position=0;
   var owners=new HashSet<URI>();long deadline=System.nanoTime()+java.time.Duration.ofSeconds(90).toNanos();
   for(var entry:discovered.entrySet()){
    progress.accept(position++,discovered.size());if(Thread.currentThread().isInterrupted())throw new IOException("读取已取消");
    var node=entry.getValue();URI address=node.url();String id=ids.get(entry.getKey()),html="",heading=node.title();boolean firstUse=owners.add(address);
    if(details&&firstUse){try{
      if(System.nanoTime()>deadline)throw new IOException("读取超时");
      var doc=address.equals(canonical(url))?first:parse(reader.get(address,maxBytes));heading=title(doc,heading);html=content(doc,images,videos);
      if(html.isBlank())warnings.add(node.title()+"：未找到正文，请在详情中添加");
     }catch(IOException ex){warnings.add(node.title()+"：读取未完成，请重试或手动添加");}}
    var mounts=firstUse?discovered.entrySet().stream().filter(x->x.getValue().url().equals(address)).map(x->ids.get(x.getKey())).toList():List.<String>of();
    pages.add(new Project.Page(id,ids.getOrDefault(node.parent(),""),node.title(),id.equals("hero")?"/":"/"+id+"/",details&&!html.isBlank()?Map.of(language,new Project.Content(heading,html,node.title())):Map.of(),"","",!firstUse,null,"menu",node.position(),false,mounts));
   }
   if(pages.size()==1)warnings.add("未发现可读取的导航链接，可在骨架中手动添加栏目；仅脚本生成的菜单需要网站提供静态 HTML。");
   return new Result(pages,warnings,url.toString(),language);
  }catch(IOException ex){throw new IllegalArgumentException("读取网站失败："+ex.getMessage()+"。现有内容未改变。");}
 }
 static org.jsoup.nodes.Document parse(PublicWebsiteReader.Document doc)throws IOException {return Jsoup.parse(new ByteArrayInputStream(doc.bytes()),null,doc.url().toString());}
 static URI canonical(URI uri){
  try{return new URI(uri.getScheme(),null,uri.getHost(),uri.getPort()==443?-1:uri.getPort(),uri.getPath().isEmpty()?"/":uri.getPath(),uri.getQuery(),null).normalize();}catch(Exception ex){throw new IllegalArgumentException("网站链接无效");}
 }
 static URI target(URI root,Element link){
  try{
   if(link.attr("href").isBlank()||link.attr("href").startsWith("#"))return null;
   var uri=canonical(root.resolve(link.attr("href")));
   if(!"https".equals(uri.getScheme())||!root.getHost().equalsIgnoreCase(uri.getHost())||uri.getPort()!=-1||uri.getPath().matches("(?i).*\\.(pdf|zip|jpg|png|mp4|webm|docx?|xlsx?)$"))return null;
   return uri;
  }catch(Exception ex){return null;}
 }
 static String id(URI uri){return id(uri.toString());}
 static String id(String value){try{return "import-"+HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(value.getBytes(StandardCharsets.UTF_8))).substring(0,16);}catch(Exception ex){throw new IllegalStateException(ex);}}
 static String title(org.jsoup.nodes.Document doc,String fallback){var h=doc.selectFirst("main h1,article h1,h1");String s=h==null?fallback:h.text();if(s.isBlank())s=doc.title();return s.substring(0,Math.min(180,s.length()));}
 static String content(org.jsoup.nodes.Document doc){return content(doc,true,true);}
 static String content(org.jsoup.nodes.Document doc,boolean images,boolean videos){
  var source=doc.selectFirst("main,[role=main],#content,article,.content");
  var body=(source==null?doc.body():source).clone();
  var heading=body.selectFirst("h1");if(heading!=null)heading.remove(); // Kept separately in Content.title.
  body.select("script,style,nav,header,footer,#footer,[role=contentinfo],form,noscript,button,input,select,textarea").remove();
  body.select("img[data-src]").forEach(e->{if(!e.attr("data-src").isBlank())e.attr("src",e.attr("data-src"));});
  for(var e:body.select("[src],[href],[poster]"))for(String attr:List.of("src","href","poster"))if(e.hasAttr(attr)){
   try{URI resolved=URI.create(doc.baseUri()).resolve(e.attr(attr));if(!"https".equalsIgnoreCase(resolved.getScheme()))e.removeAttr(attr);else e.attr(attr,resolved.toASCIIString());}catch(Exception ex){e.removeAttr(attr);}
  }
  // Preserve source references when selected; excluded media never loads in the imported page.
  for(var media:body.select("img,video,iframe")){
   boolean image=media.tagName().equals("img");String src=media.attr("src");if(src.isBlank()&&media.selectFirst("source")!=null)src=media.selectFirst("source").attr("src");
   String filename="媒体文件";try{String path=URI.create(src).getPath();if(path!=null&&!path.isBlank())filename=path.substring(path.lastIndexOf('/')+1);}catch(Exception ignored){}
   String alt=media.attr("alt");if(alt.isBlank())alt=media.attr("title");
   if(image?!images:!videos){var placeholder=new Element("div").addClass("media-placeholder").attr("data-media-kind",image?"image":"video").attr("data-media-name",filename).attr("data-media-alt",alt).attr("data-media-source",src);
    placeholder.appendElement("p").text((image?"图片占位：":"视频占位：")+(alt.isBlank()?"":alt+" · ")+filename);media.replaceWith(placeholder);
   }else if(media.attr("title").isBlank())media.attr("title",filename);
  }
  return ContentHtml.clean(body.html());
 }
}
