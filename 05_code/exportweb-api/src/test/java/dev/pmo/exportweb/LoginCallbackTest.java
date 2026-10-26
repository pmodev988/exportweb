package dev.pmo.exportweb;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;
import static org.springframework.security.test.web.servlet.setup.SecurityMockMvcConfigurers.springSecurity;
import com.sun.net.httpserver.HttpServer;
import com.nimbusds.jose.*;
import com.nimbusds.jose.crypto.RSASSASigner;
import com.nimbusds.jose.jwk.*;
import com.nimbusds.jose.jwk.gen.RSAKeyGenerator;
import com.nimbusds.jwt.*;
import java.net.*;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.*;
import java.util.concurrent.atomic.AtomicReference;
import org.junit.jupiter.api.*;
import org.springframework.context.annotation.*;
import org.springframework.mock.web.*;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.oauth2.client.registration.*;
import org.springframework.security.oauth2.client.web.HttpSessionOAuth2AuthorizationRequestRepository;
import org.springframework.security.oauth2.core.AuthorizationGrantType;
import org.springframework.security.web.context.HttpSessionSecurityContextRepository;
import org.springframework.test.web.servlet.*;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.web.context.support.AnnotationConfigWebApplicationContext;
import org.springframework.web.servlet.config.annotation.EnableWebMvc;

/** Runs the authorization-code filters and token/JWK exchange, not oidcLogin injection. */
class LoginCallbackTest {
 static String issuer;static RSAKey key;static final AtomicReference<String> token=new AtomicReference<>();
 HttpServer identity;AnnotationConfigWebApplicationContext context;MockMvc mvc;
 @Configuration @EnableWebMvc @EnableWebSecurity
 static class Config {
  @Bean OpsAccess access(){return mock(OpsAccess.class);}
  @Bean WebsitePackage websitePackage(){return mock(WebsitePackage.class);}
  @Bean BusinessApi api(OpsAccess a){return new BusinessApi(a,mock(ProjectStore.class),mock(Jobs.class));}
  @Bean ClientRegistrationRepository clients(){return new InMemoryClientRegistrationRepository(ClientRegistration.withRegistrationId("exportweb").clientId("lga-web").clientSecret("synthetic-local-only").authorizationGrantType(AuthorizationGrantType.AUTHORIZATION_CODE).redirectUri("https://{baseHost}/login/oauth2/code/{registrationId}").authorizationUri(issuer+"/authorize").tokenUri(issuer+"/token").jwkSetUri(issuer+"/jwks").issuerUri(issuer).userNameAttributeName("sub").scope("openid","profile").build());}
 }
 @BeforeEach void start()throws Exception{
  key=new RSAKeyGenerator(2048).keyID("local-test").generate();identity=HttpServer.create(new InetSocketAddress("127.0.0.1",0),0);issuer="http://127.0.0.1:"+identity.getAddress().getPort();
  identity.createContext("/jwks",x->{byte[] body=new JWKSet(key.toPublicJWK()).toString().getBytes(StandardCharsets.UTF_8);x.getResponseHeaders().add("Content-Type","application/json");x.sendResponseHeaders(200,body.length);x.getResponseBody().write(body);x.close();});
  identity.createContext("/token",x->{x.getRequestBody().readAllBytes();byte[] body=("{\"access_token\":\"local-only\",\"token_type\":\"Bearer\",\"expires_in\":300,\"scope\":\"openid profile\",\"id_token\":\""+token.get()+"\"}").getBytes(StandardCharsets.UTF_8);x.getResponseHeaders().add("Content-Type","application/json");x.sendResponseHeaders(200,body.length);x.getResponseBody().write(body);x.close();});identity.start();
  context=new AnnotationConfigWebApplicationContext();context.setServletContext(new MockServletContext());context.register(Config.class,Security.class);context.refresh();mvc=MockMvcBuilders.webAppContextSetup(context).addFilters(new OrganizationEntryFilter(context.getBean(OpsAccess.class))).apply(springSecurity()).build();
 }
 @AfterEach void stop(){if(context!=null)context.close();if(identity!=null)identity.stop(0);}
 @Test void callbackPersistsIdentityForSubsequentPageAndApiRequests()throws Exception{
  var begin=mvc.perform(get("https://exportweb.example.test/oauth2/authorization/exportweb").param("identity_entry","https://ops.example.test")).andExpect(status().is3xxRedirection()).andReturn();
  assertTrue(begin.getResponse().getRedirectedUrl().startsWith("https://ops.example.test/authorize?"));
  verify(context.getBean(OpsAccess.class)).entry("exportweb.example.test","https://ops.example.test");
  var session=(MockHttpSession)begin.getRequest().getSession(false);assertNotNull(session);
  var authorization=(org.springframework.security.oauth2.core.endpoint.OAuth2AuthorizationRequest)session.getAttribute(HttpSessionOAuth2AuthorizationRequestRepository.class.getName()+".AUTHORIZATION_REQUEST");assertNotNull(authorization);
  assertEquals("S256",authorization.getAdditionalParameters().get("code_challenge_method"));assertEquals("https://exportweb.example.test/login/oauth2/code/exportweb",authorization.getRedirectUri());
  String person=UUID.randomUUID().toString();var claims=new JWTClaimsSet.Builder().issuer(issuer).audience("lga-web").subject(person).issueTime(Date.from(Instant.now())).expirationTime(Date.from(Instant.now().plusSeconds(120))).claim("name","本地回调测试").claim("nonce",authorization.getAdditionalParameters().get("nonce")).build();
  var jwt=new SignedJWT(new JWSHeader.Builder(JWSAlgorithm.RS256).keyID(key.getKeyID()).build(),claims);jwt.sign(new RSASSASigner(key));token.set(jwt.serialize());
  var callback=mvc.perform(get("https://exportweb.example.test/login/oauth2/code/exportweb").param("code","local-code").param("state",authorization.getState()).session(session)).andExpect(status().is3xxRedirection()).andExpect(redirectedUrl("/workspace/")).andReturn();
  var authenticated=(MockHttpSession)callback.getRequest().getSession(false);assertNotNull(authenticated);
  Object security=authenticated.getAttribute(HttpSessionSecurityContextRepository.SPRING_SECURITY_CONTEXT_KEY);assertNotNull(security,"callback must save the security context");
  // JDBC session persistence serializes this attribute between requests.
  authenticated.setAttribute(HttpSessionSecurityContextRepository.SPRING_SECURITY_CONTEXT_KEY,org.springframework.util.SerializationUtils.deserialize(org.springframework.util.SerializationUtils.serialize(security)));
  for(int i=0;i<2;i++)mvc.perform(get("https://exportweb.example.test/api/v1/account").session(authenticated)).andExpect(status().isOk()).andExpect(jsonPath("$.personId").value(person)).andExpect(jsonPath("$.name").value("本地回调测试"));
  mvc.perform(get("https://exportweb.example.test/api/v1/account")).andExpect(status().isUnauthorized());
 }
 @Test void callbackWithMissingAuthorizationSessionCannotAuthenticate()throws Exception{
  mvc.perform(get("https://exportweb.example.test/login/oauth2/code/exportweb").param("code","untrusted").param("state","unmatched")).andExpect(status().is3xxRedirection()).andExpect(redirectedUrl("/login?error"));
  mvc.perform(get("https://exportweb.example.test/api/v1/account")).andExpect(status().isUnauthorized());
 }
 @Test void noSourceUsesCanonicalIssuerAndTamperedStateCannotAuthenticate()throws Exception{
  var begin=mvc.perform(get("https://exportweb.example.test/oauth2/authorization/exportweb")).andExpect(status().is3xxRedirection()).andReturn();
  assertTrue(begin.getResponse().getRedirectedUrl().startsWith(issuer+"/authorize?"));
  var session=(MockHttpSession)begin.getRequest().getSession(false);
  mvc.perform(get("https://exportweb.example.test/login/oauth2/code/exportweb").param("code","untrusted").param("state","tampered").session(session)).andExpect(redirectedUrl("/login?error"));
  mvc.perform(get("https://exportweb.example.test/api/v1/account").session(session)).andExpect(status().isUnauthorized());
 }
}
