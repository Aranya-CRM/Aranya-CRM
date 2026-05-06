package aranya.crm.security.filter;

import aranya.crm.entity.User;
import aranya.crm.security.model.FirebaseUserPrincipal;
import aranya.crm.service.UserService;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.google.firebase.auth.FirebaseAuth;
import com.google.firebase.auth.FirebaseAuthException;
import com.google.firebase.auth.FirebaseToken;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.MediaType;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.Collections;
import java.util.List;
import java.util.Map;


/**
 * Firebase ID Token 校验 Filter。
 * <p>
 * 工作流程:
 * 1. 从 Authorization 头提取 Bearer Token
 * 2. 调用 FirebaseAuth.verifyIdToken() 验证(本地验签,无网络调用)
 * 3. 校验关键 claims:email_verified、sign_in_second_factor
 * 4. 构造 FirebaseUserPrincipal 放入 SecurityContext
 * <p>
 * 没带 Token 的请求直接放行,由 SecurityConfig 决定是否需要认证。
 * 这样公开接口(如 /api/health)可以不带 Token 访问。
 */


@Slf4j
@Component
@RequiredArgsConstructor
public class FirebaseAuthFilter extends OncePerRequestFilter {
    private static final String AUTH_HEADER = "Authorization";
    private static final String BEARER_PREFIX = "Bearer ";

    private final ObjectMapper objectMapper = new ObjectMapper().findAndRegisterModules();
    private final UserService userService;

    @Override
    protected void doFilterInternal(HttpServletRequest request,
                                    HttpServletResponse response,
                                    FilterChain filterChain) throws ServletException, IOException {
        String header = request.getHeader(AUTH_HEADER);

        if (header == null  || !header.startsWith(BEARER_PREFIX)) {
            filterChain.doFilter(request, response);
            return;
        }

        String idToken = header.substring(BEARER_PREFIX.length()).trim();

        try {
            FirebaseToken decodedToken = FirebaseAuth.getInstance().verifyIdToken(idToken);

            String uid = decodedToken.getUid();
            String email = decodedToken.getEmail();
            boolean emailVerified = decodedToken.isEmailVerified();

            @SuppressWarnings("unchecked")
            Map<String,Object> firebaseClaim = (Map<String, Object>) decodedToken.getClaims().get("firebase");
            String signInProvider = firebaseClaim !=null ? (String) firebaseClaim.get("sign_in_provider") : null;
            String secondFactor = firebaseClaim !=null ? (String) firebaseClaim.get("sign_in_second_factor") : null;

            log.debug("Token verified: uid = {}, provider = {}, secondFactor = {}", uid, signInProvider, secondFactor);

            if (!"totp".equals(secondFactor)) {
                log.warn("MFA not enrolled for uid = {}. returning 428",uid);
                writeErrorResponse(response,request,428,"MFA_NOT_ENROLLED","TOTP MFA enrollment is required to access this resource");
                return;
            }

            if (!emailVerified) {
                log.warn("Email not verified for uid = {}", uid);
                writeErrorResponse(response,request,HttpServletResponse.SC_UNAUTHORIZED,
                        "EMAIL_NOT_VERIFIED",
                        "Email address has not been verified");
                return;
            }

            // 通过验证后拿到 Firebase UID,在本地数据库查找对应用户和用户角色信息
            User user = userService.findByFirebasedUidWithRoles(uid)
                    .orElse(null);

            if (user == null) {
                log.warn("Firebase user {} not registered in local database",uid);
                writeErrorResponse(response,request,HttpServletResponse.SC_FORBIDDEN,
                        "USER_NOT_REGISTRED",
                        "user not registerd in this system");
                return;
            }

            if(!user.getStatus().equals("ACTIVE")) {
                log.warn("User {} is disabled",uid);
                writeErrorResponse(response,request,HttpServletResponse.SC_FORBIDDEN,
                        "USER_DISABLED","Your account has been disabled");
                return;
            }

            user = userService.syncFromFirebase(user,decodedToken);

            List<SimpleGrantedAuthority> authorities = user.getUserRoles().stream()
                    .map(userRole -> userRole.getRole().getName())
                    .map(roleName -> "ROLE_" + roleName) // Spring Security 角色前缀
                    .map(SimpleGrantedAuthority::new)
                    .toList();

            UsernamePasswordAuthenticationToken authentication =
                    new UsernamePasswordAuthenticationToken(
                            user,
                            null,
                            authorities
                    );

            SecurityContextHolder.getContext().setAuthentication(authentication);
        }catch (FirebaseAuthException e){
            log.warn("Firebase token verification failed: {}",e.getMessage());
            writeErrorResponse(response,request,HttpServletResponse.SC_UNAUTHORIZED,
                    "INVALID_TOKEN",
                    "Invalid or expired Firebase token");
        }

        filterChain.doFilter(request, response);
    }

    private void writeErrorResponse(HttpServletResponse response,
                                    HttpServletRequest request,
                                    int status,
                                    String code,
                                    String message) throws IOException {
        response.setStatus(status);
        response.setContentType(MediaType.APPLICATION_JSON_VALUE);
        response.setCharacterEncoding("UTF-8");
    }
}
