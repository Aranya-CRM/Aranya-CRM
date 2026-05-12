package aranya.crm.controller;

import aranya.crm.dto.response.MeResponse;
import aranya.crm.config.WebMvcConfig;
import aranya.crm.entity.User;
import aranya.crm.security.annotation.CurrentUserArgumentResolver;
import aranya.crm.service.UserService;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Import;
import org.springframework.security.authentication.TestingAuthenticationToken;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import static org.mockito.ArgumentMatchers.same;
import static org.mockito.Mockito.when;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.authentication;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(controllers = AuthController.class)
@Import({
        AuthControllerTest.TestSecurityConfig.class,
        WebMvcConfig.class,
        CurrentUserArgumentResolver.class
})
class AuthControllerTest {

    @TestConfiguration
    @EnableWebSecurity
    static class TestSecurityConfig {
        @Bean
        SecurityFilterChain testFilterChain(HttpSecurity http) throws Exception {
            http.csrf(AbstractHttpConfigurer::disable)
                    .formLogin(AbstractHttpConfigurer::disable)
                    .httpBasic(AbstractHttpConfigurer::disable)
                    .authorizeHttpRequests(a -> a.anyRequest().authenticated());
            return http.build();
        }
    }

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private UserService userService;

    @Test
    @DisplayName("Volunteer can call GET /api/v1/auth/me")
    void me_returns200_forVolunteer() throws Exception {
        User currentUser = user(2L, "v@x.com", "V");
        when(userService.getCurrentUser(same(currentUser))).thenReturn(
                MeResponse.builder()
                        .id(2L)
                        .email("v@x.com")
                        .fullName("V")
                        .build()
        );

        mockMvc.perform(get("/api/v1/auth/me")
                        .with(authentication(authenticationFor(currentUser, "ROLE_VOLUNTEER"))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(2))
                .andExpect(jsonPath("$.email").value("v@x.com"))
                .andExpect(jsonPath("$.roles").doesNotExist());
    }

    @Test
    @DisplayName("Social Worker can call GET /api/v1/auth/me")
    void me_returns200_forSocialWorker() throws Exception {
        User currentUser = user(3L, "sw@x.com", "SW");
        when(userService.getCurrentUser(same(currentUser))).thenReturn(
                MeResponse.builder()
                        .id(3L)
                        .email("sw@x.com")
                        .fullName("SW")
                        .build()
        );

        mockMvc.perform(get("/api/v1/auth/me")
                        .with(authentication(authenticationFor(currentUser, "ROLE_SOCIAL_WORKER"))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(3))
                .andExpect(jsonPath("$.roles").doesNotExist());
    }

    @Test
    @DisplayName("Manager can call GET /api/v1/auth/me")
    void me_returns200_forManager() throws Exception {
        User currentUser = user(1L, "admin@x.com", "Admin");
        when(userService.getCurrentUser(same(currentUser))).thenReturn(
                MeResponse.builder()
                        .id(1L)
                        .email("admin@x.com")
                        .fullName("Admin")
                        .build()
        );

        mockMvc.perform(get("/api/v1/auth/me")
                        .with(authentication(authenticationFor(currentUser, "ROLE_MANAGER"))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(1))
                .andExpect(jsonPath("$.roles").doesNotExist());
    }

    @Test
    @DisplayName("Anonymous cannot call GET /api/v1/auth/me")
    void me_returns401_forAnonymous() throws Exception {
        mockMvc.perform(get("/api/v1/auth/me"))
                .andExpect(status().isUnauthorized());
    }

    private static TestingAuthenticationToken authenticationFor(User user, String authority) {
        return new TestingAuthenticationToken(user, null, authority);
    }

    private static User user(Long id, String email, String fullName) {
        User user = new User();
        user.setId(id);
        user.setFirebaseUid("firebase-" + id);
        user.setUsername(email);
        user.setEmail(email);
        user.setFullName(fullName);
        user.setStatus("ACTIVE");
        return user;
    }
}
