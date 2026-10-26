package dev.pmo.exportweb;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;
import java.util.*;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.web.server.ResponseStatusException;
import tools.jackson.databind.ObjectMapper;
class ProductBoundaryTest {
 @Test void acquisitionAndDigitalEmployeesCannotBeStoredInBuilder(){
  var json=new ObjectMapper();
  for(String key:List.of("acquisition","digital","customers","businessInsights"))assertThrows(IllegalArgumentException.class,()->BusinessWorkspace.validate(json.readTree("{\""+key+"\":{}}")));
  assertDoesNotThrow(()->BusinessWorkspace.validate(json.readTree("{\"articles\":[],\"geo\":{}}")));
  assertThrows(IllegalArgumentException.class,()->new WorkspaceData(List.of(),new WorkspaceData.Goal("sales goal","",List.of())).cleaned());
 }
 @Test void acquisitionTasksAreRejectedBeforeDatabaseOrQueueAccess(){
  var db=mock(org.springframework.jdbc.core.JdbcTemplate.class);
  var jobs=new Jobs(db,mock(org.springframework.transaction.PlatformTransactionManager.class),mock(ProjectMapper.class),new ObjectMapper());
  for(String kind:List.of("PROSPECT","RECEPTION","OUTREACH_DRAFT"))assertThrows(ResponseStatusException.class,()->jobs.create(null,null,null,kind,0,Map.of()));
  verifyNoInteractions(db);
 }
 @Test void ownOAuthCallbackAlsoValidatesOrganizationHost(){
  var filter=new OrganizationEntryFilter(mock(OpsAccess.class));
  assertFalse(filter.shouldNotFilter(new MockHttpServletRequest("GET","/login/oauth2/code/exportweb")));
  assertFalse(filter.shouldNotFilter(new MockHttpServletRequest("GET","/oauth2/authorization/exportweb")));
  assertTrue(filter.shouldNotFilter(new MockHttpServletRequest("GET","/login/oauth2/code/lga")));
  assertEquals(302,OpsAccess.PRODUCT_CODE);
 }
}
