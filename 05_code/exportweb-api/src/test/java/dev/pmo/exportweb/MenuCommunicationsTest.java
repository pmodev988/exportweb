package dev.pmo.exportweb;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;
import java.net.URI;
import java.nio.charset.StandardCharsets;
import java.util.*;
import org.jsoup.Jsoup;
import org.junit.jupiter.api.Test;

class MenuCommunicationsTest {
 Project.Page menu(String id,String parent,String placement,boolean expanded){return new Project.Page(id,parent,"支持","/"+id+"/",Map.of(),"","",false,null,"menu",placement,expanded,null);}
 @Test void headerFooterAndSharedDetailSurviveSerializationAndPublicRendering(){
  var p=ProjectTest.sample();var detail=new Project.Page("detail","","服务说明","/detail/",Map.of("en",new Project.Content("Shared service","<p>One source</p>")),"","header",false,null,"detail","header",false,List.of("header","footer"));
  p=p.withPages(List.of(p.pages().getFirst(),menu("header","","header",false),menu("footer","","footer",true),menu("child","footer","header",false),detail)).cleaned();
  var mapper=new tools.jackson.databind.ObjectMapper();p=mapper.readValue(mapper.writeValueAsString(p),Project.class).cleaned();assertEquals("F001",p.pages().get(2).menuCode());assertEquals(List.of("header","footer"),p.pages().getLast().mounts());
  for(boolean preview:List.of(true,false))for(String target:List.of("header","footer")){
   var doc=Jsoup.parse(SiteHtml.render(p,"en",target,preview));assertFalse(doc.select(".mock-nav a[href*=page=header]").isEmpty());assertTrue(doc.select(".mock-nav a[href*=page=footer]").isEmpty());
   assertFalse(doc.select(".site-footer-nav a[href*=page=footer]").isEmpty());assertEquals("true",doc.selectFirst(".site-footer-nav button").attr("aria-expanded"));assertFalse(doc.selectFirst(".site-footer-nav .site-dropdown").hasAttr("hidden"));assertEquals("Shared service",doc.selectFirst(".sw-collection-item h3").text());
  }
 }
 @Test void invalidMountsAreRejectedWhileUnassignedDetailsRemainEditable(){
  var p=ProjectTest.sample();var detail=new Project.Page("detail","","Standalone","/detail/",Map.of("en",new Project.Content("Kept","<p>Saved</p>")),"","",false,null,"detail","header",false,List.of());
  var clean=p.withPages(List.of(p.pages().getFirst(),detail)).cleaned();assertFalse(clean.pages().getLast().isMenu());assertTrue(SiteHtml.render(clean,"en","detail",true).contains("Saved"));
  var invalid=new Project.Page("detail","","Broken","/detail/",Map.of(),"","",false,null,"detail","header",false,List.of("missing"));assertThrows(IllegalArgumentException.class,()->p.withPages(List.of(p.pages().getFirst(),invalid)).cleaned());
 }
 @Test void globalContactsAreSelectedByIdAndOnlySelectedValuesEnterWebsiteExports(){
  var p=ProjectTest.sample();var system=new SystemSettings(Map.of(),List.of(),List.of(new SystemSettings.Contact("sales","telegram","销售咨询","https://t.me/local_sales"),new SystemSettings.Contact("support","email","售后","support@example.test")));
  var site=new SiteSettings("",null,null,"platform",Map.of(),null,null,List.of("sales"));var project=new Project(p.company(),p.plan(),p.theme(),p.languages(),p.sourceLanguage(),p.pages(),p.workspace(),p.design(),p.websites(),site,system).cleaned();
  assertEquals(List.of("sales"),project.websiteOnly().system().contacts().stream().map(SystemSettings.Contact::id).toList());
  var html=SiteHtml.render(ProjectStore.publicationProject(project),"en","hero",false);assertTrue(html.contains("https://t.me/local_sales"));assertFalse(html.contains("support@example.test"));
  assertThrows(IllegalArgumentException.class,()->new SystemSettings.Contact("bad","telegram","链接","javascript:alert(1)").validate());
 }
 @Test void imageAndVideoChoicesPreserveMetadataWithoutLoadingExcludedMedia()throws Exception{
  var reader=new WebsiteImportTest().fixture();var importer=new WebsiteImport(reader,60,2000000);
  for(boolean images:List.of(false,true))for(boolean videos:List.of(false,true)){
   var result=importer.read(WebsiteImportTest.ROOT.toString(),true,"en",images,videos,(a,b)->{});var html=result.pages().getLast().content().get("en").html();var doc=Jsoup.parse(html);
   assertEquals(images?1:0,doc.select("img").size());assertEquals(videos?1:0,doc.select("video").size());assertEquals(videos?1:0,doc.select("iframe").size());assertEquals((images?0:1)+(videos?0:2),doc.select(".media-placeholder").size());
   if(!images){assertEquals("photo.jpg",doc.selectFirst("[data-media-kind=image]").attr("data-media-name"));assertFalse(doc.selectFirst("[data-media-kind=image]").hasAttr("src"));}
   assertEquals(doc.select(".media-placeholder").size(),Jsoup.parse(ContentHtml.clean(html)).select(".media-placeholder").size());
  }
 }
 @Test void repeatedSourceInHeaderAndFooterCreatesDistinctMenusWithOneSharedBody()throws Exception{
  var reader=mock(PublicWebsiteReader.class);String home="<header><nav><a href='/support/'>支持</a></nav></header><footer><a href='/support/'>支持</a></footer><main><p>首页</p></main>";
  when(reader.get(any(),anyInt())).thenAnswer(i->{URI u=i.getArgument(0);return new PublicWebsiteReader.Document(u,(u.getPath().equals("/")?home:"<main><h1>支持详情</h1><p>共享正文</p></main>").getBytes(StandardCharsets.UTF_8));});
  var pages=new WebsiteImport(reader,60,2000000).read("https://example.test/",true,"en").pages();assertEquals(3,pages.size());assertNotEquals(pages.get(1).id(),pages.get(2).id());assertNotEquals(pages.get(1).path(),pages.get(2).path());assertEquals("footer",pages.get(2).navPlacement());assertEquals(List.of(pages.get(1).id(),pages.get(2).id()),pages.get(1).mounts());assertTrue(pages.get(2).content().isEmpty());verify(reader,times(2)).get(any(),anyInt());
 }
}
