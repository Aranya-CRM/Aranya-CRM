package aranya.crm.security.filter;

import aranya.crm.security.util.JwtUtil;
import aranya.crm.service.CustomUserDetailsService;
import io.jsonwebtoken.ExpiredJwtException;
import io.jsonwebtoken.JwtException;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.security.web.authentication.WebAuthenticationDetailsSource;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;

@Slf4j
@Component
@RequiredArgsConstructor
public class JwtAuthFilter extends OncePerRequestFilter {

    private final JwtUtil jwtUtil;
    private final CustomUserDetailsService userDetailsService;

    @Override
    protected boolean shouldNotFilter(HttpServletRequest request) {
        String path = request.getRequestURI();
        // 公开接口不需要经过 JWT 过滤器
        boolean skip = path.equals("/api/v1/auth/login") ||
                path.equals("/api/v1/auth/refresh");
        log.debug("shouldNotFilter: path={}, skip={}", path, skip);
        return skip;
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request,
                                    HttpServletResponse response,
                                    FilterChain filterChain) throws SecurityException, IOException, ServletException {

        log.debug("doFilterInternal executing: {}", request.getRequestURI());
        final String token = extractToken(request);
        log.debug("extracted token: {}", token == null ? "null" : token.substring(0, 20) + "...");

        if (token == null) {
            log.debug("No token found, passing through filter chain");
            filterChain.doFilter(request, response);
            return;
        }
        try{
            final String email = jwtUtil.extractEmail(token);

            if (jwtUtil.isRefreshToken(token)) {
                log.warn("Refresh token used as access token, request URI: {}", request.getRequestURI());
                sendUnauthorized(response, "Refresh token cannot be used to access resources");
                return;
            }

            if (StringUtils.hasText(email)
                    && SecurityContextHolder.getContext().getAuthentication() == null) {

                // ✅ 优化四：后续可在此处引入缓存，减少数据库查询
                UserDetails userDetails = userDetailsService.loadUserByUsername(email);

                if (jwtUtil.isTokenValid(token, userDetails)) {
                    UsernamePasswordAuthenticationToken authToken =
                            new UsernamePasswordAuthenticationToken(
                                    userDetails, null, userDetails.getAuthorities());
                    authToken.setDetails(new WebAuthenticationDetailsSource().buildDetails(request));
                    SecurityContextHolder.getContext().setAuthentication(authToken);
                    log.debug("Authenticated user: {}, URI: {}", email, request.getRequestURI());
                }
            }

        } catch (ExpiredJwtException e) {
            // ✅ 优化五：区分异常类型，记录日志，直接返回 401 不继续走过滤器链
            log.warn("JWT token expired for request URI: {}", request.getRequestURI());
            sendUnauthorized(response, "Token has expired");
            return;
        } catch (JwtException e) {
            log.warn("Invalid JWT token for request URI: {}, error: {}", request.getRequestURI(), e.getMessage());
            sendUnauthorized(response, "Invalid token");
            return;
        } catch (UsernameNotFoundException e) {
            log.warn("User not found for request URI: {}", request.getRequestURI());
            sendUnauthorized(response, "User not found");
            return;
        } catch (Exception e) {
            // 兜底：未预期的异常记录日志，但不暴露内部细节给客户端
            log.error("Unexpected error during JWT authentication, URI: {}", request.getRequestURI(), e);
            sendUnauthorized(response, "Authentication failed");
            return;
        }
        filterChain.doFilter(request, response);
    }

    /**
     * 从请求头提取 Bearer Token
     * 返回 null 表示请求没有携带 Token 或格式不正确
     */
    private String extractToken(HttpServletRequest request) {
        String authHeader = request.getHeader("Authorization");

        if(StringUtils.hasText(authHeader) && authHeader.startsWith("Bearer ")){
            String token = authHeader.substring(7);

            return StringUtils.hasText(token)?token:null;
        }
        return null;
    }

    private void sendUnauthorized(HttpServletResponse response, String message) throws IOException {
        response.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
        response.setContentType("application/json;charset=utf-8");
        response.getWriter().write(
                String.format("{\"error\":\"Unauthorized\",\"message\":\"%s\"}",message)
        );
    }

}
