package dev.pmo.exportweb;
import java.io.ByteArrayInputStream;
import java.net.URI;
import java.nio.charset.StandardCharsets;
import java.nio.file.*;
import java.nio.file.attribute.PosixFilePermission;
import java.util.Map;
import java.util.Properties;
import java.util.concurrent.TimeUnit;
import io.minio.GetObjectArgs;
import io.minio.MinioClient;
import io.minio.PutObjectArgs;
import io.minio.StatObjectArgs;
import okhttp3.OkHttpClient;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;
import jakarta.annotation.PreDestroy;
@Component
class MediaObjects {
 private final String endpoint,bucket,region,credentialsFile;
 private final OkHttpClient http=new OkHttpClient.Builder().connectTimeout(8,TimeUnit.SECONDS)
   .readTimeout(60,TimeUnit.SECONDS).writeTimeout(60,TimeUnit.SECONDS).callTimeout(90,TimeUnit.SECONDS)
   .followRedirects(false).followSslRedirects(false).build();
 private MinioClient client;
 MediaObjects(@Value("${exportweb.media.endpoint:}")String endpoint,@Value("${exportweb.media.bucket:}")String bucket,
   @Value("${exportweb.media.region:us-east-1}")String region,@Value("${exportweb.media.credentials-file:}")String credentialsFile){
  this.endpoint=endpoint;this.bucket=bucket;this.region=region;this.credentialsFile=credentialsFile;
 }
 private synchronized MinioClient client(){
  if(client!=null)return client;
  try{
   URI uri=URI.create(endpoint);String host=uri.getHost();
   boolean loopback="127.0.0.1".equals(host)||"localhost".equals(host)||"[::1]".equals(host);
   if(host==null||!("https".equals(uri.getScheme())||"http".equals(uri.getScheme())&&loopback)
     ||uri.getUserInfo()!=null||uri.getQuery()!=null||uri.getFragment()!=null
     ||!(uri.getPath().isEmpty()||uri.getPath().equals("/"))
     ||host.endsWith(".amazonaws.com")||host.endsWith(".amazonaws.com.cn")
     ||!bucket.matches("[a-z0-9][a-z0-9.-]{1,61}[a-z0-9]")||region.isBlank()||credentialsFile.isBlank())throw new IllegalArgumentException();
   Path file=Path.of(credentialsFile);
   if(!file.isAbsolute()||!Files.isRegularFile(file,LinkOption.NOFOLLOW_LINKS))throw new IllegalArgumentException();
   if(Files.getFileStore(file).supportsFileAttributeView("posix")){
    var modes=Files.getPosixFilePermissions(file);
    if(modes.contains(PosixFilePermission.OTHERS_READ)||modes.contains(PosixFilePermission.OTHERS_WRITE)
      ||modes.contains(PosixFilePermission.OTHERS_EXECUTE)||modes.contains(PosixFilePermission.GROUP_WRITE))throw new IllegalArgumentException();
   }
   Properties secret=new Properties();try(var reader=Files.newBufferedReader(file,StandardCharsets.UTF_8)){secret.load(reader);}
   String access=secret.getProperty("accessKey",""),key=secret.getProperty("secretKey","");
   if(access.isBlank()||key.isBlank())throw new IllegalArgumentException();
   client=MinioClient.builder().endpoint(endpoint).region(region).credentials(access,key).httpClient(http).build();
   return client;
  }catch(Exception ex){throw unavailable("文件存储暂不可用");}
 }
 void put(String key,String type,byte[] bytes){
  try{
   client().putObject(PutObjectArgs.builder().bucket(bucket).object(key).contentType(type)
      .extraHeaders(Map.of("If-None-Match","*"))
      .stream(new ByteArrayInputStream(bytes),(long)bytes.length,-1L).build());
  }catch(ResponseStatusException e){throw e;}catch(Exception e){throw new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE,"文件上传未完成，请重试");}
 }
 /** Replacement is allowed only after the caller locks an existing organization/site asset. */
 void replace(String key,String type,byte[] bytes){
  try{
   String etag=client().statObject(StatObjectArgs.builder().bucket(bucket).object(key).build()).etag();
   client().putObject(PutObjectArgs.builder().bucket(bucket).object(key).contentType(type)
     .extraHeaders(Map.of("If-Match","\""+etag+"\""))
     .stream(new ByteArrayInputStream(bytes),(long)bytes.length,-1L).build());
  }catch(Exception e){throw new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE,"文件替换未完成，请重试");}
 }
 byte[] get(String key){
  try(var stream=client().getObject(GetObjectArgs.builder().bucket(bucket).object(key).build())){
   byte[] bytes=stream.readNBytes(20971521);if(bytes.length>20971520)throw new IllegalArgumentException();return bytes;
  }
  catch(Exception e){throw new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE,"文件读取未完成");}
 }
 private static ResponseStatusException unavailable(String reason){return new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE,reason);}
 @PreDestroy void close(){http.dispatcher().executorService().shutdown();http.connectionPool().evictAll();}
}
