package aranya.crm.service;

import aranya.crm.config.AppProperties;
import aranya.crm.dto.LoginRequest;
import aranya.crm.dto.LoginResponse;
import aranya.crm.entity.RefreshToken;
import aranya.crm.entity.User;
import aranya.crm.repository.RefreshTokenRepository;
import aranya.crm.repository.UserRepository;
import aranya.crm.security.model.UserPrincipal;
import aranya.crm.security.util.JwtUtil;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.authentication.DisabledException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.AuthenticationException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.time.LocalDateTime;
import java.util.HexFormat;

@Slf4j
@Service
@RequiredArgsConstructor
public class AuthService {

    private final AuthenticationManager authenticationManager;
    private final JwtUtil jwtUtil;
    private final CustomUserDetailsService userDetailsService;
    private final AppProperties appProperties;
    private final RefreshTokenRepository refreshTokenRepository;
    private final UserRepository userRepository;

    /**
     * 登录
     * authenticate() 内部已调用 loadUserByUsername()
     * 直接从认证结果取 UserPrincipal，不再查第二次数据库
     */
    @Transactional
    public LoginResponse login(LoginRequest loginRequest) {
        Authentication authentication = authenticate(loginRequest.getEmail(),loginRequest.getPassword());

        UserPrincipal principal = (UserPrincipal) authentication.getPrincipal();

        String accessToken = jwtUtil.generateAccessToken(principal);
        String refreshToken = jwtUtil.generateRefreshToken(principal);

        saveRefreshToken(refreshToken,principal.getId());
        log.info("User logged in successfully, userId: {}", principal.getId());

        return buildLoginResponse(accessToken, refreshToken, principal);
    }

    @Transactional
    public TwoFactorSetupResponse initSetupTwoFactor(TwoFactorInitSetupRequest request) {
        String email = jwtUtil.extractEmailFromTempToken(request.getTempToken());
        return twoFactorService.generateSetup(email);
    }

    @Transactional
    public LoginResponse initEnableTwoFactor(TwoFactorInitEnableRequest request) {
        String email = jwtUtil.extractEmailFromTempToken(request.getTempToken());
        UserPrincipal principal = (UserPrincipal) userDetailsService.loadUserByUsername(email);

        TwoFactorEnableRequest enableRequest = new TwoFactorEnableRequest();
        enableRequest.setSecret(request.getSecret());
        enableRequest.setCode(request.getCode());

        List<String> backupCodes = twoFactorService.enableTwoFactor(principal.getId(), enableRequest);

        String accessToken = jwtUtil.generateAccessToken(principal);
        String refreshToken = jwtUtil.generateRefreshToken(principal);
        saveRefreshToken(refreshToken, principal.getId());
        log.info("2FA setup completed, user logged in, userId: {}", principal.getId());

        LoginResponse response = buildLoginResponse(accessToken, refreshToken, principal);
        response.setBackupCodes(backupCodes);
        return response;
    }

    /**
     * 刷新 Token
     * 只校验 JWT 本身合法性，不做数据库持久化校验
     */
    @Transactional
    public LoginResponse refreshToken(String refreshToken) {
        if (!jwtUtil.isRefreshToken(refreshToken)) {
            throw new BadCredentialsException("Invalid refresh token");
        }

        String tokenHash = hashToken(refreshToken);
        RefreshToken storedToken = refreshTokenRepository.findByTokenHash(tokenHash)
                .orElseThrow(() -> {
                    log.warn("Refresh token not found in database");
                    return new BadCredentialsException("Refresh token not found");
                });
        if (!storedToken.isValid()){
            log.warn("Invalid refresh token used,possible replay attack, userId: {}",storedToken.getUser().getId());
            refreshTokenRepository.revokeAllByUserId(storedToken.getUser().getId());
            throw new BadCredentialsException("Refresh token is invalid or expired");
        }

        storedToken.setRevoked(true);
        refreshTokenRepository.save(storedToken);

        String email = jwtUtil.extractEmail(refreshToken);
        UserPrincipal principal = (UserPrincipal) userDetailsService.loadUserByUsername(email);

        String newAccessToken = jwtUtil.generateAccessToken(principal);
        String newRefreshToken = jwtUtil.generateRefreshToken(principal);

        saveRefreshToken(newRefreshToken,principal.getId());

        log.info("Token refreshed successfully, userId: {}", principal.getId());

        return buildLoginResponse(newAccessToken, newRefreshToken, principal);
    }

    @Transactional
    public void logout(Long userId) {
        refreshTokenRepository.revokeAllByUserId(userId);
        log.info("User logged out successfully,userId:{}",userId);
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
                .expiresIn(appProperties.getJwt().getAccessTokenExpiration()/1000)
                .email(principal.getEmail())
                .fullName(principal.getFullName())
                .build();
    }

    private void saveRefreshToken(String refreshToken, Long userId) {
        User userRef = userRepository.getReferenceById(userId);

        RefreshToken rt = new RefreshToken();
        rt.setTokenHash(hashToken(refreshToken));
        rt.setUser(userRef);
        rt.setExpiresAt(LocalDateTime.now().plusSeconds(appProperties.getJwt().getRefreshTokenExpiration()/1000));

        refreshTokenRepository.save(rt);
    }

    private String hashToken(String token) {
        try{
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            byte[] hash = digest.digest(token.getBytes(StandardCharsets.UTF_8));
            return HexFormat.of().formatHex(hash);
        } catch (NoSuchAlgorithmException e) {
            throw new IllegalArgumentException("SHA-256 algorithm not available",e);
        }
    }
}
