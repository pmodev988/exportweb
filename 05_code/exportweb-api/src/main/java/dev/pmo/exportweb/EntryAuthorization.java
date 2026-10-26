package dev.pmo.exportweb;

import java.net.URI;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.security.oauth2.client.web.OAuth2AuthorizationRequestResolver;
import org.springframework.security.oauth2.core.endpoint.OAuth2AuthorizationRequest;

/** Only the signed runtime lookup in OrganizationEntryFilter may select an Identity proxy origin. */
final class EntryAuthorization implements OAuth2AuthorizationRequestResolver {
 private final OAuth2AuthorizationRequestResolver delegate;
 EntryAuthorization(OAuth2AuthorizationRequestResolver delegate){this.delegate=delegate;}
 public OAuth2AuthorizationRequest resolve(HttpServletRequest request){return route(request,delegate.resolve(request));}
 public OAuth2AuthorizationRequest resolve(HttpServletRequest request,String id){return route(request,delegate.resolve(request,id));}
 private OAuth2AuthorizationRequest route(HttpServletRequest request,OAuth2AuthorizationRequest source){
  if(source==null||!(request.getAttribute(OrganizationEntryFilter.IDENTITY_ENTRY) instanceof String origin))return source;
  var target=URI.create(source.getAuthorizationRequestUri());
  return OAuth2AuthorizationRequest.from(source).authorizationUri(origin+target.getRawPath())
   .authorizationRequestUri(origin+target.getRawPath()+"?"+target.getRawQuery()).build();
 }
}
