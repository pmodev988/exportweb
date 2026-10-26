package dev.pmo.exportweb;
import java.util.*;
import tools.jackson.databind.ObjectMapper;

/** Metadata describes only facts already visible on this page. No synthetic claims. */
final class SiteMetadata {
 static String head(Project project,Project.Content content,String language){
  String summary=org.jsoup.Jsoup.parse(content.html()).text();if(summary.length()>180)summary=summary.substring(0,180);
  var graph=new ArrayList<Map<String,Object>>();String name=project.websiteCompany().name();
  if(!name.isBlank())graph.add(Map.of("@type","Organization","name",name));
  var page=new LinkedHashMap<String,Object>();page.put("@type","WebPage");page.put("name",content.title());page.put("inLanguage",language);if(!summary.isBlank())page.put("description",summary);graph.add(page);
  String data=new ObjectMapper().writeValueAsString(Map.of("@context","https://schema.org","@graph",graph)).replace("<","\\u003c").replace(">","\\u003e").replace("&","\\u0026");
  return (summary.isBlank()?"":"<meta name=\"description\" content=\""+ContentHtml.text(summary)+"\">")+"<script type=\"application/ld+json\">"+data+"</script>";
 }
}
