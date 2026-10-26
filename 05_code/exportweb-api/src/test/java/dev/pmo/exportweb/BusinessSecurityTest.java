package dev.pmo.exportweb;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.*;
import static org.springframework.security.test.web.servlet.setup.SecurityMockMvcConfigurers.springSecurity;
import java.util.*;
import org.junit.jupiter.api.*;
import org.springframework.context.annotation.*;
import org.springframework.web.context.support.AnnotationConfigWebApplicationContext;
import org.springframework.mock.web.MockServletContext;
import org.springframework.test.web.servlet.*;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.web.servlet.config.annotation.EnableWebMvc;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.oauth2.client.registration.*;
import org.springframework.security.oauth2.core.AuthorizationGrantType;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;

class BusinessSecurityTest {
 AnnotationConfigWebApplicationContext context;MockMvc mvc;OpsAccess access;ProjectStore store;
 @Configuration @EnableWebMvc @EnableWebSecurity
 static class Config{
  @Bean OpsAccess access(){return mock(OpsAccess.class);}
  @Bean ProjectStore store(){return mock(ProjectStore.class);}
  @Bean Jobs jobs(){return mock(Jobs.class);}
  @Bean WebsitePackage websitePackage(){return mock(WebsitePackage.class);}
  @Bean BusinessApi api(OpsAccess a,ProjectStore s,Jobs j){return new BusinessApi(a,s,j);}
  @Bean ClientRegistrationRepository clients(){return new InMemoryClientRegistrationRepository(ClientRegistration.withRegistrationId("exportweb").clientId("test").clientSecret("synthetic").authorizationGrantType(AuthorizationGrantType.AUTHORIZATION_CODE).redirectUri("https://identity.example/callback").authorizationUri("https://identity.example/authorize").tokenUri("https://identity.example/token").jwkSetUri("https://identity.example/jwks").userInfoUri("https://identity.example/user").userNameAttributeName("sub").scope("openid").build());}
 }
 @BeforeEach void setup(){
  context=new AnnotationConfigWebApplicationContext();context.setAllowBeanDefinitionOverriding(false);context.setServletContext(new MockServletContext());context.register(Config.class,Security.class);context.refresh();
  mvc=MockMvcBuilders.webAppContextSetup(context).apply(springSecurity()).build();access=context.getBean(OpsAccess.class);store=context.getBean(ProjectStore.class);
 }
 @AfterEach void close(){context.close();}
 @Test void unauthenticatedApiAndMissingCsrfCannotWrite()throws Exception{
  mvc.perform(get("/api/v1/project")).andExpect(status().isUnauthorized());
  mvc.perform(post("/api/v1/publications").with(oidcLogin()).header("If-Match",1)).andExpect(status().isForbidden());verifyNoInteractions(store);
  for(String endpoint:List.of("/api/v1/articles/generate","/api/v1/prospecting/run","/api/v1/website-versions","/api/v1/website-versions/1/restore","/api/v1/website-export","/api/v1/website-edit"))mvc.perform(post(endpoint).with(oidcLogin()).header("If-Match",1)).andExpect(status().isForbidden());
 }
 @Test void revokedOrCrossOrganizationAccessCannotPublish()throws Exception{
  when(access.authorize(anyString(),any(),nullable(UUID.class))).thenThrow(new ResponseStatusException(HttpStatus.FORBIDDEN,"没有该组织权限"));
  mvc.perform(post("/api/v1/publications").with(oidcLogin()).with(csrf()).header("If-Match",1)).andExpect(status().isForbidden());verifyNoInteractions(store);
 }
 @Test void publishingUsesResolvedOrganizationAndOptimisticRevision()throws Exception{
  var scope=new OpsAccess.Scope(31,UUID.randomUUID(),UUID.randomUUID(),"org.exportweb.test");
  when(access.authorize(anyString(),any(),nullable(UUID.class))).thenReturn(scope);when(access.resolve(scope.host())).thenReturn(scope);when(store.publish(scope,7)).thenReturn("https://org.exportweb.test/");
  mvc.perform(post("/api/v1/publications").with(oidcLogin()).with(csrf()).header("If-Match",7)).andExpect(status().isOk()).andExpect(jsonPath("$.url").value("https://org.exportweb.test/"));verify(store).publish(scope,7);
 }
 @Test void mediaRequiresAuthenticationAndAllResponsesHaveCsp()throws Exception{
  mvc.perform(get("/api/v1/assets/"+UUID.randomUUID())).andExpect(status().isUnauthorized()).andExpect(header().string("Content-Security-Policy",org.hamcrest.Matchers.containsString("object-src 'none'")));
 }
 @Test void selectedWebsiteDomainMustBelongToTheSameOrganization()throws Exception{
  var scope=new OpsAccess.Scope(31,UUID.randomUUID(),UUID.randomUUID(),"shared.exportweb.test");
  when(access.authorize(anyString(),any(),nullable(UUID.class))).thenReturn(scope);
  when(access.resolve("other.exportweb.test")).thenReturn(new OpsAccess.Scope(31,UUID.randomUUID(),UUID.randomUUID(),"other.exportweb.test"));
  mvc.perform(post("/api/v1/publications").with(oidcLogin()).with(csrf()).contentType("application/json").content("{\"host\":\"other.exportweb.test\"}").header("If-Match",7)).andExpect(status().isForbidden());verifyNoInteractions(store);
 }
 @Test void accountUsesTrustedEmailWhenNicknameIsMissingAndDoesNotUseSubjectAsDisplayName()throws Exception{
  mvc.perform(get("/api/v1/account").with(oidcLogin().idToken(t->t.subject("internal-person-id").claim("email","sales@example.test"))))
   .andExpect(status().isOk()).andExpect(jsonPath("$.name").value("sales@example.test")).andExpect(jsonPath("$.personId").value("internal-person-id"));
  mvc.perform(get("/api/v1/account").with(oidcLogin().idToken(t->t.subject("internal-person-id"))))
   .andExpect(status().isOk()).andExpect(jsonPath("$.name").value(""));
 }

 @Test void currentAccountIsAuthenticatedAndIndependentOfOrganizationAvailability()throws Exception{
  mvc.perform(get("/api/v1/account")).andExpect(status().isUnauthorized());
  mvc.perform(get("/api/v1/account").with(oidcLogin().idToken(t->t.subject("synthetic-person").claim("name","测试销售").claim("email","sales@example.test"))))
   .andExpect(status().isOk()).andExpect(jsonPath("$.name").value("测试销售")).andExpect(jsonPath("$.login").value("sales@example.test")).andExpect(jsonPath("$.personId").value("synthetic-person")).andExpect(jsonPath("$.token").doesNotExist());
  verifyNoInteractions(access,store);
 }
 @Test void currentAccountFallsBackToTrustedClaimsWhenFullNameIsMissing()throws Exception{
  mvc.perform(get("/api/v1/account").with(oidcLogin().idToken(t->t.subject("person").claim("name"," ").claim("nickname","销售甲").claim("email","sales@example.test"))))
   .andExpect(status().isOk()).andExpect(jsonPath("$.name").value("销售甲"));
  mvc.perform(get("/api/v1/account").with(oidcLogin().idToken(t->t.subject("person").claim("email","sales@example.test"))))
   .andExpect(status().isOk()).andExpect(jsonPath("$.name").value("sales@example.test"));
  mvc.perform(get("/api/v1/account").with(oidcLogin().idToken(t->t.subject("person"))))
   .andExpect(status().isOk()).andExpect(jsonPath("$.name").value("")); // Missing display claims must not expose the internal subject as a name.
 }
 @Test void sharedOrganizationIsAutomaticAndLegacyConfirmationCannotChangeIt()throws Exception{
  UUID person=UUID.randomUUID(),org=UUID.randomUUID(),scope=UUID.randomUUID();
  when(access.membership(anyString(),any())).thenReturn(new OpsAccess.Membership(new OpsAccess.Entry(31,null,null,"localhost","Current directory name"),new OpsAccess.Choice(org,scope,"Current organization")));
  var login=oidcLogin().idToken(token->token.subject(person.toString()));
  var oldSession=new org.springframework.mock.web.MockHttpSession();oldSession.setAttribute("302.person",person.toString());oldSession.setAttribute("302.org",UUID.randomUUID());
  for(int i=0;i<2;i++)mvc.perform(get("/api/v1/session").session(oldSession).with(login)).andExpect(status().isOk()).andExpect(jsonPath("$.orgId").value(org.toString())).andExpect(jsonPath("$.organizations[0].name").value("Current organization")).andExpect(jsonPath("$.catalogCode").value(302)).andExpect(jsonPath("$.productName").value("Current directory name"));
  String body="{\"orgId\":\""+org+"\"}";
  mvc.perform(post("/api/v1/session/organization").with(login).contentType("application/json").content(body)).andExpect(status().isForbidden());
  mvc.perform(post("/api/v1/session/organization").with(login).with(csrf()).contentType("application/json").content(body)).andExpect(status().isOk()).andExpect(jsonPath("$.orgId").value(org.toString()));
  mvc.perform(post("/api/v1/session/organization").with(login).with(csrf()).contentType("application/json").content("{\"orgId\":\""+UUID.randomUUID()+"\"}")).andExpect(status().isForbidden());
  when(access.authorize(anyString(),any(),isNull())).thenReturn(new OpsAccess.Scope(31,org,scope,"localhost"));
  mvc.perform(get("/api/v1/project").session(oldSession).with(login)).andExpect(status().isOk());verify(store).read(new OpsAccess.Scope(31,org,scope,"localhost"));
 }
 @Test void personalOrRevokedAccountCannotReadSessionOrReachBusinessData()throws Exception{
  when(access.membership(anyString(),any())).thenThrow(new ResponseStatusException(HttpStatus.FORBIDDEN,"LGA 仅向已获授权的组织用户开放"));
  when(access.authorize(anyString(),any(),nullable(UUID.class))).thenThrow(new ResponseStatusException(HttpStatus.FORBIDDEN,"LGA 仅向已获授权的组织用户开放"));
  for(String endpoint:List.of("/api/v1/session","/api/v1/project","/api/v1/jobs","/api/v1/jobs/"+UUID.randomUUID(),"/api/v1/assets/"+UUID.randomUUID(),"/api/v1/preview","/api/v1/website-versions","/api/v1/website-versions/1"))mvc.perform(get(endpoint).with(oidcLogin())).andExpect(status().isForbidden());
  mvc.perform(post("/api/v1/publications").with(oidcLogin()).with(csrf()).header("If-Match",1)).andExpect(status().isForbidden());
  mvc.perform(post("/api/v1/session/organization").with(oidcLogin()).with(csrf()).contentType("application/json").content("{\"orgId\":\""+UUID.randomUUID()+"\"}")).andExpect(status().isForbidden());
  verifyNoInteractions(store,context.getBean(Jobs.class));
 }
 @Test void publishedVideoSupportsSeekingWithoutExposingPrivateAssets()throws Exception{
  var scope=new OpsAccess.Scope(31,UUID.randomUUID(),UUID.randomUUID(),"org.exportweb.test");var id=UUID.randomUUID();
  when(access.resolve(anyString())).thenReturn(scope);
  when(store.asset(scope,id,true)).thenReturn(Map.of("media_type","video/mp4","content",new byte[]{0,1,2,3,4,5}));
  mvc.perform(get("/media/"+id).header("Range","bytes=2-4")).andExpect(status().isPartialContent()).andExpect(header().string("Content-Range","bytes 2-4/6")).andExpect(content().bytes(new byte[]{2,3,4}));
  verify(store).asset(scope,id,true);
 }
}
