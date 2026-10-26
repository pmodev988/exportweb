package dev.pmo.exportweb;

import java.util.*;
import org.junit.jupiter.api.Test;
import tools.jackson.databind.json.JsonMapper;
import org.springframework.web.server.ResponseStatusException;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

class NumericProductTest {
    @Test void identitySourceMustBeExactlyEchoedByTheSignedAuthority(){
        var json=JsonMapper.builder().build();var access=spy(new OpsAccess("https://identity.example.test","unused",json));
        String host="exportweb.example.test",source="https://ops.example.test";var body=Map.of("host",host,"identityEntry",source);
        var reply=new LinkedHashMap<String,Object>(Map.of("host",host,"catalogCode",302,"tenantId",2));reply.put("orgId",null);reply.put("runtimeScopeId",null);
        doReturn(json.valueToTree(reply)).when(access).call("/internal/v2/runtime/service-domain-resolve",body);
        assertThrows(ResponseStatusException.class,()->access.entry(host,source),"An old authority that ignores the extension must fail closed");
        reply.put("identityEntry",source);doReturn(json.valueToTree(reply)).when(access).call("/internal/v2/runtime/service-domain-resolve",body);assertNull(access.entry(host,source).orgId());
        reply.put("identityEntry","https://other.example.test");doReturn(json.valueToTree(reply)).when(access).call("/internal/v2/runtime/service-domain-resolve",body);assertThrows(ResponseStatusException.class,()->access.entry(host,source));
        for(String invalid:List.of("http://ops.example.test","https://ops.example.test/","https://user@ops.example.test","https://ops.example.test?next=bad","https://ops.example.test#bad"))assertEquals(400,assertThrows(ResponseStatusException.class,()->access.entry(host,invalid)).getStatusCode().value());
    }
    @Test void sharedEntryAutomaticallyUsesTheSoleLiveOrganizationAndCannotPublishAtTheSharedRoot(){
        var json=JsonMapper.builder().build();var access=spy(new OpsAccess("https://identity.example.test","unused",json));
        String host="l2.example.test";UUID person=UUID.randomUUID(),org=UUID.randomUUID(),scope=UUID.randomUUID();
        var entry=new LinkedHashMap<String,Object>(Map.of("host",host,"catalogCode",302,"tenantId",2));entry.put("orgId",null);entry.put("runtimeScopeId",null);
        doReturn(json.valueToTree(entry)).when(access).call("/internal/v2/runtime/service-domain-resolve",Map.of("host",host));
        var request=Map.of("personId",person.toString(),"tenantId",2L,"entryHost",host);
        doReturn(json.valueToTree(Map.of("scopes",List.of(Map.of("subjectType","ORG","orgId",org.toString(),"runtimeScopeId",scope.toString(),"name","Same company name"))))).when(access).call("/internal/v2/runtime/product-scopes",request);
        assertNull(access.entry(host).orgId());assertThrows(ResponseStatusException.class,()->access.resolve(host));
        assertEquals(org,access.authorizePerson(host,person).orgId());
        assertEquals(org,access.authorizePerson(host,person,org).orgId());assertEquals(scope,access.authorizePerson(host,person,org).runtimeScopeId());
        assertEquals(403,assertThrows(ResponseStatusException.class,()->access.authorizePerson(host,person,UUID.randomUUID())).getStatusCode().value());
        doReturn(json.valueToTree(Map.of("scopes",List.of()))).when(access).call("/internal/v2/runtime/product-scopes",request);
        assertThrows(ResponseStatusException.class,()->access.authorizePerson(host,person,org));
    }
    @Test void personalAccessNoGrantAndAmbiguousOrganizationsAreRejectedEvenWithAnExplicitSelection(){
        var json=JsonMapper.builder().build();var access=spy(new OpsAccess("https://identity.example.test","unused",json));
        String host="shared.example.test";UUID person=UUID.randomUUID(),org=UUID.randomUUID(),scope=UUID.randomUUID();
        doReturn(new OpsAccess.Entry(2,null,null,host)).when(access).entry(host);
        var request=Map.of("personId",person.toString(),"tenantId",2L,"entryHost",host);
        var valid=Map.of("subjectType","ORG","orgId",org.toString(),"runtimeScopeId",scope.toString(),"name","Organization");
        var other=Map.of("subjectType","ORG","orgId",UUID.randomUUID().toString(),"runtimeScopeId",UUID.randomUUID().toString(),"name","Organization");
        for(var scopes:List.of(List.of(),List.of(Map.of("subjectType","PERSON","personId",person.toString())),List.of(valid,other),List.of(valid,valid))){
            doReturn(json.valueToTree(Map.of("scopes",scopes))).when(access).call("/internal/v2/runtime/product-scopes",request);
            assertEquals(403,assertThrows(ResponseStatusException.class,()->access.authorizePerson(host,person)).getStatusCode().value());
            assertEquals(403,assertThrows(ResponseStatusException.class,()->access.authorizePerson(host,person,org)).getStatusCode().value());
        }
        doReturn(json.valueToTree(Map.of("scopes",List.of(valid)))).when(access).call("/internal/v2/runtime/product-scopes",request);
        var user=mock(org.springframework.security.oauth2.core.oidc.user.OidcUser.class);when(user.getSubject()).thenReturn(person.toString());
        assertEquals(new OpsAccess.Choice(org,scope,"Organization"),access.membership(host,user).organization());
        // The next request rechecks current grants; a preceding successful session does not retain access.
        doReturn(json.valueToTree(Map.of("scopes",List.of()))).when(access).call("/internal/v2/runtime/product-scopes",request);
        assertEquals(403,assertThrows(ResponseStatusException.class,()->access.membership(host,user)).getStatusCode().value());
    }
    @Test void organizationEntryRejectsASelectionForAnotherOrganization(){
        var json=JsonMapper.builder().build();var access=spy(new OpsAccess("https://identity.example.test","unused",json));String host="org.example.test";
        doReturn(json.valueToTree(Map.of("host",host,"catalogCode",302,"tenantId",2,"orgId",UUID.randomUUID().toString(),"runtimeScopeId",UUID.randomUUID().toString()))).when(access).call("/internal/v2/runtime/service-domain-resolve",Map.of("host",host));
        assertThrows(ResponseStatusException.class,()->access.authorizePerson(host,UUID.randomUUID(),UUID.randomUUID()));
        verify(access,never()).call(eq("/internal/v2/runtime/product-scopes"),any());
    }
    @Test void productNameAndLegacyAliasNeverSelectTheEntry(){
        var json=JsonMapper.builder().build();var access=spy(new OpsAccess("https://identity.example.test","unused",json));
        String host="entry.example.test";var reply=new LinkedHashMap<String,Object>(Map.of("host",host,"catalogCode",302,"serviceCode","renamed-alias","name","Renamed product","tenantId",1,"orgId",UUID.randomUUID().toString(),"runtimeScopeId",UUID.randomUUID().toString()));
        doReturn(json.valueToTree(reply)).when(access).call("/internal/v2/runtime/service-domain-resolve",Map.of("host",host));
        assertEquals(host,access.resolve(host).host());assertEquals("302",access.entry(host).serviceName());
        reply.put("serviceName","Current directory name");doReturn(json.valueToTree(reply)).when(access).call("/internal/v2/runtime/service-domain-resolve",Map.of("host",host));assertEquals("Current directory name",access.entry(host).serviceName());
        for(Object invalid:List.of(103,"302",302.1)){
            reply.put("catalogCode",invalid);reply.put("serviceCode","exportweb");
            doReturn(json.valueToTree(reply)).when(access).call("/internal/v2/runtime/service-domain-resolve",Map.of("host",host));
            assertThrows(ResponseStatusException.class,()->access.resolve(host));
        }
    }
}
