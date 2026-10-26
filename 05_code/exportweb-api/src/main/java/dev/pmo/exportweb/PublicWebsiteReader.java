package dev.pmo.exportweb;

import java.io.*;
import java.net.*;
import java.nio.charset.StandardCharsets;
import java.util.*;
import javax.net.ssl.*;
import org.springframework.stereotype.Component;

/** HTTPS fetcher whose TCP connection is pinned to an already validated public address. */
@Component
class PublicWebsiteReader {
 private static final java.util.concurrent.ScheduledExecutorService DEADLINES=java.util.concurrent.Executors.newSingleThreadScheduledExecutor(r->{var thread=new Thread(r,"website-read-deadline");thread.setDaemon(true);return thread;});
 record Document(URI url, byte[] bytes) {}
 Document get(URI input, int limit) throws IOException {
  return get(input,limit,false,Long.MAX_VALUE);
 }
 Document media(URI input,int limit,long deadlineNanos)throws IOException{
  return get(input,limit,true,deadlineNanos);
 }
 private Document get(URI input,int limit,boolean media,long deadlineNanos) throws IOException {
  URI url=validate(input);
  for(int redirect=0;redirect<=5;redirect++){
   if(Thread.currentThread().isInterrupted()||System.nanoTime()>=deadlineNanos)throw new IOException("读取已取消或超时");
   InetAddress[] addresses=InetAddress.getAllByName(url.getHost());
   if(addresses.length==0)throw new IOException("网站地址无法解析");
   for(var address:addresses)requirePublic(address);
   try(var tcp=new Socket()){
    long remaining=Math.min(java.util.concurrent.TimeUnit.SECONDS.toNanos(20),deadlineNanos-System.nanoTime());
    if(remaining<=0)throw new IOException("读取超时");
    var deadline=DEADLINES.schedule(()->{try{tcp.close();}catch(IOException ignored){}},remaining,java.util.concurrent.TimeUnit.NANOSECONDS);
    try {
    tcp.connect(new InetSocketAddress(addresses[0],443),8000);
    tcp.setSoTimeout(12000);
    try(var tls=(SSLSocket)((SSLSocketFactory)SSLSocketFactory.getDefault()).createSocket(tcp,url.getHost(),443,true)){
     var parameters=tls.getSSLParameters();
     parameters.setEndpointIdentificationAlgorithm("HTTPS");
     parameters.setServerNames(List.of(new SNIHostName(url.getHost())));
     tls.setSSLParameters(parameters);tls.startHandshake();
     String target=Objects.toString(url.getRawPath(),"/");
     if(target.isEmpty())target="/";
     if(url.getRawQuery()!=null)target+="?"+url.getRawQuery();
     tls.getOutputStream().write(("GET "+target+" HTTP/1.1\r\nHost: "+url.getHost()+"\r\nUser-Agent: ExportWeb-Website-Import/1.0\r\nAccept: "+(media?"image/*, video/*, application/octet-stream":"text/html")+"\r\nAccept-Encoding: identity\r\nConnection: close\r\n\r\n").getBytes(StandardCharsets.US_ASCII));
     var stream=new BufferedInputStream(tls.getInputStream());
     String status=line(stream,4096);
     if(!status.matches("HTTP/1\\.[01] [0-9]{3}.*"))throw new IOException("网站响应格式不支持");
     int code=Integer.parseInt(status.substring(9,12)),headerSize=0;
     var headers=new HashMap<String,String>();
     for(String s;(s=line(stream,8192)).length()>0;){
      headerSize+=s.length();if(headerSize>32768)throw new IOException("网站响应头过大");
      int colon=s.indexOf(':');if(colon<1)throw new IOException("网站响应头无效");
      String key=s.substring(0,colon).toLowerCase(Locale.ROOT),value=s.substring(colon+1).trim();
      if(headers.putIfAbsent(key,value)!=null&&(key.equals("content-length")||key.equals("transfer-encoding")))throw new IOException("网站响应长度不明确");
     }
     if(Set.of(301,302,303,307,308).contains(code)){
      String location=headers.get("location");if(location==null)throw new IOException("网站跳转地址缺失");
      url=validate(url.resolve(location));continue;
     }
     if(code!=200)throw new IOException("网站返回 HTTP "+code);
     String type=headers.getOrDefault("content-type","").split(";",2)[0].trim().toLowerCase(Locale.ROOT);
     if(media?!Set.of("image/png","image/jpeg","image/gif","image/webp","video/mp4","video/webm","application/octet-stream").contains(type):!Set.of("text/html","application/xhtml+xml").contains(type))throw new IOException(media?"该地址不是支持的图片或视频文件":"该地址不是网页");
     if(!headers.getOrDefault("content-encoding","identity").equalsIgnoreCase("identity"))throw new IOException("网站返回了不支持的压缩内容");
     String transfer=headers.get("transfer-encoding");
     if(transfer!=null&&!transfer.equalsIgnoreCase("chunked"))throw new IOException("网站传输格式不支持");
     if(transfer!=null&&headers.containsKey("content-length"))throw new IOException("网站响应长度不明确");
     byte[] bytes;
     if(transfer!=null)bytes=chunks(stream,limit);
     else if(headers.containsKey("content-length")){
      int size;try{size=Integer.parseInt(headers.get("content-length"));}catch(NumberFormatException ex){throw new IOException("网站响应长度无效");}
      if(size<0||size>limit)throw new IOException("网页超过读取大小限制");
      bytes=stream.readNBytes(size);if(bytes.length!=size)throw new IOException("网页读取不完整");
     }else{bytes=stream.readNBytes(limit+1);if(bytes.length>limit)throw new IOException("网页超过读取大小限制");}
     if(media){String actual=ProjectStore.mediaType(bytes);if(!type.equals("application/octet-stream")&&!type.equals(actual))throw new IOException("素材内容与文件类型不一致");}
     return new Document(url,bytes);
    }
    } finally {deadline.cancel(false);}
   }
  }
  throw new IOException("网站跳转次数过多");
 }
 static URI validate(URI uri) {
  if(uri==null||!"https".equalsIgnoreCase(uri.getScheme())||uri.getHost()==null||uri.getUserInfo()!=null||(uri.getPort()!=-1&&uri.getPort()!=443)||uri.toString().length()>2048||uri.getHost().contains(":")||uri.getHost().matches("[0-9.]+")||uri.getHost().endsWith(".")||uri.getRawFragment()!=null)
   throw new IllegalArgumentException("请使用公开网站的 HTTPS 地址");
  return URI.create(uri.toASCIIString()).normalize();
 }
 static void requirePublic(InetAddress address)throws IOException {
  byte[] b=address.getAddress();
  if(address.isAnyLocalAddress()||address.isLoopbackAddress()||address.isLinkLocalAddress()||address.isSiteLocalAddress()||address.isMulticastAddress())throw new IOException("不能读取本机或内部网络地址");
  if(b.length==4){
   int a=b[0]&255,c=b[1]&255,d=b[2]&255;
   if(a==0||a==10||a==127||a>=224||(a==100&&c>=64&&c<=127)||(a==169&&c==254)||(a==172&&c>=16&&c<=31)||(a==192&&(c==168||c==0||c==2))||(a==198&&(c==18||c==19||c==51&&d==100))||(a==203&&c==0&&d==113))throw new IOException("不能读取保留网络地址");
  }else{
   // Permit native globally routable IPv6 only; exclude translation and tunnel ranges.
   int first=b[0]&255,second=b[1]&255;
   if((first&0xe0)!=0x20||(first==0x20&&second==0x02)||(first==0x20&&second==1&&((b[2]&255)<2||((b[2]&255)==0x0d&&(b[3]&255)==0xb8))))throw new IOException("不能读取保留网络地址");
  }
 }
 static String line(InputStream stream,int limit)throws IOException {
  var out=new ByteArrayOutputStream();
  for(int c;(c=stream.read())!=-1;){if(c=='\n'){byte[] b=out.toByteArray();if(b.length==0||b[b.length-1]!='\r')throw new IOException("响应换行无效");return new String(b,0,b.length-1,StandardCharsets.ISO_8859_1);}out.write(c);if(out.size()>limit)throw new IOException("响应行过长");}
  throw new EOFException("网页连接提前关闭");
 }
 static byte[] chunks(InputStream stream,int limit)throws IOException {
  var out=new ByteArrayOutputStream();
  for(int count=0;count<10000;count++){
   String sizeLine=line(stream,100);long size;
   try{size=Long.parseLong(sizeLine.split(";",2)[0].trim(),16);}catch(NumberFormatException ex){throw new IOException("网页分块格式无效");}
   if(size==0)return out.toByteArray();
   if(size<0||size>limit-out.size())throw new IOException("网页超过读取大小限制");
   byte[] data=stream.readNBytes((int)size);if(data.length!=size)throw new EOFException("网页分块读取不完整");
   out.write(data);if(!line(stream,2).isEmpty())throw new IOException("网页分块结束格式无效");
  }
  throw new IOException("网页分块过多");
 }
}
