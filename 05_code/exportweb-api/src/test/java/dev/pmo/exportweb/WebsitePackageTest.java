package dev.pmo.exportweb;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;
import java.io.*;
import java.net.*;
import java.nio.charset.StandardCharsets;
import java.nio.file.*;
import java.security.MessageDigest;
import java.util.*;
import java.util.zip.*;
import org.jsoup.Jsoup;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;
import tools.jackson.databind.ObjectMapper;

class WebsitePackageTest {
 final OpsAccess.Scope scope=new OpsAccess.Scope(1,UUID.randomUUID(),UUID.randomUUID(),"export.example.test");
 final ProjectStore store=mock(ProjectStore.class);final PublicWebsiteReader reader=mock(PublicWebsiteReader.class);final ObjectMapper json=new ObjectMapper();
 static final UUID LOGO=UUID.fromString("00000000-0000-0000-0000-000000000095");
 byte[] fixture(String name)throws IOException{try(var in=getClass().getResourceAsStream("/export/"+name)){return Objects.requireNonNull(in).readAllBytes();}}
 Project project(String media){
  var p=ProjectTest.sample();var pages=new ArrayList<Project.Page>();
  for(String id:List.of("hero","products","detail"))pages.add(new Project.Page(id,id.equals("products")?"hero":"",id.equals("hero")?"Home":id,id.equals("hero")?"/":"/"+id+"/",Map.of("zh-Hans",new Project.Content(id,"<p>中文内容</p>"+media),"en",new Project.Content(id,"<p>English content</p>"+media)),"",id.equals("detail")?"products":"",false));
  var cfg=new SiteSettings("/api/v1/assets/"+LOGO,new SiteSettings.Contacts("","sales@example.test","+819012345678",""),List.of("zh-Hans","en"),"external",Map.of());
  return new Project(p.company(),p.plan(),p.theme(),p.languages(),p.sourceLanguage(),pages,p.workspace(),p.design(),p.websites(),cfg,p.system());
 }
 WebsitePackage exporter(Project p)throws Exception{
  when(store.read(scope)).thenReturn(new ProjectStore.Snapshot(7,p,null,null));when(store.saveWebsiteVersion(eq(scope),eq(7L),anyString())).thenReturn(4L);
  when(store.asset(scope,LOGO,false)).thenReturn(Map.of("media_type","image/png","content",fixture("image.png")));
  doAnswer(i->{URI uri=i.getArgument(0);return new PublicWebsiteReader.Document(uri,fixture(uri.getPath().endsWith("webm")?"clip.webm":"image.png"));}).when(reader).media(any(),anyInt(),anyLong());
  return new WebsitePackage(store,json,reader,20971520,104857600,90);
 }
 Map<String,byte[]> unzip(byte[] bytes)throws IOException{var files=new LinkedHashMap<String,byte[]>();try(var zip=new ZipInputStream(new ByteArrayInputStream(bytes))){for(var e=zip.getNextEntry();e!=null;e=zip.getNextEntry()){assertFalse(e.getName().contains(".."));assertNull(files.put(e.getName(),zip.readAllBytes()));}}return files;}
 @Test void completeArchiveHasLocalMediaAllLanguagesNavigationContactsAndChecksums()throws Exception{
  var p=project("<img src='https://media.example.test/photo.png'><video poster='https://media.example.test/photo.png'><source src='https://media.example.test/clip.webm' type='video/webm'></video>");
  byte[] bytes=exporter(p).create(scope,7);var files=unzip(bytes);var manifest=json.readTree(files.get("publication.json"));
  assertEquals(6,manifest.path("pages").size());assertEquals(2,manifest.path("mediaFiles").asInt());assertEquals(0,manifest.path("externalMedia").size());assertFalse(manifest.path("backendIncluded").asBoolean());assertFalse(manifest.path("deployed").asBoolean());
  assertTrue(files.containsKey("README-部署说明.txt"));
  for(var entry:files.entrySet())if(!entry.getKey().equals("publication.json"))assertEquals(HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(entry.getValue())),manifest.path("sha256").path(entry.getKey()).asText());
  for(String name:files.keySet())if(name.contains("/")&&name.endsWith(".html")){
   var doc=Jsoup.parse(new String(files.get(name),StandardCharsets.UTF_8));assertEquals(0,doc.select("iframe,form").size());assertEquals(1,doc.select("a[href='mailto:sales@example.test']").size());assertEquals(1,doc.select("a[href^='tel:']").size());
   for(var e:doc.select("[src],[poster],link[href],option[value],a[href]"))for(String attr:List.of("src","poster","href","value"))if(e.hasAttr(attr)){
    String link=e.attr(attr);if(link.startsWith("mailto:")||link.startsWith("tel:")||link.startsWith("#"))continue;
    assertFalse(link.startsWith("https:"),name+" still fetches external media "+link);assertFalse(link.startsWith("/"),link);
    String resolved=Path.of(name).getParent().resolve(link).normalize().toString().replace('\\','/');assertTrue(files.containsKey(resolved),name+" -> "+link);
   }
  }
  verify(reader,times(2)).media(any(),anyInt(),anyLong());verify(store,times(1)).asset(scope,LOGO,false);
  Files.createDirectories(Path.of("target"));Files.write(Path.of("target/standalone-website-fixture.zip"),bytes);Files.write(Path.of("target/export-project-fixture.json"),json.writeValueAsBytes(p));
 }
 @Test void placeholdersEmbeddedPlayersAndMissingSourcesBlockBeforeAnyMediaDownload()throws Exception{
  for(String media:List.of("<div class='media-placeholder'>待读取</div>","<iframe src='https://www.youtube.com/embed/abc123'></iframe>","<img>")){
   reset(store,reader);var ex=assertThrows(IllegalArgumentException.class,()->exporter(project(media)).create(scope,7));assertTrue(ex.getMessage().contains("Home"));verify(reader,never()).media(any(),anyInt(),anyLong());verify(store,never()).saveWebsiteVersion(any(),anyLong(),anyString());
  }
 }
 @Test void failedDownloadsIdentifyPageAndFileWithoutSignedQueryAndCanBeRetried()throws Exception{
  var export=exporter(project("<img src='https://media.example.test/photo.png?signature=private'>"));
  doThrow(new IOException("网站返回 HTTP 404")).when(reader).media(any(),anyInt(),anyLong());
  var ex=assertThrows(IllegalArgumentException.class,()->export.create(scope,7));assertTrue(ex.getMessage().contains("Home"));assertTrue(ex.getMessage().contains("photo.png"));assertFalse(ex.getMessage().contains("private"));verify(store,never()).saveWebsiteVersion(any(),anyLong(),anyString());
  doReturn(new PublicWebsiteReader.Document(URI.create("https://media.example.test/photo.png"),fixture("image.png"))).when(reader).media(any(),anyInt(),anyLong());assertTrue(export.create(scope,7).length>0);
 }
 @Test void rejectInvalidMediaSizeTypeAndInternalAddresses()throws Exception{
  var p=project("<img src='https://media.example.test/photo.png'>");var export=exporter(p);
  byte[] tooLarge=Arrays.copyOf(fixture("image.png"),20971521);doReturn(new PublicWebsiteReader.Document(URI.create("https://media.example.test/photo.png"),tooLarge)).when(reader).media(any(),anyInt(),anyLong());assertThrows(IllegalArgumentException.class,()->export.create(scope,7));
  doReturn(new PublicWebsiteReader.Document(URI.create("https://media.example.test/photo.png"),fixture("clip.webm"))).when(reader).media(any(),anyInt(),anyLong());assertThrows(IllegalArgumentException.class,()->export.create(scope,7));
  verify(store,never()).saveWebsiteVersion(any(),anyLong(),anyString());
  assertThrows(IllegalArgumentException.class,()->new PublicWebsiteReader().media(URI.create("https://127.0.0.1/private"),1000,Long.MAX_VALUE));
  assertThrows(IOException.class,()->new PublicWebsiteReader().media(URI.create("https://localhost/private"),1000,Long.MAX_VALUE));
  assertThrows(IOException.class,()->PublicWebsiteReader.requirePublic(InetAddress.getByName("169.254.169.254")));
 }
 @Test void archiveLimitAndStaleRevisionDoNotReturnPartialZip()throws Exception{
  var p=project("");exporter(p);var limited=new WebsitePackage(store,json,reader,1024,1024,90);assertThrows(IllegalArgumentException.class,()->limited.create(scope,7));verify(store,never()).saveWebsiteVersion(any(),anyLong(),anyString());
  var export=exporter(p);assertEquals(HttpStatus.CONFLICT,assertThrows(ResponseStatusException.class,()->export.create(scope,6)).getStatusCode());
  when(store.saveWebsiteVersion(eq(scope),eq(7L),anyString())).thenThrow(new ResponseStatusException(HttpStatus.CONFLICT,"已在其他页面修改"));assertThrows(ResponseStatusException.class,()->export.create(scope,7));
 }
 @Test void orgAssetAccessFailurePropagatesWithoutSubstitutingRemoteAsset()throws Exception{
  var export=exporter(project(""));when(store.asset(scope,LOGO,false)).thenThrow(new ResponseStatusException(HttpStatus.NOT_FOUND));assertEquals(HttpStatus.NOT_FOUND,assertThrows(ResponseStatusException.class,()->export.create(scope,7)).getStatusCode());verifyNoInteractions(reader);
 }
 @Test void onlySelectedLanguagesAndVisiblePagesAreExported()throws Exception{
  var p=project("");var page=p.pages().get(2);var hidden=new Project.Page(page.id(),page.parent(),page.title(),page.path(),page.content(),page.menuCode(),page.ownerPageId(),page.detailDeleted(),page.entry(),page.kind(),page.navPlacement(),page.footerExpanded(),page.mountIds(),true);
  var cfg=new SiteSettings(p.site().logo(),p.site().communications(),List.of("en"),"external",Map.of());p=new Project(p.company(),p.plan(),p.theme(),p.languages(),p.sourceLanguage(),List.of(p.pages().getFirst(),p.pages().get(1),hidden),p.workspace(),p.design(),p.websites(),cfg,p.system());
  var files=unzip(exporter(p).create(scope,7));assertTrue(files.containsKey("en/hero.html"));assertFalse(files.containsKey("zh-Hans/hero.html"));assertFalse(files.containsKey("en/detail.html"));
 }
}
