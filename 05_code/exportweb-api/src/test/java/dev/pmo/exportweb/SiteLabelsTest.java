package dev.pmo.exportweb;
import static org.junit.jupiter.api.Assertions.*;
import java.util.*;
import org.junit.jupiter.api.Test;
class SiteLabelsTest {
 @Test void visitorLabelsAreValidatedEscapedAndSharedByPreviewAndPublishedPages(){
  var p=ProjectTest.sample();var s=new SiteSettings("",null,null,"platform",null,null,Map.of("en",Map.of("nav","Our menu","notice","Read <this>","footer","Company & Co.")));
  var project=new Project(p.company(),p.plan(),p.theme(),p.languages(),p.sourceLanguage(),p.pages(),p.workspace(),p.design(),p.websites(),s,p.system()).cleaned();
  for(boolean preview:List.of(true,false)){String html=SiteHtml.render(project,"en","hero",preview);assertTrue(html.contains("aria-label=\"Our menu\""));assertTrue(html.contains("Read &lt;this&gt;"));assertTrue(html.contains("Company &amp; Co."));}
  assertThrows(IllegalArgumentException.class,()->new SiteSettings("",null,null,"platform",null,null,Map.of("de",Map.of("footer","Text"))).cleaned(p.pages(),p.languages()));
  assertTrue(SiteSettings.empty().labels().isEmpty());
 }
}
