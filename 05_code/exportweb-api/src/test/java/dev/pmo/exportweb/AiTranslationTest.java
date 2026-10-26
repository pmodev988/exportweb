package dev.pmo.exportweb;
import static org.junit.jupiter.api.Assertions.*;
import java.util.*;
import org.junit.jupiter.api.Test;
import tools.jackson.databind.ObjectMapper;
class AiTranslationTest {
 @Test void pageEditorReceivesCurrentThemeAndTheSevenSharedComponents(){
  var json=new ObjectMapper();var ai=new AiTasks("","",json){
   @Override Access access(OpsAccess.Scope scope){return new Access("synthetic","local-model");}
   @Override String complete(Access key,String instruction,Object input){var data=(Map<?,?>)input;assertEquals("T02",data.get("theme"));assertEquals(7,((tools.jackson.databind.JsonNode)data.get("contentLayouts")).size());assertTrue(instruction.contains("semantic classes"));return json.writeValueAsString(Map.of("title","产品","html","<div class='content-callout'><h3>联系</h3><a class='content-button' href='https://supplier.example/contact/'>Contact</a></div>"));}
  };
  var result=ai.edit(null,ProjectTest.sample(),"hero","沿用网站风格");assertTrue(result.pages().getFirst().content().get("zh-Hans").html().contains("content-button"));
 }
 @Test void translatesEmptyMenuTitlesAndOnlyRequestedLanguagesWithoutInventingBody(){
  var json=new ObjectMapper();var targets=new ArrayList<String>();
  var ai=new AiTasks("","",json){
   @Override Access access(OpsAccess.Scope scope){return new Access("synthetic","local-model");}
   @Override String complete(Access key,String instruction,Object input){var data=(Map<?,?>)input;targets.add(data.get("targetLanguage").toString());return json.writeValueAsString(Map.of("menuTitle","Equipment","title","Equipment","html",data.get("html")));}
  };
  var p=ProjectTest.sample().withPages(List.of(new Project.Page("equipment","","设备","/equipment/",Map.of("zh-Hans",new Project.Content("设备","")))));
  var result=ai.translate(null,p);assertEquals(List.of("en"),targets);assertEquals("Equipment",result.pages().getFirst().content().get("en").menuTitle());assertEquals("",result.pages().getFirst().content().get("en").html());
  targets.clear();ai.translate(null,result);assertTrue(targets.isEmpty());
 }
}
