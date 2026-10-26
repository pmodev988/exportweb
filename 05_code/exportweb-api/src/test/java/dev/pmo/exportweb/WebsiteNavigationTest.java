package dev.pmo.exportweb;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;
import java.net.URI;
import java.nio.charset.StandardCharsets;
import java.util.*;
import org.jsoup.Jsoup;
import org.junit.jupiter.api.Test;

class WebsiteNavigationTest {
 static final URI ROOT=URI.create("https://accurlcnc.com/");
 static final List<String> PRODUCTS=List.of("Press Brake","Shearing Machine","Bending Center","Handheld Laser Welder","CNC Laser Cutting Machine","Hydraulic Press","Power Press","CNC Punch Press","Automatic Production Line (Metal Forming)","Rolling Machine","Plasma Cutting Machine","Waterjet Cutting Machine");
 static String fixture()throws Exception {try(var stream=WebsiteNavigationTest.class.getResourceAsStream("/website-import/accurl-navigation.html")){return new String(stream.readAllBytes(),StandardCharsets.UTF_8);}}
 static Project.Page find(List<Project.Page> pages,String title){return pages.stream().filter(p->p.navPlacement().equals("header")&&p.title().equals(title)).findFirst().orElseThrow();}
 static List<Project.Page> children(List<Project.Page> pages,Project.Page parent){return pages.stream().filter(p->p.parent().equals(parent.id())).toList();}
 @Test void accurlMenusKeepSourceLabelsOrderAndSharedUrlChildren()throws Exception {
  var reader=mock(PublicWebsiteReader.class);var counts=new HashMap<URI,Integer>();String html=fixture();
  when(reader.get(any(),anyInt())).thenAnswer(i->{URI u=i.getArgument(0);counts.merge(u,1,Integer::sum);return new PublicWebsiteReader.Document(u,(u.equals(ROOT)?html:"<main><h1>Fixture detail</h1><p>Original detail</p></main>").getBytes(StandardCharsets.UTF_8));});
  var result=new WebsiteImport(reader,60,2000000).read(ROOT.toString(),true,"zh-Hans");var pages=result.pages();
  assertEquals("en",result.language());assertTrue(result.warnings().isEmpty(),result.warnings().toString());
  assertEquals(List.of("Home","Products","About Us","Service","News & Events","Videos","Contact"),pages.stream().filter(p->p.navPlacement().equals("header")&&p.parent().isEmpty()).map(Project.Page::title).toList());
  assertEquals("hero",find(pages,"Home").id());assertEquals("/",find(pages,"Home").path());assertTrue(pages.stream().noneMatch(p->p.title().equals("首页")));
  assertEquals(PRODUCTS,children(pages,find(pages,"Products")).stream().map(Project.Page::title).toList());
  assertEquals(List.of("Company Profile","Case Studies","R&D","Manufacturing","Applications"),children(pages,find(pages,"About Us")).stream().map(Project.Page::title).toList());
  assertEquals("Technical Support",children(pages,find(pages,"Service")).getFirst().title());assertEquals("Newsroom",children(pages,find(pages,"News & Events")).getLast().title());
  var about=find(pages,"About Us");var profile=find(pages,"Company Profile");assertNotEquals(about.id(),profile.id());assertEquals(List.of(about.id(),profile.id()),about.mounts());assertTrue(profile.content().isEmpty());assertTrue(profile.isMenu());
  assertEquals(pages.size(),pages.stream().map(Project.Page::id).distinct().count());assertEquals(pages.size(),pages.stream().map(Project.Page::path).distinct().count());assertTrue(counts.values().stream().allMatch(n->n==1));assertFalse(counts.containsKey(ROOT.resolve("index.html")));
  var clean=ProjectTest.sample().withPages(pages).cleaned();var preview=Jsoup.parse(SiteHtml.render(clean,"en",profile.id(),true));assertEquals("Fixture detail",preview.selectFirst(".sw-collection-item h3").text());assertTrue(preview.selectFirst(".sw-collection-item a").attr("href").contains("page="+about.id()));assertTrue(SiteHtml.render(clean,"en",about.id(),true).contains("Original detail"));assertTrue(preview.text().contains("Company Profile"));
  assertEquals(pages,new WebsiteImport(reader,60,2000000).read(ROOT.toString(),true,"en").pages(),"Repeated import must retain stable menu identities");
 }
 @Test void homeAliasesAndRepeatedDesktopMobileNavigationDoNotCreateExtraHome(){
  for(String source:List.of("https://example.test/","https://example.test/index.html","https://example.test/index.htm")){
   var doc=Jsoup.parse("<nav><ul><li><a href='/index.html'>Home</a></li><li><a href='/about/'>About</a><ul><li><a href='/about/'>Profile</a></li></ul></li></ul></nav>");doc.body().appendChild(doc.selectFirst("nav").clone());
   var menus=WebsiteNavigation.read(doc,URI.create(source),60,new ArrayList<>());assertEquals(List.of("Home","About","Profile"),menus.values().stream().map(WebsiteNavigation.Menu::title).toList());assertEquals(1,menus.values().stream().filter(WebsiteNavigation.Menu::home).count());
  }
 }
 @Test void unresolvedAndAmbiguousEmptyDropdownsAreReportedInsteadOfInvented(){
  for(String footer:List.of("","<footer><h2><a href='/products/'>Products</a></h2><ul><li><a href='/a/'>A</a></li></ul><h2><a href='/products/'>Products</a></h2><ul><li><a href='/b/'>B</a></li></ul></footer>")){
   var warnings=new ArrayList<String>();var menus=WebsiteNavigation.read(Jsoup.parse("<nav><ul><li><a href='/'>Home</a></li><li><a href='/products/'>Products</a><ul></ul></li></ul></nav>"+footer),ROOT,60,warnings);
   assertEquals(1,warnings.size());assertTrue(warnings.getFirst().contains("未能完整读取"));assertEquals(2,menus.values().stream().filter(m->m.position().equals("header")).count());
  }
 }
 @Test void actualMenuCountLimitIncludesRestoredAndSameUrlChildren()throws Exception {
  assertThrows(IllegalArgumentException.class,()->WebsiteNavigation.read(Jsoup.parse(fixture()),ROOT,20,new ArrayList<>()));
 }
}
