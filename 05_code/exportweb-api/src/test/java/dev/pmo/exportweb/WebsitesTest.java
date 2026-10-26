package dev.pmo.exportweb;
import java.util.*;
import org.junit.jupiter.api.Test;
import tools.jackson.databind.ObjectMapper;
import static org.junit.jupiter.api.Assertions.*;
class WebsitesTest {
 @Test void savesAllSiteDocumentsButPublishesOnlyActiveContent(){
  var p=ProjectTest.sample();var own=new Project.Company("独立品牌","产品B","","","",List.of("JP"));
  var unsafe=new Project.Page("private","","待发布","/private/",Map.of("en",new Project.Content("B","<p>private</p><script>unsafe()</script>")));
  var a=new Websites.Site("a","A","a.example.test","shared",null,new Websites.Document("T02",p.languages(),p.sourceLanguage(),p.pages(),p.design()));
  var b=new Websites.Site("b","B","b.example.test","independent",own,new Websites.Document("T04",p.languages(),p.sourceLanguage(),List.of(unsafe),new Project.Design("single","subtle")));
  var clean=new Project(p.company(),p.plan(),p.theme(),p.languages(),p.sourceLanguage(),p.pages(),p.workspace(),p.design(),new Websites("a",List.of(a,b))).cleaned();
  var roundtrip=new ObjectMapper().readValue(new ObjectMapper().writeValueAsString(clean),Project.class);
  assertEquals(2,roundtrip.websites().items().size());assertFalse(roundtrip.websites().items().get(1).document().pages().getFirst().content().get("en").html().contains("script"));
  assertEquals(p.company(),clean.websiteCompany());assertTrue(clean.websiteOnly().websites().items().isEmpty());assertTrue(clean.websiteOnly().plan().isEmpty());
  assertFalse(new ObjectMapper().writeValueAsString(clean.websiteOnly()).contains("private"));
  assertEquals(clean.websites(),clean.withPages(p.pages()).websites());
 }
 @Test void singlePagePreviewAndPublicationUseAnchorsAndPreserveEveryPage(){
  var p=ProjectTest.sample();var pages=new ArrayList<>(p.pages());pages.add(new Project.Page("detail","","详情","/detail/",Map.of("en",new Project.Content("Details","<p>Detail content</p>"))));
  var single=new Project(p.company(),p.plan(),"T04",p.languages(),p.sourceLanguage(),pages,p.workspace(),new Project.Design("single","subtle")).cleaned();
  for(boolean preview:List.of(true,false)){var html=SiteHtml.render(single,"en","hero",preview);assertTrue(html.contains("href=\"#page-detail\""));assertTrue(html.contains("id=\"page-detail\""));assertTrue(html.contains("English content"));assertTrue(html.contains("Detail content"));assertTrue(html.contains("product-art"));}
  assertThrows(IllegalArgumentException.class,()->new Project(p.company(),p.plan(),p.theme(),p.languages(),p.sourceLanguage(),p.pages(),p.workspace(),new Project.Design("invalid","static")).cleaned());
 }
}
