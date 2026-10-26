package dev.pmo.exportweb;

import java.util.*;
import org.jsoup.nodes.Element;
import org.jsoup.nodes.TextNode;

/** Converts confident image/copy layout lists, including old already-sanitized imports. */
final class ImportedContent {
 private static boolean hasText(Element e){return e.childNodes().stream().anyMatch(n->n instanceof TextNode text&&!text.isBlank());}
 private static List<Element> parts(Element item){
  if(!item.normalName().equals("li")||item.childrenSize()!=1||hasText(item))return null;
  var nested=item.child(0);if(!Set.of("ul","ol").contains(nested.normalName())||nested.childrenSize()!=2)return null;
  var media=nested.child(0);var copy=nested.child(1);
  if(!media.normalName().equals("li")||!copy.normalName().equals("li")||media.select("img,.media-placeholder").size()!=1||!copy.select("img,video,iframe,.media-placeholder").isEmpty())return null;
  var withoutMedia=media.clone();withoutMedia.select("img,.media-placeholder").remove();
  var link=media.selectFirst("a[href]");var title=copy.selectFirst("a[href]");
  if(!withoutMedia.text().isBlank()||link==null||title==null||title.text().isBlank()||!link.attr("href").equals(title.attr("href"))||!link.attr("href").matches("^(https://|/(?!/)|#).+"))return null;
  return List.of(media,copy);
 }
 static void normalize(Element root){
  for(var list:root.select("ul,ol")){
   if(list.parent()==null||list.childrenSize()==0||hasText(list))continue;
   var rows=list.children().stream().map(ImportedContent::parts).toList();if(rows.stream().anyMatch(Objects::isNull))continue;
   var group=new Element("div").addClass("content-products");
   for(var pair:rows){
    var row=group.appendElement("div").attr("class","rich-columns rich-columns-2 content-product");
    for(var source:pair)row.appendElement("div").addClass("rich-column").html(source.html());
    var copy=row.child(1);var title=copy.selectFirst("a[href]");
    if(title!=null&&title.parent()==copy){var heading=new Element("h3");title.replaceWith(heading);heading.appendChild(title);}
   }
   var parent=list.parent();var label=parent.previousElementSibling();
   if(parent.childrenSize()==1&&label!=null&&label.normalName().equals("div")&&label.childrenSize()==1&&label.child(0).normalName().equals("a")&&label.text().equals(label.child(0).text()))label.tagName("h2");
   list.replaceWith(group);
  }
  for(var list:root.select("ul,ol")){
   var items=list.children();if(items.isEmpty()||items.stream().anyMatch(n->!n.normalName().equals("li"))||list.closest(".content-product")!=null)continue;
   boolean gallery=items.stream().allMatch(ImportedContent::imageOnly);
   boolean cards=!gallery&&items.stream().allMatch(n->{var image=n.selectFirst("img,.media-placeholder");var link=image==null?null:image.closest("a[href]");var title=n.select("a[href]").stream().filter(a->!a.text().isBlank()).findFirst().orElse(null);return n.select("img,.media-placeholder").size()==1&&n.select("ul,ol").isEmpty()&&link!=null&&title!=null&&link.attr("href").equals(title.attr("href"))&&n.selectFirst("p")!=null;});
   if(!gallery&&!cards)continue;
   var group=new Element("div").addClass(gallery?"content-gallery":"content-card-grid");
   for(var item:items){var box=group.appendElement(gallery?"figure":"div").html(item.html());if(cards){box.addClass("content-card");var title=box.select("a[href]").stream().filter(a->!a.text().isBlank()).findFirst().orElse(null);if(title!=null&&title.parent()==box){var h=new Element("h3");title.replaceWith(h);h.appendChild(title);}}}
   list.replaceWith(group);
  }
  for(var container:root.select("div,section")){
   if(container.is(".content-product,.content-card,.content-media-text")||container.childrenSize()!=2)continue;
   var media=container.child(0);var copy=container.child(1);
   if(!media.is("div,figure")||!copy.is("div,section")||!imageOnly(media)||!copy.select("img,video,iframe").isEmpty()||copy.selectFirst("h2,h3")==null||copy.selectFirst("p")==null)continue;
   container.addClass("rich-columns").addClass("rich-columns-2").addClass("content-media-text");media.addClass("rich-column");copy.addClass("rich-column");
  }
  for(var table:root.select("table")){
   var wrapper=table.parent();if(!wrapper.normalName().equals("figure")){wrapper=new Element("figure");table.replaceWith(wrapper);wrapper.appendChild(table);}wrapper.addClass("table").addClass("content-specs");
  }
  for(var link:root.select("a[href]")){
   if(link.text().isBlank())continue;
   boolean named=link.classNames().stream().anyMatch(c->c.matches("(?i)(btn|button|btn[-_].+|button[-_].+|view[-_]?more|read[-_]?more|more)"));
   boolean standalone=link.parent().is(".rich-column,.content-card")||link.parent().normalName().equals("p")&&link.parent().text().equals(link.text());
   if(named||link.closest(".content-product,.content-card")!=null&&link.closest("h2,h3,h4")==null&&standalone&&link.selectFirst("img")==null)link.addClass("content-button");
  }
 }
 private static boolean imageOnly(Element node){if(node.select("img,.media-placeholder").size()!=1)return false;var copy=node.clone();copy.select("img,.media-placeholder,figcaption").remove();return copy.text().isBlank();}
}
