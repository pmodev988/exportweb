package dev.pmo.exportweb;

import java.io.*;
import java.net.URI;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.*;
import java.util.concurrent.atomic.AtomicBoolean;
import java.util.zip.*;
import org.jsoup.Jsoup;
import org.jsoup.nodes.Document;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;
import tools.jackson.databind.ObjectMapper;

@Service
class WebsitePackage {
 private final ProjectStore store;private final ObjectMapper json;private final PublicWebsiteReader reader;
 private final int maxAsset,maxTotal,maxSeconds;private final AtomicBoolean exporting=new AtomicBoolean();
 @Autowired WebsitePackage(ProjectStore store,ObjectMapper json,PublicWebsiteReader reader,
  @Value("${exportweb.export.max-asset-bytes:20971520}")int maxAsset,
  @Value("${exportweb.export.max-total-bytes:104857600}")int maxTotal,
  @Value("${exportweb.export.max-seconds:90}")int maxSeconds){
  this.store=store;this.json=json;this.reader=reader;
  this.maxAsset=Math.clamp(maxAsset,1024,20971520);this.maxTotal=Math.clamp(maxTotal,1024,104857600);this.maxSeconds=Math.clamp(maxSeconds,1,90);
 }
 WebsitePackage(ProjectStore store,ObjectMapper json){this(store,json,new PublicWebsiteReader(),20971520,104857600,90);}
 byte[] create(OpsAccess.Scope scope,long revision)throws IOException{
  // Bound memory; no database transaction is held while fetching media.
  if(!exporting.compareAndSet(false,true))throw new ResponseStatusException(HttpStatus.TOO_MANY_REQUESTS,"已有网站正在打包，请稍后重试");
  try{return assemble(scope,revision);}finally{exporting.set(false);}
 }
 private byte[] assemble(OpsAccess.Scope scope,long revision)throws IOException{
  var current=store.read(scope);if(current.revision()!=revision)throw new ResponseStatusException(HttpStatus.CONFLICT,"请先保存当前版本");
  var p=ProjectStore.publicationProject(current.project().websiteOnly());
  var bundle=new Bundle();var assets=new HashMap<String,String>();var documents=new LinkedHashMap<String,Document>();
  // Find missing media before downloads, not after returning an incomplete archive.
  for(String locale:p.languages())for(var page:p.pages()){
   bundle.check();var doc=Jsoup.parse(SiteHtml.render(p,locale,page.id(),true));String label=page.title()+"（"+locale+"）";
   if(!doc.select(".media-placeholder").isEmpty())throw new IllegalArgumentException(label+"：仍有未读取的图片或视频，请在内容详情中替换或移除后下载");
   if(!doc.select("iframe").isEmpty())throw new IllegalArgumentException(label+"：嵌入式视频不能随包独立运行，请替换为上传的 MP4 / WebM 视频");
   for(var node:doc.select("img,source,video"))if(node.attr("src").isBlank()&&!(node.tagName().equals("video")&&!node.select("source[src]").isEmpty()))throw new IllegalArgumentException(label+"：图片或视频缺少文件地址，请在内容详情中替换或移除");
   documents.put(locale+"/"+page.id()+".html",doc);bundle.reserve(doc.outerHtml().getBytes(StandardCharsets.UTF_8).length);
  }
  bundle.size=0;
  for(var entry:documents.entrySet()){
   bundle.check();String file=entry.getKey(),locale=file.substring(0,file.indexOf('/'));var doc=entry.getValue();
   var page=p.pages().stream().filter(x->file.equals(locale+"/"+x.id()+".html")).findFirst().orElseThrow();String label=page.title()+"（"+locale+"）";
   for(var link:doc.select("a[href],option[value]")){
    String attr=link.tagName().equals("option")?"value":"href",href=link.attr(attr);
    if(href.startsWith("/api/v1/preview?")){
     var query=new HashMap<String,String>();for(String part:href.substring(href.indexOf('?')+1).split("&")){String[] pair=part.split("=",2);if(pair.length==2)query.put(pair[0],java.net.URLDecoder.decode(pair[1],StandardCharsets.UTF_8));}
     String target=query.getOrDefault("locale",locale)+"/"+query.getOrDefault("page",page.id())+".html";
     if(!documents.containsKey(target))throw new IllegalArgumentException(label+"：包含无法导出的页面链接，请检查栏目及详情");
     link.attr(attr,"../"+target);
    }
   }
   for(var node:doc.select("img[src],video[src],source[src],video[poster]"))for(String attr:List.of("src","poster"))if(node.hasAttr(attr)&&!node.attr(attr).isBlank()){
    String src=node.attr(attr);try{
     String key=src.split("#",2)[0],suffix=src.contains("#")?src.substring(src.indexOf('#')):"";String name=assets.get(key);
     if(name==null){
      bundle.check();byte[] bytes;String type;
      if(key.startsWith("/api/v1/assets/")){
       UUID id=UUID.fromString(key.substring(15));var asset=store.asset(scope,id,false);bytes=(byte[])asset.get("content");type=ProjectStore.mediaType(bytes);
       if(!type.equals(asset.get("media_type")))throw new IllegalArgumentException("素材内容与文件类型不一致");
      }else{
       URI uri=PublicWebsiteReader.validate(URI.create(key));int limit=(int)Math.min(maxAsset,maxTotal-bundle.size);
       if(limit<=0)throw new IllegalArgumentException("文件总大小超过当前打包上限");
       bytes=reader.media(uri,limit,bundle.deadline).bytes();type=ProjectStore.mediaType(bytes);
      }
      if(bytes.length>maxAsset)throw new IllegalArgumentException("素材超过单个文件大小上限，请压缩后替换");
      name=sha(bytes)+"."+extension(type);bundle.put("assets/"+name,bytes);assets.put(key,name);
     }
     boolean video=node.tagName().equals("video")&&attr.equals("src")||node.tagName().equals("source");
     if(video!=name.matches(".*\\.(mp4|webm)$"))throw new IllegalArgumentException("图片和视频文件类型不匹配");
     node.attr(attr,"../assets/"+name+suffix);
    }catch(IOException|IllegalArgumentException ex){throw new IllegalArgumentException(label+"：素材「"+mediaName(src)+"」未打包（"+ex.getMessage()+"）。请在内容详情中上传或替换后重试",ex);}
   }
   doc.select("link[href='/workspace/site-theme.css']").attr("href","../site-theme.css");
   doc.select("script[src='/workspace/site-view.js']").attr("src","../site-view.js");
   if(!doc.select("[src^='/'],[poster^='/'],link[href^='/'],a[href^='/api/'],a[href^='/inquiry'],option[value^='/']").isEmpty())throw new IllegalArgumentException(label+"：仍有平台内部地址，请检查页面内容后重试");
   bundle.put(file,doc.outerHtml().getBytes(StandardCharsets.UTF_8));
  }
  for(String name:List.of("site-theme.css","site-view.js"))try(var source=getClass().getResourceAsStream("/static/workspace/"+name)){if(source==null)throw new IllegalStateException("网站资源未打包："+name);bundle.put(name,source.readAllBytes());}
  String first=p.languages().getFirst()+"/"+p.pages().stream().filter(x->x.path().equals("/")).findFirst().orElse(p.pages().getFirst()).id()+".html";
  bundle.put("index.html",("<!doctype html><html><head><meta charset=\"utf-8\"><meta name=\"viewport\" content=\"width=device-width,initial-scale=1\"><meta http-equiv=\"refresh\" content=\"0;url="+first+"\"><title>"+ContentHtml.text(p.company().name())+"</title></head><body><a href=\""+first+"\">打开网站 / Open website</a></body></html>").getBytes(StandardCharsets.UTF_8));
  try(var source=getClass().getResourceAsStream("/website-package-readme.txt")){if(source==null)throw new IllegalStateException("部署说明未打包");bundle.put("README-部署说明.txt",source.readAllBytes());}
  bundle.check();
  // Recheck revision after media assembly. Network failures never save a version.
  long version=store.saveWebsiteVersion(scope,revision,"下载独立展示网站 ZIP");
  var manifest=new LinkedHashMap<String,Object>();manifest.put("version",version);manifest.put("revision",revision);manifest.put("target",p.site().publicationTarget());manifest.put("packageType","STANDALONE_STATIC_WEBSITE");manifest.put("languages",p.languages());manifest.put("pages",documents.keySet());manifest.put("mediaFiles",bundle.files.keySet().stream().filter(n->n.startsWith("assets/")).count());manifest.put("externalMedia",List.of());manifest.put("backendIncluded",false);manifest.put("deployed",false);
  var checksums=new LinkedHashMap<String,String>();bundle.files.forEach((name,bytes)->checksums.put(name,sha(bytes)));manifest.put("sha256",checksums);bundle.put("publication.json",json.writeValueAsBytes(manifest));
  var bytes=new ByteArrayOutputStream();try(var zip=new ZipOutputStream(bytes)){for(var file:bundle.files.entrySet()){bundle.check();zip.putNextEntry(new ZipEntry(file.getKey()));zip.write(file.getValue());zip.closeEntry();}}
  return bytes.toByteArray();
 }
 private static String mediaName(String src){try{String path=URI.create(src).getPath();String name=path.substring(path.lastIndexOf('/')+1);return name.isBlank()?"媒体文件":name.substring(0,Math.min(name.length(),100));}catch(Exception ex){return "媒体文件";}}
 private static String extension(String type){return switch(type){case "image/png"->"png";case "image/jpeg"->"jpg";case "image/gif"->"gif";case "image/webp"->"webp";case "video/mp4"->"mp4";case "video/webm"->"webm";default->throw new IllegalArgumentException("素材格式不支持");};}
 private static String sha(byte[] bytes){try{return HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(bytes));}catch(java.security.NoSuchAlgorithmException ex){throw new IllegalStateException(ex);}}
 private class Bundle{
  final Map<String,byte[]> files=new LinkedHashMap<>();final long deadline=System.nanoTime()+java.util.concurrent.TimeUnit.SECONDS.toNanos(maxSeconds);long size;
  void check(){if(Thread.currentThread().isInterrupted()||System.nanoTime()>deadline)throw new IllegalArgumentException("网站打包超时，请压缩较大的媒体或稍后重试");}
  void reserve(int length){if(length>maxTotal-size)throw new IllegalArgumentException("网站文件总大小超过当前打包上限，请压缩媒体后重试");size+=length;}
  void put(String name,byte[] bytes){check();if(files.containsKey(name))return;reserve(bytes.length);files.put(name,bytes);}
 }
}
