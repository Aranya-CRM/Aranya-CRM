package aranya.crm.security.util;

import aranya.crm.config.AppProperties;
import org.junit.jupiter.api.*;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.mockito.junit.jupiter.MockitoSettings;
import org.mockito.quality.Strictness;
import org.springframework.security.core.userdetails.UserDetails;

import static org.assertj.core.api.AssertionsForClassTypes.assertThat;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
@TestMethodOrder(MethodOrderer.OrderAnnotation.class)
class JavaUtilTest {

    @Mock
    private AppProperties appProperties;

    @Mock
    private AppProperties.JwtProperties jwtProperties;

    @InjectMocks
    private JwtUtil jwtUtil;

    private UserDetails userDetails;

    @BeforeEach
    void setUp() {
        when(appProperties.getJwt()).thenReturn(jwtProperties);
        when(jwtProperties.getSecret())
                .thenReturn("3f8a2b1c9d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a");
        when(jwtProperties.getAccessTokenExpiration()).thenReturn(3600000L);
        when(jwtProperties.getRefreshTokenExpiration()).thenReturn(604800000L);

        jwtUtil.init();

        userDetails = org.springframework.security.core.userdetails.User
                .withUsername("admin@test.com")
                .password("password")
                .roles("ADMIN")
                .build();
    }

    @Test
    @Order(1)
    @DisplayName("1.生成AccessToken不为空")
    void generateAccessToken_ShouldReturnNonNullToken() {
        String token = jwtUtil.generateAccessToken(userDetails);
        assertThat(token).isNotNull().isNotEmpty();
    }

    @Test
    @Order(2)
    @DisplayName("Access Token 能正确解析出 email")
    void extractEmail_ShouldReturnCorrectEmail() {
        String token = jwtUtil.generateAccessToken(userDetails);
        String email = jwtUtil.extractEmail(token);
        assertThat(email).isEqualTo("admin@test.com");
    }

    @Test
    @Order(3)
    @DisplayName("Access Token 验证通过")
    void isTokenValid_ShouldReturnTrue_WhenTokenIsValid() {
        String token = jwtUtil.generateAccessToken(userDetails);
        assertThat(jwtUtil.isTokenValid(token, userDetails)).isTrue();
    }

    @Test
    @Order(4)
    @DisplayName("Access Token 不是 Refresh Token")
    void isRefreshToken_ShouldReturnFalse_ForAccessToken() {
        String token = jwtUtil.generateAccessToken(userDetails);
        assertThat(jwtUtil.isRefreshToken(token)).isFalse();
    }

    @Test
    @Order(5)
    @DisplayName("Refresh Token 识别正确")
    void isRefreshToken_ShouldReturnTrue_ForRefreshToken() {
        String token = jwtUtil.generateRefreshToken(userDetails);
        assertThat(jwtUtil.isRefreshToken(token)).isTrue();
    }

    @Test
    @Order(6)
    @DisplayName("Token 被篡改后验证失败")
    void isTokenValid_ShouldReturnFalse_WhenTokenIsTampered() {
        String token = jwtUtil.generateAccessToken(userDetails);
        String tamperedToken = token + "tampered";
        assertThat(jwtUtil.isTokenValid(tamperedToken, userDetails)).isFalse();
    }

}
