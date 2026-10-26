package dev.pmo.exportweb;
import java.io.IOException;
import jakarta.servlet.*;
import jakarta.servlet.http.*;
import org.springframework.web.filter.OncePerRequestFilter;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.stereotype.Component;
import org.springframework.core.annotation.Order;
import org.springframework.core.Ordered;
/** Validate the organization Host before constructing an OAuth redirect from it. */
@Component @Order(Ordered.HIGHEST_PRECEDENCE+20)
class OrganizationEntryFilter extends OncePerRequestFilter{
 static final String IDENTITY_ENTRY=OrganizationEntryFilter.class.getName()+".identityEntry";
 private final OpsAccess access;OrganizationEntryFilter(OpsAccess access){this.access=access;}
 protected boolean shouldNotFilter(HttpServletRequest request){return !request.getRequestURI().equals("/oauth2/authorization/exportweb")&&!request.getRequestURI().equals("/login/oauth2/code/exportweb");}
 protected void doFilterInternal(HttpServletRequest request,HttpServletResponse response,FilterChain chain)throws ServletException,IOException{
  try{
   String host=request.getServerName().toLowerCase(java.util.Locale.ROOT);
   String[] sources=request.getRequestURI().equals("/oauth2/authorization/exportweb")?request.getParameterValues("identity_entry"):null;
   if(sources==null)access.entry(host);
   else{
    if(sources.length!=1||sources[0].isBlank())throw new ResponseStatusException(org.springframework.http.HttpStatus.BAD_REQUEST);
    access.entry(host,sources[0]);request.setAttribute(IDENTITY_ENTRY,sources[0]);
   }
  }
  catch(ResponseStatusException denied){response.setStatus(denied.getStatusCode().value());response.setHeader("Cache-Control","no-store");response.setContentType("text/plain;charset=UTF-8");response.getWriter().write("无法核对产品入口或登录来源，请从组织工作台重新进入；若持续出现，请联系管理员。");return;}
  chain.doFilter(request,response);
 }
}
