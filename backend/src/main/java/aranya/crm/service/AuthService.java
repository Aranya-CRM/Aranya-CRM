package aranya.crm.service;

import aranya.crm.dto.LoginRequest;
import aranya.crm.dto.LoginResponse;
import aranya.crm.security.model.UserPrincipal;
import aranya.crm.security.util.JwtUtil;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.authentication.DisabledException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.AuthenticationException;
import org.springframework.stereotype.Service;

@Slf4j
@Service
@RequiredArgsConstructor
public class AuthService {

    private final AuthenticationManager authenticationManager;
    private final JwtUtil jwtUtil;
    private final CustomUserDetailsService userDetailsService;

    @Value("${jwt.access-token-expiration}")
    private long accessTokenExpiration;

    /**
     * 登录
     * authenticate() 内部已调用 loadUserByUsername()
     * 直接从认证结果取 UserPrincipal，不再查第二次数据库
     */
    public LoginResponse login(LoginRequest loginRequest) {
        Authentication authentication = authenticate(loginRequest.getEmail(),loginRequest.getPassword());

        UserPrincipal principal = (UserPrincipal) authentication.getPrincipal();

        String accessToken = jwtUtil.generateAccessToken(principal);
        String refreshToken = jwtUtil.generateRefreshToken(principal);

        log.info("User logged in successfully, userId: {}", principal.getId());

        return buildLoginResponse(accessToken, refreshToken, principal);
    }

    /**
     * 刷新 Token
     * 只校验 JWT 本身合法性，不做数据库持久化校验
     */
    public LoginResponse refreshToken(String refreshToken) {
        if (!jwtUtil.isRefreshToken(refreshToken)) {
            throw new BadCredentialsException("Invalid refresh token");
        }

        String email = jwtUtil.extractEmail(refreshToken);
        UserPrincipal principal = (UserPrincipal) userDetailsService.loadUserByUsername(email);

        String newAccessToken = jwtUtil.generateAccessToken(principal);
        String newRefreshToken = jwtUtil.generateRefreshToken(principal);

        log.info("Token refreshed successfully, userId: {}", principal.getId());

        return buildLoginResponse(newAccessToken, newRefreshToken, principal);
    }

    public void logout(Long userId) {
        log.info("User logged out successfully");
    }

    private Authentication authenticate(String email,String password) {
        try{
            return authenticationManager.authenticate(
                    new UsernamePasswordAuthenticationToken(email, password)
            );
        }catch (DisabledException e){
            log.warn("Login attempt for disabled account, email: {}", email);
            throw new DisabledException("Account is disabled");
        } catch (BadCredentialsException e) {
            log.warn("Login failed due to bad credentials, email: {}", email);
            throw new BadCredentialsException("Invalid email or password");
        } catch (AuthenticationException e) {
            log.warn("Login failed, email: {}, reason: {}", email, e.getMessage());
            throw e;
        }
    }

    private LoginResponse buildLoginResponse(String accessToken, String refreshToken, UserPrincipal principal) {
        return LoginResponse.builder()
                .accessToken(accessToken)
                .refreshToken(refreshToken)
                .tokenType("Bearer")
                .expiresIn(accessTokenExpiration/1000)
                .email(principal.getEmail())
                .fullName(principal.getFullName())
                .build();
    }
}
