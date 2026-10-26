package dev.pmo.exportweb;
import java.util.*;
import tools.jackson.databind.ObjectMapper;
final class ThemeCatalog {
 private static final Map<String,String> CLASSES=load();
 private static final Map<String,Map<String,String>> HEROES=loadHeroes();
 private static Map<String,Map<String,String>> loadHeroes(){
  try(var input=ThemeCatalog.class.getResourceAsStream("/static/workspace/catalog.json")){
   var result=new HashMap<String,Map<String,String>>();
   for(var theme:new ObjectMapper().readTree(input).path("themes")){
    var motions=new HashMap<String,String>();for(String motion:List.of("static","subtle","expressive"))motions.put(motion,theme.path("heroes").path(motion).asText());
    result.put(theme.path("id").asText(),Map.copyOf(motions));
   }return Map.copyOf(result);
  }catch(Exception e){throw new IllegalStateException("网站预览载入失败",e);}
 }
 static String hero(String id,String motion,String title,String company,String html){
  return hero(id,motion,title,company,html,"");
 }
 static String hero(String id,String motion,String title,String company,String html,String action){
  String template=HEROES.get(id).get(motion);
  if(template==null||template.isBlank())throw new IllegalStateException("网站预览模板不完整");
  var values=Map.of("EXPORTWEB_TITLE_SLOT",ContentHtml.text(title),"EXPORTWEB_COMPANY_SLOT",ContentHtml.text(company),"EXPORTWEB_BODY_SLOT",html,"EXPORTWEB_ACTION_SLOT",action);
  return java.util.regex.Pattern.compile("EXPORTWEB_TITLE_SLOT|EXPORTWEB_COMPANY_SLOT|EXPORTWEB_BODY_SLOT|EXPORTWEB_ACTION_SLOT").matcher(template).replaceAll(m->java.util.regex.Matcher.quoteReplacement(values.get(m.group())));
 }
 private static Map<String,String> load(){
  try(var input=ThemeCatalog.class.getResourceAsStream("/static/workspace/catalog.json")){
   if(input==null)throw new IllegalStateException("请先构建 exportweb-web");
   var map=new HashMap<String,String>();
   for(var theme:new ObjectMapper().readTree(input).path("themes"))map.put(theme.path("id").asText(),theme.path("classes").asText());
   if(map.size()!=32)throw new IllegalStateException("网站风格目录不完整");
   return Map.copyOf(map);
  }catch(Exception e){throw new IllegalStateException("网站风格载入失败",e);}
 }
 static String classes(String id){String value=CLASSES.get(id);if(value==null)throw new IllegalArgumentException("网站风格不存在");return value;}
 static tools.jackson.databind.JsonNode contentLayouts(){try(var input=ThemeCatalog.class.getResourceAsStream("/static/workspace/catalog.json")){return new ObjectMapper().readTree(input).path("contentLayouts");}catch(Exception e){throw new IllegalStateException("内容布局目录载入失败",e);}}
 static String label(String language,String key){try(var input=ThemeCatalog.class.getResourceAsStream("/static/workspace/catalog.json")){return new ObjectMapper().readTree(input).path("languageLabels").path(language).path(key).asText();}catch(Exception e){return "";}}
 static String cta(String theme,String language){if(language.startsWith("zh"))try(var input=ThemeCatalog.class.getResourceAsStream("/static/workspace/catalog.json")){for(var value:new ObjectMapper().readTree(input).path("themes"))if(value.path("id").asText().equals(theme))return value.path("cta").asText();}catch(Exception ignored){}return label(language,"cta");}
 static Set<String> marketLanguages(List<String> markets){try(var input=ThemeCatalog.class.getResourceAsStream("/static/workspace/catalog.json")){var data=new ObjectMapper().readTree(input).path("marketLanguages");var result=new HashSet<String>();for(String market:markets)for(var lang:data.path(market))result.add(lang.asText());return result;}catch(Exception e){throw new IllegalStateException("市场语言目录载入失败",e);}}
}
