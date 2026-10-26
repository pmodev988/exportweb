package dev.pmo.exportweb;

import java.util.*;
import org.junit.jupiter.api.Test;
import org.springframework.security.oauth2.core.oidc.user.OidcUser;
import org.springframework.web.server.ResponseStatusException;
import tools.jackson.databind.json.JsonMapper;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

class AccessReasonTest {
 @Test void authorityReasonsRemainDistinctWithoutGrantingAnOrganization(){
  var json=JsonMapper.builder().build();var access=spy(new OpsAccess("https://identity.example.test","unused",json));
  String host="shared.example.test";UUID person=UUID.randomUUID();
  doReturn(new OpsAccess.Entry(2,null,null,host,"Current product name")).when(access).entry(host);
  var input=Map.of("personId",person.toString(),"tenantId",2L,"entryHost",host);
  var expected=Map.of("SERVICE_ENTITLEMENT_REQUIRED","订阅与席位","SERVICE_ENTITLEMENT_STALE","同步","SERVICE_SUSPENDED","停用","SERVICE_EXPIRED","到期");
  var user=mock(OidcUser.class);when(user.getSubject()).thenReturn(person.toString());
  for(var reason:expected.entrySet()){
   doReturn(json.valueToTree(Map.of("scopes",List.of(),"accessReason",reason.getKey()))).when(access).call("/internal/v2/runtime/product-scopes",input);
   var denied=assertThrows(ResponseStatusException.class,()->access.membership(host,user));
   assertEquals(403,denied.getStatusCode().value());assertTrue(denied.getReason().contains(reason.getValue()),reason.getKey());
   assertTrue(denied.getReason().contains("302"));
   var background=assertThrows(ResponseStatusException.class,()->access.authorizePerson(host,person));
   assertEquals(denied.getReason(),background.getReason());
  }
 }
 @Test void missingAndUnknownReasonsNeverEchoUpstreamDetailsOrOpenBusinessData(){
  var json=JsonMapper.builder().build();var access=spy(new OpsAccess("https://identity.example.test","unused",json));
  String host="shared.example.test";UUID person=UUID.randomUUID();
  doReturn(new OpsAccess.Entry(2,null,null,host)).when(access).entry(host);
  var input=Map.of("personId",person.toString(),"tenantId",2L,"entryHost",host);
  for(var response:List.of(Map.of("scopes",List.of()),Map.of("scopes",List.of(),"accessReason","UNEXPECTED_PRIVATE_DETAIL"))){
   doReturn(json.valueToTree(response)).when(access).call("/internal/v2/runtime/product-scopes",input);
   var denied=assertThrows(ResponseStatusException.class,()->access.authorizePerson(host,person));
   assertEquals(403,denied.getStatusCode().value());assertFalse(denied.getReason().contains("UNEXPECTED_PRIVATE_DETAIL"));
   assertTrue(denied.getReason().contains("登录账号"));
  }
 }
 @Test void priorSuccessfulAccessDoesNotHideAStaleOrRevokedEntitlement(){
  var json=JsonMapper.builder().build();var access=spy(new OpsAccess("https://identity.example.test","unused",json));
  String host="shared.example.test";UUID person=UUID.randomUUID(),org=UUID.randomUUID(),scope=UUID.randomUUID();
  doReturn(new OpsAccess.Entry(2,null,null,host)).when(access).entry(host);
  var input=Map.of("personId",person.toString(),"tenantId",2L,"entryHost",host);
  var allowed=Map.of("scopes",List.of(Map.of("subjectType","ORG","orgId",org.toString(),"runtimeScopeId",scope.toString(),"name","Organization")));
  doReturn(json.valueToTree(allowed),json.valueToTree(Map.of("scopes",List.of(),"accessReason","SERVICE_ENTITLEMENT_STALE"))).when(access).call("/internal/v2/runtime/product-scopes",input);
  assertEquals(org,access.authorizePerson(host,person,org).orgId());
  assertTrue(assertThrows(ResponseStatusException.class,()->access.authorizePerson(host,person,org)).getReason().contains("同步"));
 }
}
