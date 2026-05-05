package aranya.crm.service;

import aranya.crm.config.AppProperties;
import aranya.crm.dto.LoginRequest;
import aranya.crm.dto.LoginResponse;
import aranya.crm.entity.RefreshToken;
import aranya.crm.entity.User;
import aranya.crm.repository.RefreshTokenRepository;
import aranya.crm.repository.UserRepository;
import aranya.crm.security.model.FirebaseUserPrincipal;
import aranya.crm.security.util.JwtUtil;
import org.junit.jupiter.api.*;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.mockito.junit.jupiter.MockitoSettings;
import org.mockito.quality.Strictness;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
@TestMethodOrder(MethodOrderer.OrderAnnotation.class)
class AuthServiceTest {

    @Mock
    private AuthenticationManager authenticationManager;
    @Mock
    private JwtUtil jwtUtil;
    @Mock
    private CustomUserDetailsService userDetailsService;
    @Mock
    private AppProperties appProperties;
    @Mock
    private AppProperties.JwtProperties jwtConfig;
    @Mock
    private RefreshTokenRepository refreshTokenRepository;
    @Mock
    private UserRepository userRepository;

    @InjectMocks
    private AuthService authService;

    private User mockUser;
    private FirebaseUserPrincipal mockPrincipal;

    @BeforeEach
    void setUp() {
        mockUser = new User();
        mockUser.setId(1L);
        mockUser.setEmail("admin@test.com");
        mockUser.setFullName("Admin User");
        mockUser.setPasswordHash("hashedPassword");
        mockUser.setStatus("ACTIVE");

        mockPrincipal = FirebaseUserPrincipal.of(mockUser, List.of("ADMIN"));

        when(appProperties.getJwt()).thenReturn(jwtConfig);
        when(jwtConfig.getAccessTokenExpiration()).thenReturn(3600000L);
        when(jwtConfig.getRefreshTokenExpiration()).thenReturn(604800000L);
    }

    @Test
    @Order(1)
    @DisplayName("登录成功返回 Token 对")
    void login_ShouldReturnTokens_WhenCredentialsAreValid() {
        // Arrange
        LoginRequest request = new LoginRequest();
        request.setEmail("admin@test.com");
        request.setPassword("password");

        UsernamePasswordAuthenticationToken authToken =
                new UsernamePasswordAuthenticationToken(mockPrincipal, null, mockPrincipal.getAuthorities());

        when(authenticationManager.authenticate(any())).thenReturn(authToken);
        when(jwtUtil.generateAccessToken(any())).thenReturn("access-token");
        when(jwtUtil.generateRefreshToken(any())).thenReturn("refresh-token");
        when(userRepository.getReferenceById(1L)).thenReturn(mockUser);

        // Act
        LoginResponse response = authService.login(request);

        // Assert
        assertThat(response.getAccessToken()).isEqualTo("access-token");
        assertThat(response.getRefreshToken()).isEqualTo("refresh-token");
        assertThat(response.getEmail()).isEqualTo("admin@test.com");
        assertThat(response.getTokenType()).isEqualTo("Bearer");
        verify(refreshTokenRepository, times(1)).save(any(RefreshToken.class));
    }

    @Test
    @Order(1)
    @DisplayName("登录成功的 LoginResponse 携带角色列表")
    void login_ShouldIncludeRoles_InResponse() {
        LoginRequest request = new LoginRequest();
        request.setEmail("admin@test.com");
        request.setPassword("password");

        UsernamePasswordAuthenticationToken authToken =
                new UsernamePasswordAuthenticationToken(mockPrincipal, null, mockPrincipal.getAuthorities());

        when(authenticationManager.authenticate(any())).thenReturn(authToken);
        when(jwtUtil.generateAccessToken(any())).thenReturn("access-token");
        when(jwtUtil.generateRefreshToken(any())).thenReturn("refresh-token");
        when(userRepository.getReferenceById(1L)).thenReturn(mockUser);

        LoginResponse response = authService.login(request);

        // mockPrincipal 在 setUp 里挂的是 ADMIN，UserPrincipal 会自动加 ROLE_ 前缀；
        // buildLoginResponse 应去掉前缀，只回传裸 role 名
        assertThat(response.getRoles()).containsExactly("ADMIN");
    }

    @Test
    @Order(2)
    @DisplayName("密码错误登录失败抛出异常")
    void login_ShouldThrowException_WhenCredentialsAreInvalid() {
        // Arrange
        LoginRequest request = new LoginRequest();
        request.setEmail("admin@test.com");
        request.setPassword("wrongpassword");

        when(authenticationManager.authenticate(any()))
                .thenThrow(new BadCredentialsException("Bad credentials"));

        // Act & Assert
        assertThatThrownBy(() -> authService.login(request))
                .isInstanceOf(BadCredentialsException.class)
                .hasMessage("Invalid email or password");
    }

    @Test
    @Order(3)
    @DisplayName("Refresh Token 成功刷新返回新 Token 对")
    void refreshToken_ShouldReturnNewTokens_WhenTokenIsValid() {
        // Arrange
        String oldRefreshToken = "old-refresh-token";

        RefreshToken storedToken = new RefreshToken();
        storedToken.setRevoked(false);
        storedToken.setExpiresAt(LocalDateTime.now().plusDays(7));
        storedToken.setUser(mockUser);

        when(jwtUtil.isRefreshToken(oldRefreshToken)).thenReturn(true);
        when(refreshTokenRepository.findByTokenHash(any())).thenReturn(Optional.of(storedToken));
        when(jwtUtil.extractEmail(oldRefreshToken)).thenReturn("admin@test.com");
        when(userDetailsService.loadUserByUsername("admin@test.com")).thenReturn(mockPrincipal);
        when(jwtUtil.generateAccessToken(any())).thenReturn("new-access-token");
        when(jwtUtil.generateRefreshToken(any())).thenReturn("new-refresh-token");
        when(userRepository.getReferenceById(1L)).thenReturn(mockUser);

        // Act
        LoginResponse response = authService.refreshToken(oldRefreshToken);

        // Assert
        assertThat(response.getAccessToken()).isEqualTo("new-access-token");
        assertThat(response.getRefreshToken()).isEqualTo("new-refresh-token");
        assertThat(storedToken.isRevoked()).isTrue();
        verify(refreshTokenRepository, times(2)).save(any());
    }

    @Test
    @Order(4)
    @DisplayName("已吊销的 Refresh Token 刷新失败")
    void refreshToken_ShouldThrowException_WhenTokenIsRevoked() {
        // Arrange
        String revokedToken = "revoked-token";

        RefreshToken storedToken = new RefreshToken();
        storedToken.setRevoked(true);
        storedToken.setExpiresAt(LocalDateTime.now().plusDays(7));
        storedToken.setUser(mockUser);

        when(jwtUtil.isRefreshToken(revokedToken)).thenReturn(true);
        when(refreshTokenRepository.findByTokenHash(any())).thenReturn(Optional.of(storedToken));

        // Act & Assert
        assertThatThrownBy(() -> authService.refreshToken(revokedToken))
                .isInstanceOf(BadCredentialsException.class)
                .hasMessage("Refresh token is invalid or expired");

        verify(refreshTokenRepository, times(1)).revokeAllByUserId(any());
    }

    @Test
    @Order(5)
    @DisplayName("登出成功吊销所有 Refresh Token")
    void logout_ShouldRevokeAllTokens() {
        // Act
        authService.logout(1L);

        // Assert
        verify(refreshTokenRepository, times(1)).revokeAllByUserId(1L);
    }
}