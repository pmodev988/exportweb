package dev.pmo.exportweb;
import static org.junit.jupiter.api.Assertions.*;
import java.util.*;
import org.junit.jupiter.api.Test;
class ProjectTest {
 @Test void previousJsonWithoutSelfWebFieldsRemainsReadable(){
  var mapper=new tools.jackson.databind.ObjectMapper();String old=mapper.writeValueAsString(sample()).replace(",\"detailDeleted\":false","").replace(",\"menuCode\":\"\"","").replace(",\"ownerPageId\":\"\"","");
  var loaded=mapper.readValue(old,Project.class).cleaned();assertFalse(loaded.pages().getFirst().detailDeleted());assertEquals("<p>中文内容</p>",loaded.pages().getFirst().content().get("zh-Hans").html());assertTrue(SiteHtml.render(loaded,"zh-Hans","hero",true).contains("中文内容"));
 }
 static Project sample(){
  return new Project(new Project.Company("测试工厂","设备","定制","","说明",List.of("CN","US")),"计划","T02",List.of("zh-Hans","en"),"zh-Hans",List.of(new Project.Page("hero","","首页","/",Map.of("zh-Hans",new Project.Content("首页","<p>中文内容</p>"),"en",new Project.Content("Home","<p>English content</p>")))));
 }
 @Test void rejectsCyclesDuplicatesAndMalformedInputs(){
  var p=sample();
  assertThrows(IllegalArgumentException.class,()->p.withPages(List.of(new Project.Page("a","b","A","/a/",Map.of()),new Project.Page("b","a","B","/b/",Map.of()))).cleaned());
  assertThrows(IllegalArgumentException.class,()->p.withPages(List.of(p.pages().getFirst(),p.pages().getFirst())).cleaned());
  assertThrows(IllegalArgumentException.class,()->new Project(null,null,null,null,null,null).cleaned());
  assertThrows(IllegalArgumentException.class,()->p.withPages(List.of(new Project.Page("a","missing","A","/a/",Map.of()))).cleaned());
 }
 @Test void removesActiveMarkupAndKeepsRichTextMedia(){
  String cleaned=ContentHtml.clean("<p onclick='bad()'>文本 <strong>粗体</strong></p><img src='https://supplier.example/a.png' onerror='bad()'><video src='/api/v1/assets/123'></video><script>bad()</script><iframe src='https://evil.example/'></iframe><a href='javascript:bad()'>链接</a>");
  assertTrue(cleaned.contains("<strong>粗体</strong>"));assertTrue(cleaned.contains("/api/v1/assets/123"));
  assertFalse(cleaned.contains("onerror"));assertFalse(cleaned.contains("onclick"));assertFalse(cleaned.contains("javascript:"));assertFalse(cleaned.contains("evil.example"));assertFalse(cleaned.contains("<script"));
 }
 @Test void distinguishesCompletedLanguagesFromMissingPages(){
  assertEquals(List.of("zh-Hans","en"),sample().readyLanguages());
  assertEquals(sample().languages(),sample().withPages(List.of(new Project.Page("empty","","Empty","/",Map.of()))).readyLanguages());
 }
 @Test void visitorLanguagesPreservePageAndAllThemesAreShared(){
  var p=sample();
  for(int n=1;n<=32;n++){
   String id="T%02d".formatted(n);var themed=new Project(p.company(),p.plan(),id,p.languages(),p.sourceLanguage(),p.pages());
   var html=SiteHtml.render(themed,"en","hero",false);
   assertTrue(html.contains(ThemeCatalog.classes(id)));assertTrue(html.contains("English content"));
   assertTrue(html.contains("locale=zh-Hans&amp;page=hero"));assertFalse(html.contains("中文内容"));
  }
 }
 @Test void publishedMediaUsesPublicRouteOnly(){
  var p=sample().withPages(List.of(new Project.Page("hero","","首页","/",Map.of("zh-Hans",new Project.Content("首页","<img src='/api/v1/assets/123'>")))));
  assertTrue(SiteHtml.render(p,"zh-Hans","hero",true).contains("/api/v1/assets/123"));
  assertTrue(SiteHtml.render(p,"zh-Hans","hero",false).contains("/media/123"));
 }
 @Test void singlePageCollectionsOpenTheirOwnDetailAndKeepMenuReturnLinks(){
  var p=sample();var rows=new ArrayList<>(p.pages());rows.add(new Project.Page("details","","独立详情","/detail/",Map.of("zh-Hans",new Project.Content("独立详情","<p>详情正文</p>")),"","hero",false));
  var site=new Project(p.company(),p.plan(),p.theme(),p.languages(),p.sourceLanguage(),rows,p.workspace(),new Project.Design("single","static"));
  String html=SiteHtml.render(site,"zh-Hans","details",true);assertTrue(html.contains("详情正文"));assertFalse(html.contains("中文内容"));assertTrue(html.contains("href=\"/api/v1/preview?locale=zh-Hans&amp;page=hero\""));
 }
 @Test void detailPreviewUsesThemeLayoutAndOpensItsCurrentMenuBranch(){
  var p=sample();var rows=new ArrayList<>(p.pages());rows.add(new Project.Page("products","","Products","/products/",Map.of("en",new Project.Content("Products","<p>Products</p>"))));rows.add(new Project.Page("press","products","Press Brake","/press/",Map.of("en",new Project.Content("Press Brake","<p>Specification</p><img src='/api/v1/assets/123'>"))));
  var site=p.withPages(rows).cleaned();var doc=org.jsoup.Jsoup.parse(SiteHtml.render(site,"en","press",true));
  assertTrue(doc.selectFirst("#page-press").hasClass("detail-layout-media"));assertFalse(doc.select("#page-press .smart-detail-content").isEmpty());
  var product=doc.select(".mock-nav .site-nav-item").stream().filter(n->n.text().contains("Products")).findFirst().orElseThrow();assertEquals("true",product.selectFirst("button").attr("aria-expanded"));assertFalse(product.selectFirst(".site-dropdown").hasAttr("hidden"));assertFalse(product.select("a[href*=page=press]").isEmpty());
 }
}
