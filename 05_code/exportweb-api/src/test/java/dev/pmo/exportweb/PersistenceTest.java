package dev.pmo.exportweb;
import static org.junit.jupiter.api.Assertions.*;
import java.util.*;
import org.junit.jupiter.api.*;
import org.junit.jupiter.api.condition.EnabledIfEnvironmentVariable;
import org.flywaydb.core.Flyway;
import org.mybatis.spring.SqlSessionFactoryBean;
import org.mybatis.spring.SqlSessionTemplate;
import org.springframework.jdbc.datasource.DriverManagerDataSource;
import org.springframework.jdbc.datasource.DataSourceTransactionManager;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.transaction.support.TransactionTemplate;
import org.springframework.web.server.ResponseStatusException;
import tools.jackson.databind.ObjectMapper;

@EnabledIfEnvironmentVariable(named="EXPORTWEB_TEST_DATABASE_URL",matches="jdbc:postgresql://.*")
class PersistenceTest {
 static final String HOST_TAG=UUID.randomUUID().toString();
 static TransactionTemplate tx;static JdbcTemplate jdbc;static ProjectStore store;static ProjectMapper mapper;static InquiryMapper inquiries;static Jobs jobs;static MediaObjects media;
 static OpsAccess.Scope a=new OpsAccess.Scope(901,UUID.randomUUID(),UUID.randomUUID(),"a."+HOST_TAG+".exportweb.test");
 static OpsAccess.Scope b=new OpsAccess.Scope(901,UUID.randomUUID(),UUID.randomUUID(),"b."+HOST_TAG+".exportweb.test");
 @BeforeAll static void setup()throws Exception{
  var ds=new DriverManagerDataSource(System.getenv("EXPORTWEB_TEST_DATABASE_URL"),System.getenv("EXPORTWEB_TEST_DATABASE_USER"),System.getenv("EXPORTWEB_TEST_DATABASE_PASSWORD"));
  jdbc=new JdbcTemplate(ds);
  assertEquals(18,jdbc.queryForObject("select current_setting('server_version_num')::int / 10000",Integer.class));
  assertFalse(jdbc.queryForObject("select rolsuper or rolbypassrls from pg_roles where rolname=current_user",Boolean.class));
  Flyway.configure().dataSource(ds).locations("classpath:db/migration").load().migrate();
  var factory=new SqlSessionFactoryBean();factory.setDataSource(ds);
  var configuration=new org.apache.ibatis.session.Configuration();configuration.addMapper(ProjectMapper.class);configuration.addMapper(InquiryMapper.class);factory.setConfiguration(configuration);
  mapper=new SqlSessionTemplate(factory.getObject()).getMapper(ProjectMapper.class);
  inquiries=new SqlSessionTemplate(factory.getObject()).getMapper(InquiryMapper.class);
  media=org.mockito.Mockito.mock(MediaObjects.class);var mediaFiles=new java.util.concurrent.ConcurrentHashMap<String,byte[]>();
  org.mockito.Mockito.doAnswer(call->{mediaFiles.put(call.getArgument(0),((byte[])call.getArgument(2)).clone());return null;}).when(media).put(org.mockito.ArgumentMatchers.anyString(),org.mockito.ArgumentMatchers.anyString(),org.mockito.ArgumentMatchers.any(byte[].class));
  org.mockito.Mockito.doAnswer(call->{mediaFiles.put(call.getArgument(0),((byte[])call.getArgument(2)).clone());return null;}).when(media).replace(org.mockito.ArgumentMatchers.anyString(),org.mockito.ArgumentMatchers.anyString(),org.mockito.ArgumentMatchers.any(byte[].class));
  org.mockito.Mockito.when(media.get(org.mockito.ArgumentMatchers.anyString())).thenAnswer(call->mediaFiles.get(call.getArgument(0)));
  store=new ProjectStore(mapper,new ObjectMapper(),media);tx=new TransactionTemplate(new DataSourceTransactionManager(ds));
  jobs=new Jobs(jdbc,new DataSourceTransactionManager(ds),mapper,new ObjectMapper());
 }
 @Test void websiteInquiriesAreIndependentIdempotentAndOrganizationScoped(){
  var owner=new OpsAccess.Scope(9501,UUID.randomUUID(),UUID.randomUUID(),"inquiry."+HOST_TAG+".exportweb.test");
  tx.execute(t->store.read(owner));tx.execute(t->store.save(owner,0,ProjectTest.sample()));tx.execute(t->store.publish(owner,1));
  var service=new InquiryService(store,mapper,inquiries,new ObjectMapper(),10);var id=UUID.randomUUID();
  var input=new InquiryService.Input(id,"Buyer","buyer@example.test","Buyer Inc","US","Request","Please provide a quotation","");
  tx.executeWithoutResult(t->service.accept(owner,input,"synthetic-session"));tx.executeWithoutResult(t->service.accept(owner,input,"synthetic-session"));
  assertEquals(1,tx.execute(t->service.list(owner,0)).size());assertEquals(1,tx.execute(t->store.read(owner)).revision());
  assertThrows(ResponseStatusException.class,()->tx.execute(t->service.read(b,id)));
  tx.executeWithoutResult(t->service.update(owner,id,1,"HANDLED","Responded separately"));
  assertThrows(ResponseStatusException.class,()->tx.executeWithoutResult(t->service.update(owner,id,1,"NEW","stale")));
 }
 @Test void businessWorkspaceAndNewJobsKeepOrganizationAndRevisionBoundaries(){
  var owner=new OpsAccess.Scope(9310,UUID.randomUUID(),UUID.randomUUID(),"business."+HOST_TAG+".exportweb.test");var outsider=new OpsAccess.Scope(9310,UUID.randomUUID(),UUID.randomUUID(),"other."+HOST_TAG+".exportweb.test");
  var p=ProjectTest.sample();var data=new ObjectMapper().readTree("""
   {"articles":[{"id":"article-a","siteId":"site-a","title":"零件采购","keywords":"metal","audience":"buyers","facts":"提供图纸定制","language":"en","body":"Original body","history":[]}]}
   """);
  var original=new Project(p.company(),p.plan(),p.theme(),p.languages(),p.sourceLanguage(),p.pages(),new WorkspaceData(List.of(),null,data),p.design(),p.websites());tx.execute(t->store.read(owner));var saved=tx.execute(t->store.save(owner,0,original));
  assertEquals("Original body",tx.execute(t->store.read(owner)).project().workspace().business().path("articles").get(0).path("body").asText());
  assertNull(tx.execute(t->store.read(outsider)).project().workspace().business());
  assertThrows(ResponseStatusException.class,()->tx.execute(t->store.save(owner,0,original.withPlan("stale"))));
  UUID id=UUID.randomUUID();var ticket=jobs.create(owner,UUID.randomUUID(),id,"ARTICLE",saved.revision(),Map.of("siteId","site-a","articleId","article-a"));assertEquals("QUEUED",ticket.status());assertThrows(ResponseStatusException.class,()->jobs.read(outsider,id));jobs.cancel(owner,id);
  assertThrows(ResponseStatusException.class,()->jobs.create(owner,UUID.randomUUID(),UUID.randomUUID(),"PROSPECT",saved.revision(),Map.of("taskId","task-1")));
 }
 @Test void orgIsolationOptimisticSaveAndPublishedSnapshot(){
  var original=tx.execute(s->store.read(a));assertEquals(0,original.revision());
  var saved=tx.execute(s->store.save(a,0,ProjectTest.sample()));assertEquals(1,saved.revision());
  assertThrows(ResponseStatusException.class,()->tx.execute(s->store.save(a,0,ProjectTest.sample().withPlan("stale"))));
  var other=tx.execute(s->store.read(b));assertTrue(other.project().pages().isEmpty());
  tx.execute(s->{mapper.scope(b.tenantId(),b.orgId());assertNull(mapper.read(a.tenantId(),a.orgId()));return null;});
  assertEquals(0,jdbc.queryForObject("select count(*) from exportweb_project",Integer.class));
  assertEquals("https://a."+HOST_TAG+".exportweb.test/",tx.execute(s->store.publish(a,1)));
  tx.execute(s->store.save(a,1,ProjectTest.sample().withPlan("new draft")));
  assertEquals("",tx.execute(s->store.published(a)).plan()); // Publication excludes internal business plans.
  assertEquals(ProjectTest.sample().cleaned().pages(),tx.execute(s->store.published(a)).pages());
  assertThrows(ResponseStatusException.class,()->tx.execute(s->store.published(b)));
  tx.execute(s->{mapper.scope(a.tenantId(),a.orgId());assertEquals(2,jdbc.queryForObject("select count(*) from exportweb_revision",Integer.class));return null;});
 }
 @Test void incompleteLanguageCannotPublish(){
  var scope=new OpsAccess.Scope(902,UUID.randomUUID(),UUID.randomUUID(),"incomplete."+HOST_TAG+".exportweb.test");
  tx.execute(s->store.read(scope));
  var draft=ProjectTest.sample().withPages(List.of(new Project.Page("hero","","首页","/",Map.of("zh-Hans",new Project.Content("首页","<p>原文</p>")))));
  tx.execute(s->store.save(scope,0,draft));
  assertThrows(IllegalArgumentException.class,()->tx.execute(s->store.publish(scope,1)));
  assertThrows(ResponseStatusException.class,()->tx.execute(s->store.published(scope)));
 }
 @Test void changedSourceInvalidatesOldTranslationButRestoreKeepsTheSavedTranslation(){
  var owner=new OpsAccess.Scope(9302,UUID.randomUUID(),UUID.randomUUID(),"source."+HOST_TAG+".exportweb.test");var original=ProjectTest.sample();
  tx.execute(s->store.read(owner));tx.execute(s->store.save(owner,0,original));long version=tx.execute(s->store.saveWebsiteVersion(owner,1,"原稿及译文"));
  var page=original.pages().getFirst();var content=new LinkedHashMap<>(page.content());content.put("zh-Hans",new Project.Content("新标题","<p>新原文</p>"));
  var changed=tx.execute(s->store.save(owner,1,original.withPages(List.of(page.withContent(content)))));assertFalse(changed.project().pages().getFirst().content().containsKey("en"));
  var restored=tx.execute(s->store.restoreWebsiteVersion(owner,2,version));assertEquals("<p>English content</p>",restored.project().pages().getFirst().content().get("en").html());
 }
 @Test void multipleWebsitesPublishSeparatelyAndCannotExposeOtherDrafts(){
  var org=UUID.randomUUID();var a=new OpsAccess.Scope(904,org,UUID.randomUUID(),"first."+HOST_TAG+".exportweb.test");var b=new OpsAccess.Scope(904,org,UUID.randomUUID(),"second."+HOST_TAG+".exportweb.test");
  var p=ProjectTest.sample();var doc=new Websites.Document(p.theme(),p.languages(),p.sourceLanguage(),p.pages(),p.design());
  var sites=List.of(new Websites.Site("first","First",a.host(),"shared",null,doc),new Websites.Site("second","Second",b.host(),"shared",null,doc));
  var first=new Project(p.company(),p.plan(),p.theme(),p.languages(),p.sourceLanguage(),p.pages(),p.workspace(),p.design(),new Websites("first",sites));
  tx.execute(s->store.read(a));tx.execute(s->store.save(a,0,first));tx.execute(s->store.publish(a,1));
  var second=new Project(p.company(),p.plan(),"T04",p.languages(),p.sourceLanguage(),p.pages(),p.workspace(),new Project.Design("single","static"),new Websites("second",sites));
  tx.execute(s->store.save(a,1,second));assertThrows(IllegalArgumentException.class,()->tx.execute(s->store.publish(a,2)));tx.execute(s->store.publish(b,2));
  assertEquals("T02",tx.execute(s->store.published(a)).theme());assertEquals("T04",tx.execute(s->store.published(b)).theme());assertTrue(tx.execute(s->store.published(b)).websites().items().isEmpty());
  assertEquals("https://second."+HOST_TAG+".exportweb.test/",tx.execute(s->store.read(a)).publicUrl());
 }
 @Test @EnabledIfEnvironmentVariable(named="EXPORTWEB_REAL_LOCAL_INFRA",matches="true")
 void realMinioAssetsRespectOrganizationAndPublishedSnapshot(){
  var media=new MediaObjects(System.getenv("EXPORTWEB_MEDIA_ENDPOINT"),System.getenv("EXPORTWEB_MEDIA_BUCKET"),System.getenv("EXPORTWEB_MEDIA_REGION"),System.getenv("EXPORTWEB_MEDIA_CREDENTIALS_FILE"));
  var realStore=new ProjectStore(mapper,new ObjectMapper(),media);
  var owner=new OpsAccess.Scope(9302,UUID.randomUUID(),UUID.randomUUID(),"media."+HOST_TAG+".exportweb.test");
  byte[] bytes=new byte[]{(byte)137,80,78,71,13,10,26,10,0,0,0,0};
  try{
   tx.execute(s->realStore.read(owner));
   String url=tx.execute(s->realStore.asset(owner,bytes,"image/png","logo.png"));UUID id=UUID.fromString(url.substring(url.lastIndexOf('/')+1));
   assertArrayEquals(bytes,(byte[])tx.execute(s->realStore.asset(owner,id,false)).get("content"));
   assertThrows(ResponseStatusException.class,()->tx.execute(s->realStore.asset(b,id,false)));
   assertThrows(ResponseStatusException.class,()->tx.execute(s->realStore.asset(owner,id,true)));
   Project sample=ProjectTest.sample();var pages=sample.pages().stream().map(page->{
    var content=new LinkedHashMap<String,Project.Content>();page.content().forEach((lang,value)->content.put(lang,new Project.Content(value.title(),value.html()+"<img src=\""+url+"\" alt=\"local test\">",value.menuTitle())));
    return new Project.Page(page.id(),page.parent(),page.title(),page.path(),content);
   }).toList();
   tx.execute(s->realStore.save(owner,0,sample.withPages(pages)));tx.execute(s->realStore.publish(owner,1));
   assertArrayEquals(bytes,(byte[])tx.execute(s->realStore.asset(owner,id,true)).get("content"));
   byte[] replacement=bytes.clone();replacement[11]=9;assertEquals(url,tx.execute(s->realStore.asset(owner,replacement,"image/png","logo.png")));assertArrayEquals(replacement,(byte[])tx.execute(s->realStore.asset(owner,id,true)).get("content"));
  }finally{media.close();}
 }
 @Test void tasksAreIdempotentScopedAndCancellationPreventsResultCommit(){
  var scope=new OpsAccess.Scope(903,UUID.randomUUID(),UUID.randomUUID(),"jobs."+HOST_TAG+".exportweb.test");
  var id=UUID.randomUUID();var person=UUID.randomUUID();var input=Map.of("url","https://supplier.example/","details",true);
  var first=jobs.create(scope,person,id,"IMPORT",0,input);
  assertEquals(first,jobs.create(scope,person,id,"IMPORT",0,input));
  assertThrows(ResponseStatusException.class,()->jobs.read(a,id));
  assertThrows(ResponseStatusException.class,()->jobs.create(scope,person,UUID.randomUUID(),"IMPORT",0,input));
  var work=new Jobs.Work(scope.tenantId(),scope.orgId(),id);assertNotNull(jobs.claim(work));assertNull(jobs.claim(work));
  jobs.cancel(scope,id);
  assertThrows(java.util.concurrent.CancellationException.class,()->jobs.complete(work,()->{fail("cancelled work must never mutate project");return Map.of();}));
  assertEquals("CANCELLED",jobs.read(scope,id).status());
  var next=UUID.randomUUID();jobs.create(scope,person,next,"IMPORT",0,input);
  var nextWork=new Jobs.Work(scope.tenantId(),scope.orgId(),next);assertNotNull(jobs.claim(nextWork));
  jobs.complete(nextWork,()->Map.of("pages",List.of("synthetic")));
  assertEquals("SUCCEEDED",jobs.read(scope,next).status());
 }
 @Test void savedWebsiteVersionsRestoreOnlyDraftAndStayIsolatedByOrganizationAndSite(){
  var owner=new OpsAccess.Scope(9401,UUID.randomUUID(),UUID.randomUUID(),"versions."+HOST_TAG+".exportweb.test");
  tx.execute(s->store.read(owner));var initial=tx.execute(s->store.save(owner,0,ProjectTest.sample()));
  long number=tx.execute(s->store.saveWebsiteVersion(owner,1,"第一次保存"));assertEquals(1,number);
  tx.execute(s->store.publish(owner,1));var changed=initial.project().withPages(List.of(new Project.Page("hero","","修改标题","/",Map.of("zh-Hans",new Project.Content("改后","<p>改后正文</p>"),"en",new Project.Content("Changed","<p>Changed body</p>")))));
  tx.execute(s->store.save(owner,1,changed));assertThrows(ResponseStatusException.class,()->tx.execute(s->store.restoreWebsiteVersion(owner,1,number)));
  var restored=tx.execute(s->store.restoreWebsiteVersion(owner,2,number));assertEquals(3,restored.revision());assertEquals(initial.project().pages(),restored.project().pages());
  assertEquals(initial.project().pages(),tx.execute(s->store.published(owner)).pages());assertEquals(3,tx.execute(s->store.websiteVersions(owner,0)).size());
  var snapshot=(Project)tx.execute(s->store.websiteVersion(owner,number)).get("document");assertTrue(snapshot.websites().items().isEmpty());assertEquals("",snapshot.plan());assertEquals(initial.project().pages(),snapshot.pages());
  assertTrue(tx.execute(s->store.websiteVersions(b,0)).isEmpty());assertThrows(ResponseStatusException.class,()->tx.execute(s->store.websiteVersion(b,number)));
  var p=restored.project();var second=new Websites.Site("second","Second","","shared",null,new Websites.Document(p.theme(),p.languages(),p.sourceLanguage(),p.pages(),p.design(),p.site()));
  tx.execute(s->store.save(owner,3,new Project(p.company(),p.plan(),p.theme(),p.languages(),p.sourceLanguage(),p.pages(),p.workspace(),p.design(),new Websites("second",List.of(second)),p.site(),p.system())));
  assertTrue(tx.execute(s->store.websiteVersions(owner,0)).isEmpty());assertThrows(ResponseStatusException.class,()->tx.execute(s->store.websiteVersion(owner,number)));
 }
 @Test void namedMediaRetainsItsReferenceAndExportContainsRealFilesOnlyForSelectedLanguages()throws Exception{
  var owner=new OpsAccess.Scope(9402,UUID.randomUUID(),UUID.randomUUID(),"export."+HOST_TAG+".exportweb.test");tx.execute(s->store.read(owner));
  byte[] original={(byte)137,80,78,71,13,10,26,10,0,0,0,0};byte[] replacement=original.clone();replacement[11]=1;
  String url=tx.execute(s->store.asset(owner,original,"image/png","logo.png"));assertEquals(url,tx.execute(s->store.asset(owner,replacement,"image/png","logo.png")));UUID id=UUID.fromString(url.substring(15));assertArrayEquals(replacement,(byte[])tx.execute(s->store.asset(owner,id,false)).get("content"));
  assertThrows(ResponseStatusException.class,()->tx.execute(s->store.asset(b,id,false)));
  var p=ProjectTest.sample();var config=new SiteSettings(url,new SiteSettings.Contacts("819012345678","sales@example.test","+819012345678","https://example.test/contact"),List.of("en"),"external",Map.of("hero",new SiteSettings.Presentation("tabs",true,2)));
  var configured=new Project(p.company(),p.plan(),p.theme(),p.languages(),p.sourceLanguage(),p.pages(),p.workspace(),p.design(),p.websites(),config,p.system());tx.execute(s->store.save(owner,0,configured));
  byte[] bytes=tx.execute(s->{try{return new WebsitePackage(store,new ObjectMapper()).create(owner,1);}catch(java.io.IOException ex){throw new RuntimeException(ex);}});
  var files=new HashMap<String,byte[]>();try(var zip=new java.util.zip.ZipInputStream(new java.io.ByteArrayInputStream(bytes))){for(var entry=zip.getNextEntry();entry!=null;entry=zip.getNextEntry())files.put(entry.getName(),zip.readAllBytes());}
  String mediaFile=files.keySet().stream().filter(n->n.startsWith("assets/")&&n.endsWith(".png")).findFirst().orElseThrow();assertArrayEquals(replacement,files.get(mediaFile));assertTrue(files.containsKey("site-theme.css"));assertTrue(files.containsKey("site-view.js"));assertFalse(files.containsKey("zh-Hans/hero.html"));
  String html=new String(files.get("en/hero.html"),java.nio.charset.StandardCharsets.UTF_8);assertTrue(html.contains("../"+mediaFile));assertTrue(html.contains("mailto:sales@example.test"));assertTrue(html.contains("https://wa.me/819012345678"));assertFalse(html.contains("/api/v1/"));assertFalse(html.contains("中文内容"));
  assertTrue(new String(files.get("publication.json"),java.nio.charset.StandardCharsets.UTF_8).contains("\"deployed\":false"));assertThrows(ResponseStatusException.class,()->tx.execute(s->store.published(owner)));
  var doc=new Websites.Document(p.theme(),p.languages(),p.sourceLanguage(),p.pages(),p.design(),config);var second=new Websites.Site("another","Another","","shared",null,doc);
  tx.execute(s->store.save(owner,1,new Project(p.company(),p.plan(),p.theme(),p.languages(),p.sourceLanguage(),p.pages(),p.workspace(),p.design(),new Websites("another",List.of(second)),config,p.system())));
  assertNotEquals(url,tx.execute(s->store.asset(owner,original,"image/png","logo.png")));
 }
}
