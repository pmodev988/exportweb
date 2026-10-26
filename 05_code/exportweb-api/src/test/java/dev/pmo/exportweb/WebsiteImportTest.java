package dev.pmo.exportweb;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;
import java.io.*;
import java.net.*;
import java.nio.charset.StandardCharsets;
import java.util.*;
import org.junit.jupiter.api.Test;

class WebsiteImportTest {
 static final URI ROOT=URI.create("https://supplier.example/");
 static final String HOME="<nav><ul><li><a href='/'>首页</a></li><li><a href='/equipment/'>设备</a><ul><li><a href='/equipment/cutter/'>切割设备</a></li></ul></li><li><a href='https://elsewhere.example/'>外部</a></li></ul></nav><main><h1>现有公司首页</h1><p>原始介绍</p></main>";
 PublicWebsiteReader fixture()throws Exception{
  var reader=mock(PublicWebsiteReader.class);
  when(reader.get(any(),anyInt())).thenAnswer(i->{URI u=i.getArgument(0);String body=u.equals(ROOT)?HOME:"<main><h1>设备原有标题</h1><p><b>原有参数</b> 20 mm</p><img data-src='/media/photo.jpg'><video controls src='/media/demo.mp4'></video><iframe src='https://www.youtube.com/embed/abc123'></iframe><script>bad()</script><form><input></form></main>";return new PublicWebsiteReader.Document(u,body.getBytes(StandardCharsets.UTF_8));});
  return reader;
 }
 @Test void importsHierarchyAndOriginalContentWithAbsoluteMedia()throws Exception{
  var result=new WebsiteImport(fixture(),60,2000000).read(ROOT.toString(),true,"zh-Hans");
  assertEquals(3,result.pages().size());assertTrue(result.warnings().isEmpty());
  assertEquals(result.pages().get(1).id(),result.pages().get(2).parent());
  var html=result.pages().get(2).content().get("zh-Hans").html();
  assertTrue(html.contains("原有参数"));assertTrue(html.contains("20 mm"));
  assertTrue(html.contains("https://supplier.example/media/photo.jpg"));assertTrue(html.contains("https://supplier.example/media/demo.mp4"));
  assertTrue(html.contains("youtube.com/embed/abc123"));assertFalse(html.contains("<script"));assertFalse(html.contains("<form"));
 }
 @Test void skeletonOnlyDoesNotFetchDetails()throws Exception{
  var reader=fixture();var result=new WebsiteImport(reader,60,2000000).read(ROOT.toString(),false,"en");
  assertEquals(3,result.pages().size());assertTrue(result.pages().stream().allMatch(p->p.content().isEmpty()));verify(reader,times(1)).get(any(),anyInt());
 }
 @Test void failedRootReturnsErrorAndNeverTemplate()throws Exception{
  var reader=mock(PublicWebsiteReader.class);when(reader.get(any(),anyInt())).thenThrow(new IOException("unavailable"));
  var importer=new WebsiteImport(reader,60,2000000);
  assertThrows(IllegalArgumentException.class,()->importer.read(ROOT.toString(),true,"en"));
 }
 @Test void failedChildKeepsItsSkeletonAndReportsMissingContent()throws Exception{
  var reader=fixture();doThrow(new IOException()).when(reader).get(eq(URI.create("https://supplier.example/equipment/cutter/")),anyInt());
  var result=new WebsiteImport(reader,60,2000000).read(ROOT.toString(),true,"en");
  assertEquals(3,result.pages().size());assertTrue(result.pages().get(2).content().isEmpty());assertEquals(1,result.warnings().size());
 }
 @Test void excessivePagesRejectRatherThanSilentlyTruncate()throws Exception{
  assertThrows(IllegalArgumentException.class,()->new WebsiteImport(fixture(),2,2000000).read(ROOT.toString(),false,"en"));
 }
 @Test void rejectsUnsafeSchemesCredentialsPortsAndAddressLiterals(){
  for(String url:List.of("http://example.com/","file:///etc/passwd","https://user:pass@example.com/","https://example.com:9443/","https://127.0.0.1/","https://[::1]/"))
   assertThrows(IllegalArgumentException.class,()->PublicWebsiteReader.validate(URI.create(url)),url);
 }
 @Test void rejectsReservedAddressesIncludingDnsRebindingTargets()throws Exception{
  for(String ip:List.of("127.0.0.1","10.0.0.1","172.16.0.1","192.168.1.1","169.254.169.254","100.64.0.1","0.0.0.0","198.19.0.1","203.0.113.1","::1","fc00::1","fe80::1","2001:db8::1","2002:7f00:1::"))
   assertThrows(IOException.class,()->PublicWebsiteReader.requirePublic(InetAddress.getByName(ip)),ip);
  assertDoesNotThrow(()->PublicWebsiteReader.requirePublic(InetAddress.getByName("8.8.8.8")));
  assertDoesNotThrow(()->PublicWebsiteReader.requirePublic(InetAddress.getByName("2606:4700:4700::1111")));
 }
 @Test void boundedChunkDecoderRejectsTruncationAndOverflow()throws Exception{
  assertEquals("test",new String(PublicWebsiteReader.chunks(bytes("4\r\ntest\r\n0\r\n\r\n"),20),StandardCharsets.UTF_8));
  assertThrows(IOException.class,()->PublicWebsiteReader.chunks(bytes("4\r\ntest\r\n0\r\n\r\n"),3));
  assertThrows(IOException.class,()->PublicWebsiteReader.chunks(bytes("4\r\nte"),20));
 }
 static InputStream bytes(String s){return new ByteArrayInputStream(s.getBytes(StandardCharsets.UTF_8));}
}
