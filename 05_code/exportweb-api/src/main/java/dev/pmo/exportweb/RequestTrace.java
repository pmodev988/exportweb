package dev.pmo.exportweb;
import java.io.IOException;
import java.util.UUID;
import jakarta.servlet.*;
import jakarta.servlet.http.*;
import org.springframework.web.filter.OncePerRequestFilter;
import org.springframework.stereotype.Component;
@Component
class RequestTrace extends OncePerRequestFilter {
 protected void doFilterInternal(HttpServletRequest request,HttpServletResponse response,FilterChain chain)throws ServletException,IOException{
  String id=UUID.randomUUID().toString();request.setAttribute("traceId",id);response.setHeader("X-Request-Id",id);
  try(var ignored=org.slf4j.MDC.putCloseable("traceId",id)){chain.doFilter(request,response);}
 }
}
