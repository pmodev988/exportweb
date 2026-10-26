package dev.pmo.exportweb;
import static org.junit.jupiter.api.Assertions.*;
import org.junit.jupiter.api.Test;
import org.springframework.web.server.ResponseStatusException;
class MediaConfigurationTest {
 @Test void missingLocalConfigurationFailsClosed(){
  var media=new MediaObjects("","local-media","us-east-1","");
  try{assertEquals(503,assertThrows(ResponseStatusException.class,()->media.get("lga/test")).getStatusCode().value());}finally{media.close();}
 }
 @Test void cloudOrUnsafeEndpointsNeverFallBackToAws(){
  for(String url:new String[]{"https://s3.amazonaws.com","https://s3.cn-north-1.amazonaws.com.cn","http://storage.example.test","https://user:secret@minio.example.test","https://minio.example.test/path","https://minio.example.test?key=x"}){
   var media=new MediaObjects(url,"local-media","us-east-1","/missing-local-credentials");
   try{assertEquals(503,assertThrows(ResponseStatusException.class,()->media.put("lga/test","image/png",new byte[]{1})).getStatusCode().value());}finally{media.close();}
  }
 }
}
