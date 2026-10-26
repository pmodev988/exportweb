package dev.pmo.exportweb;

import java.util.*;

/** Customer business records, stored under the existing organization/revision boundary. */
public record WorkspaceData(List<Salesperson> sales,Goal goal,tools.jackson.databind.JsonNode business) {
 public WorkspaceData(List<Salesperson> sales,Goal goal){this(sales,goal,null);}
 public WorkspaceData {business=business==null||business.isNull()?null:business;sales=sales==null?List.of():List.copyOf(sales);goal=goal==null?new Goal("","",List.of()):goal;}
 public static WorkspaceData empty(){return new WorkspaceData(List.of(),null);}
 public record Salesperson(String id,String name,List<String> marketIds,String title,String languages,String phone,String email,boolean active,String notes){}
 public record Goal(String goal,String positioning,List<String> actions){}
 private static String text(String value,int max){if(value==null||value.length()>max)throw new IllegalArgumentException("业务资料内容为空或过长");return value;}
 public WorkspaceData cleaned(){
  BusinessWorkspace.validate(business);
  if(!sales.isEmpty()||!goal.goal().isBlank()||!goal.positioning().isBlank()||!goal.actions().isEmpty())
   throw new IllegalArgumentException("销售团队与获客目标由 LGA 管理");
  return this;
 }
}
