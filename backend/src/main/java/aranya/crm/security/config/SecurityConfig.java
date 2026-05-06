package aranya.crm.security.config;

import aranya.crm.config.CorsConfig;
import aranya.crm.security.filter.FirebaseAuthFilter;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.MediaType;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.security.web.header.writers.ReferrerPolicyHeaderWriter;


/**
 * Spring Security 配置。
 * 注册 FirebaseAuthFilter,定义公开/受保护路径,配置 CORS。
 */
@Configuration
@EnableWebSecurity
@EnableMethodSecurity
@RequiredArgsConstructor
public class SecurityConfig {

    private final FirebaseAuthFilter firebaseAuthFilter;
    private final CorsConfig corsConfig;
    private final ObjectMapper objectMapper;

    /**
     * 公开路径:不需要 Firebase Token 即可访问。
     * <p>
     * 注意:登录、注册、TOTP enrollment 等流程都在 Firebase 完成,
     * 后端没有对应接口,所以这里不需要列。
     */
    private static final String[] PUBLIC_ENDPOINTS = {
            "/api/health",
            "/api/public/**",
            "/v3/api-docs/**",
            "/swagger-ui/**",
            "/swagger-ui.html",
            "/actuator/health",
            "/error"
    };

    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
        http
                .cors(cors -> cors.configurationSource(corsConfig.corsConfigurationSource()))
                .csrf(AbstractHttpConfigurer::disable)
                .headers(headers -> headers
                        .frameOptions(frame -> frame.sameOrigin())
                        .contentTypeOptions(content -> {})
                        .referrerPolicy(referrer -> referrer.policy(
                                ReferrerPolicyHeaderWriter.ReferrerPolicy.STRICT_ORIGIN_WHEN_CROSS_ORIGIN))
                )
                .authorizeHttpRequests(auth -> auth
                        .requestMatchers(PUBLIC_ENDPOINTS).permitAll()
                        .anyRequest().authenticated()
                )
                .sessionManagement(session -> session
                        .sessionCreationPolicy(SessionCreationPolicy.STATELESS)
                )
                .exceptionHandling(ex -> ex
                        .authenticationEntryPoint(this::handleUnauthenticated)
                        .accessDeniedHandler(this::handleAccessDenied)
                )
                .addFilterBefore(firebaseAuthFilter, UsernamePasswordAuthenticationFilter.class);

        return http.build();
    }

    /**
     * 未携带认证信息时的响应(401)。
     * 例如:用户调用受保护接口但没带 Authorization 头。
     */
    private void handleUnauthenticated(jakarta.servlet.http.HttpServletRequest request,
                                       HttpServletResponse response,
                                       org.springframework.security.core.AuthenticationException ex)
            throws java.io.IOException {
        writeError(request, response, HttpServletResponse.SC_UNAUTHORIZED,
                        "UNAUTHORIZED", "Authentication required.");
    }

    /**
     * 已认证但权限不足时的响应(403)。
     * 例如:Volunteer 试图访问 Manager 才能调的接口。
     */
    private void handleAccessDenied(HttpServletRequest request,
                                    HttpServletResponse response,
                                    org.springframework.security.access.AccessDeniedException ex)
            throws java.io.IOException {
        writeError(request, response, HttpServletResponse.SC_FORBIDDEN,
                "FORBIDDEN", "Access denied for this resource.");
    }

    private void writeError(HttpServletRequest request,
                            HttpServletResponse response,
                            int status, String code, String message) throws java.io.IOException {
        response.setStatus(status);
        response.setContentType(MediaType.APPLICATION_JSON_VALUE);
        response.setCharacterEncoding("UTF-8");
    }
}
