package dev.pmo.exportweb;
import java.util.*;
public record SystemSettings(Map<String,Account> socialAccounts,List<String> channels,List<Contact> contacts){
 public SystemSettings {socialAccounts=socialAccounts==null?Map.of():Map.copyOf(socialAccounts);channels=channels==null?List.of():List.copyOf(channels);contacts=contacts==null?List.of():List.copyOf(contacts);}
 public SystemSettings(Map<String,Account> socialAccounts,List<String> channels){this(socialAccounts,channels,null);}
 public record Contact(String id,String type,String label,String value){
  public String href(){return switch(type){case "whatsapp"->"https://wa.me/"+value.replaceAll("\\D","");case "email"->"mailto:"+value;case "phone"->"tel:"+value.replaceAll("[^+0-9]","");default->value;};}
  void validate(){
   if(id==null||!id.matches("[a-zA-Z0-9-]{1,80}")||type==null||!Set.of("whatsapp","email","phone","telegram","line","wechat","messenger","signal","viber","link").contains(type)||label==null||label.isBlank()||label.length()>180||value==null||value.isBlank()||value.length()>2000)throw new IllegalArgumentException("请填写通讯类型、名称与有效地址");
   new SiteSettings.Contacts(type.equals("whatsapp")?value:"",type.equals("email")?value:"",type.equals("phone")?value:"",Set.of("whatsapp","email","phone").contains(type)?"":value).validate();
  }
 }
 public List<Contact> selected(SiteSettings site){
  if(site.communicationIds()!=null)return contacts.stream().filter(c->site.communicationIds().contains(c.id())).toList();
  var c=site.communications();var list=new ArrayList<Contact>();
  if(!c.whatsapp().isEmpty())list.add(new Contact("legacy-whatsapp","whatsapp","WhatsApp",c.whatsapp()));
  if(!c.email().isEmpty())list.add(new Contact("legacy-email","email","邮箱",c.email()));
  if(!c.phone().isEmpty())list.add(new Contact("legacy-phone","phone","电话",c.phone()));
  if(!c.link().isEmpty())list.add(new Contact("legacy-link","link","在线咨询",c.link()));return list;
 }
 public record Account(String account,String profile){}
 public static SystemSettings empty(){return new SystemSettings(null,null);}
 public void validate(){
  var contactIds=new HashSet<String>();for(var contact:contacts){if(contact==null||!contactIds.add(contact.id()))throw new IllegalArgumentException("通讯标识重复");contact.validate();}
  var ids=Set.of("linkedin","youtube","facebook","instagram","tiktok","x","line","wechat-video","wechat","douyin","red","bilibili");
  if(!ids.containsAll(channels)||new HashSet<>(channels).size()!=channels.size()||!ids.containsAll(socialAccounts.keySet()))throw new IllegalArgumentException("社媒平台无效");
  socialAccounts.forEach((id,a)->{if(a==null||a.account()==null||a.account().length()>180||a.profile()==null||a.profile().length()>2000)throw new IllegalArgumentException("社媒账号资料无效");if(!a.profile().isBlank()){try{var u=java.net.URI.create(a.profile());if(!"https".equals(u.getScheme())||u.getHost()==null||u.getUserInfo()!=null)throw new IllegalArgumentException();}catch(Exception ex){throw new IllegalArgumentException("账号主页请输入 HTTPS 地址");}}});
 }
}
