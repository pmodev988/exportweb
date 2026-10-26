package dev.pmo.exportweb;
import org.springframework.context.annotation.*;
import org.springframework.security.config.Customizer;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.oauth2.client.web.*;
import org.springframework.security.oauth2.client.registration.ClientRegistrationRepository;
import org.springframework.http.HttpStatus;
import org.springframework.security.web.authentication.HttpStatusEntryPoint;
@Configuration
@org.springframework.boot.autoconfigure.condition.ConditionalOnWebApplication
class Security {
 @Bean SecurityFilterChain exportwebSecurityFilterChain(HttpSecurity http,ClientRegistrationRepository clients)throws Exception{
  var resolver=new DefaultOAuth2AuthorizationRequestResolver(clients,"/oauth2/authorization");
  resolver.setAuthorizationRequestCustomizer(OAuth2AuthorizationRequestCustomizers.withPkce());
  return http.authorizeHttpRequests(a->a.requestMatchers("/health","/workspace/**","/oauth2/**","/login/**").permitAll().requestMatchers("/api/**").authenticated().anyRequest().permitAll())
   .oauth2Login(o->o.authorizationEndpoint(e->e.authorizationRequestResolver(new EntryAuthorization(resolver))).defaultSuccessUrl("/workspace/",true))
   .logout(l->l.logoutSuccessHandler((request,response,authentication)->response.setStatus(204)))
   .exceptionHandling(e->e.defaultAuthenticationEntryPointFor(new HttpStatusEntryPoint(HttpStatus.UNAUTHORIZED),r->r.getRequestURI().startsWith("/api/")))
   .headers(h->h.frameOptions(f->f.sameOrigin()).contentSecurityPolicy(c->c.policyDirectives("default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' https: data:; media-src 'self' https:; frame-src 'self' https://www.youtube.com https://www.youtube-nocookie.com https://player.vimeo.com; connect-src 'self'; object-src 'none'; base-uri 'none'; frame-ancestors 'self'")))
   .csrf(Customizer.withDefaults()).build();
 }
}
