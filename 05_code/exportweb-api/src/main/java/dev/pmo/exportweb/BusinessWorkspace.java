package dev.pmo.exportweb;

import java.util.*;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.node.ObjectNode;

/** Versioned customer workspace data. No credentials, authorization or provider policies. */
final class BusinessWorkspace {
 private BusinessWorkspace(){}
 static void validate(JsonNode node){
  if(node==null||node.isNull())return;
  if(!node.isObject()||node.toString().length()>4000000)throw new IllegalArgumentException("业务工作区资料过大或无效");
  for(String key:node.propertyNames())if(!Set.of("sequence","articles","geo").contains(key))throw new IllegalArgumentException("独立网站不接受其他产品的业务资料");
  var articles=node.path("articles");bound(articles,300,"文章");
  var ids=new HashSet<String>();
  if(articles.isArray())for(var article:articles){
   String id=article.path("id").asText();
   if(!id.matches("[a-zA-Z0-9-]{1,80}")||!ids.add(id)||article.path("siteId").asText().isBlank())throw new IllegalArgumentException("文章标识或所属网站无效");
   limit(article,"title",180);limit(article,"body",30000);limit(article,"facts",5000);limit(article,"keywords",500);limit(article,"audience",500);
   if(!article.path("language").asText().matches("[a-z]{2,3}(?:-[A-Za-z0-9]{2,8})*"))throw new IllegalArgumentException("文章语言无效");
   bound(article.path("history"),30,"文章历史");
   if(article.path("history").isArray())for(var h:article.path("history")){limit(h,"body",30000);limit(h,"title",180);}
  }
  if(node.has("geo")){if(!node.path("geo").isObject()||node.path("geo").size()>50)throw new IllegalArgumentException("GEO 网站记录无效");for(var records:node.path("geo")){bound(records,300,"GEO 观察");for(var o:records){limit(o,"engine",80);limit(o,"question",500);limit(o,"note",3000);limit(o,"url",2000);if(!Set.of("yes","no","unknown").contains(o.path("cited").asText()))throw new IllegalArgumentException("引用状态无效");try{java.time.LocalDate.parse(o.path("date").asText());}catch(Exception e){throw new IllegalArgumentException("观察日期无效");}}}}
 }
 private static void id(JsonNode n){if(!n.isObject()||!n.path("id").asText().matches("[a-zA-Z0-9-]{1,80}"))throw new IllegalArgumentException("业务记录标识无效");}
 private static void bound(JsonNode n,int max,String name){if(!n.isMissingNode()&&(!n.isArray()||n.size()>max))throw new IllegalArgumentException(name+"数量过多或格式无效");}
 private static void limit(JsonNode n,String key,int max){if(!n.path(key).isTextual()||n.path(key).asText().length()>max)throw new IllegalArgumentException("业务字段 "+key+" 内容过长或无效");}
 static ObjectNode copy(Project project){var node=project.workspace().business();if(node==null||!node.isObject())throw new IllegalArgumentException("请先保存业务资料");return ((ObjectNode)node).deepCopy();}
 static Project with(Project p,JsonNode value){return new Project(p.company(),p.plan(),p.theme(),p.languages(),p.sourceLanguage(),p.pages(),new WorkspaceData(p.workspace().sales(),p.workspace().goal(),value),p.design(),p.websites(),p.site(),p.system());}
}
