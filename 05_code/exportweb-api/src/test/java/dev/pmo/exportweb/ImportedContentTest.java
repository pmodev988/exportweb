package dev.pmo.exportweb;

import static org.junit.jupiter.api.Assertions.*;
import java.nio.file.*;
import org.jsoup.Jsoup;
import org.junit.jupiter.api.Test;

class ImportedContentTest {
 @Test void standardElementsAreRenamedAndRestyledWithoutForeignClasses()throws Exception{
  String html=Files.readString(Path.of("src/test/resources/website-import/common-layouts.html"));
  var doc=Jsoup.parse(ContentHtml.clean(html));assertEquals(1,doc.select(".content-media-text").size());assertEquals(2,doc.select(".content-card").size());assertEquals(2,doc.select(".content-gallery img").size());assertEquals(1,doc.select(".content-specs table").size());assertEquals(1,doc.select("a.content-button").size());assertTrue(doc.select("[class*=source-],.btn,.btn-primary").isEmpty());assertTrue(doc.text().contains("Steel"));
  assertEquals(ContentHtml.clean(html),ContentHtml.clean(ContentHtml.clean(html)));
 }
 static String fixture()throws Exception{return Files.readString(Path.of("src/test/resources/website-import/product-layout.html"));}
 @Test void newAndPreviouslySanitizedImportsKeepProductRelationships()throws Exception{
  var source=Jsoup.parse(fixture(),"https://supplier.example/products/");
  String html=WebsiteImport.content(source);var doc=Jsoup.parse(html);
  assertEquals("Products",WebsiteImport.title(source,"Products"));
  assertEquals(3,doc.select(".content-product").size());assertEquals(3,doc.select(".content-product h3 a").size());
  assertEquals(3,doc.select(".content-product img").size());assertEquals(2,doc.select("ol>li").size());
  assertTrue(doc.select(".content-product ul,.content-product ol").isEmpty());
  for(var row:doc.select(".content-product"))assertEquals(row.selectFirst("img").parent().attr("href"),row.selectFirst("h3 a").attr("href"));
  assertEquals(html,ContentHtml.clean(html));
  var old=source.selectFirst(".content").clone();old.select("[class]").removeAttr("class");
  assertEquals(3,Jsoup.parse(ContentHtml.clean(old.html())).select(".content-product").size());
  assertTrue(doc.text().contains("Keep all original specifications."));
 }
 @Test void excludedMediaRetainsRowsAndNeverLoadsOriginalImage()throws Exception{
  var doc=Jsoup.parse(WebsiteImport.content(Jsoup.parse(fixture(),"https://supplier.example/products/"),false,false));
  assertEquals(3,doc.select(".content-product .media-placeholder").size());assertTrue(doc.select("img").isEmpty());
 }
 @Test void ordinaryOrMixedListsRemainListsAndUnsafeContentStaysBlocked()throws Exception{
  String normal="<ol><li><ol><li><img src='https://supplier.example/a.png'></li><li>Step instructions</li></ol></li></ol>";
  assertTrue(Jsoup.parse(ContentHtml.clean(normal)).select(".content-product").isEmpty());
  var source=Jsoup.parse(fixture());source.selectFirst(".etw_products1>ul").appendElement("li").text("Additional note");
  assertTrue(Jsoup.parse(ContentHtml.clean(source.selectFirst(".content").html())).select(".content-product").isEmpty());
  String poisoned=fixture().replace("class=\"product_img\"","onclick=\"bad()\" style=\"position:fixed\"")+"<script>bad()</script><iframe src='https://evil.example/'></iframe>";
  var clean=Jsoup.parse(ContentHtml.clean(poisoned));assertTrue(clean.select("script,iframe,[onclick],[style]").isEmpty());
  assertEquals(3,clean.select(".content-product").size());
 }
 @Test void renderOldContentForBrowserVerification()throws Exception{
  var mapper=new tools.jackson.databind.ObjectMapper();var base=mapper.readValue(Files.readString(Path.of("src/test/resources/it97-project.json")),Project.class);
  var source=Jsoup.parse(fixture());var old=source.selectFirst(".content").clone();old.select("[class]").removeAttr("class");
  var content=new Project.Content("Products",old.html(),"Products");
  var pages=base.pages().stream().map(p->p.id().equals("press")?p.withContent(java.util.Map.of("zh-Hans",content)):p).toList();
  var project=base.withPages(pages);var out=Path.of("target/it99-preview");Files.createDirectories(out);
  Files.writeString(out.resolve("project.json"),mapper.writeValueAsString(project));
  for(String theme:java.util.List.of("T04","T10")){
   var p=new Project(project.company(),project.plan(),theme,project.languages(),project.sourceLanguage(),project.pages(),project.workspace(),project.design(),project.websites(),project.site(),project.system());
   var html=SiteHtml.render(p,"zh-Hans","press",true);assertEquals(3,Jsoup.parse(html).select(".content-product").size());Files.writeString(out.resolve(theme+".html"),html);
  }
  String audit=System.getProperty("exportweb.importAuditHtml","");
  if(!audit.isBlank()){
   var original=Jsoup.parse(Files.readString(Path.of(audit)),"https://accurlcnc.com/products/0/205143/");
   var sourceContent=original.selectFirst(".content");var result=Jsoup.parse(WebsiteImport.content(original));
   assertEquals(sourceContent.select("img").size(),result.select("img").size());
   assertEquals(sourceContent.text().replaceAll("\\s", ""),result.text().replaceAll("\\s", ""));
   assertTrue(result.select(".content-product").size()>3);
   Files.writeString(out.resolve("public-source-audit.json"),mapper.writeValueAsString(java.util.Map.of("source","https://accurlcnc.com/products/0/205143/","imageCount",result.select("img").size(),"productRows",result.select(".content-product").size(),"textPreserved",true,"title",WebsiteImport.title(original,"Products"))));
  }
 }
}
