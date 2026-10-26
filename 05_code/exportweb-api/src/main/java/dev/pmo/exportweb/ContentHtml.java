package dev.pmo.exportweb;
import java.net.URI;
import java.util.Set;
import org.jsoup.Jsoup;
import org.jsoup.safety.Safelist;
final class ContentHtml {
 static String clean(String html){
  var doc=Jsoup.parseBodyFragment(html);
  ImportedContent.normalize(doc.body());
  // Only known HTTPS embed providers survive. No arbitrary scripts or frame origins.
  doc.select("iframe").forEach(e->{try{var u=URI.create(e.attr("src"));if(!"https".equals(u.getScheme())||!Set.of("www.youtube.com","www.youtube-nocookie.com","player.vimeo.com").contains(u.getHost())||!u.getPath().matches("/(?:embed|video)/[A-Za-z0-9_-]+"))e.remove();}catch(Exception ex){e.remove();}});
  var safe=Safelist.relaxed().addTags("figure","figcaption","video","source","iframe","section","hr","h1","u")
   .addAttributes("video","src","controls","poster","title","data-media-alt").addAttributes("source","src","type").addAttributes("iframe","src","title","allowfullscreen")
   .addAttributes("figure","class").addAttributes("a","class").addAttributes("div","class","data-media-kind","data-media-name","data-media-alt","data-media-source").addAttributes("section","class")
   .addAttributes("p","style").addAttributes("h2","style").addAttributes("h3","style").addAttributes("td","colspan","rowspan")
   .addProtocols("video","src","https").addProtocols("source","src","https").addProtocols("iframe","src","https").removeProtocols("img","src","http");
  // Relative media paths are first-party only; never protocol-relative.
  doc.select("[src]").forEach(e->{String src=e.attr("src");if(src.startsWith("/")&&!src.startsWith("//"))e.attr("src","https://exportweb.invalid"+src);});
  var cleaned=Jsoup.parseBodyFragment(Jsoup.clean(doc.body().html(),safe));
  cleaned.select("[src]").forEach(e->{if(e.attr("src").startsWith("https://exportweb.invalid/api/v1/assets/"))e.attr("src",e.attr("src").substring("https://exportweb.invalid".length()));});
  cleaned.select("[style]").forEach(e->{String style=e.attr("style").replace(" ","");if(!style.matches("text-align:(left|center|right|justify);?"))e.removeAttr("style");});
  cleaned.select("[class]").forEach(e->{var known=Set.of("media-placeholder","image","image-style-side","image-style-block","image-style-inline","media","table","rich-columns","rich-columns-2","rich-columns-3","rich-column","content-products","content-product","content-card-grid","content-card","content-media-text","content-gallery","content-specs","content-callout","content-button");var classes=e.classNames().stream().filter(known::contains).toList();if(classes.isEmpty())e.removeAttr("class");else e.attr("class",String.join(" ",classes));});
  ImportedContent.normalize(cleaned.body());
  cleaned.select("video").attr("controls","");cleaned.select("iframe").attr("sandbox","allow-scripts allow-same-origin allow-presentation");
  cleaned.select("a").attr("rel","noopener noreferrer");return cleaned.body().html();
 }
 static String text(String text){return text.replace("&","&amp;").replace("<","&lt;").replace(">","&gt;").replace("\"","&quot;").replace("'","&#39;");}
}
