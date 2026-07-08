package aranya.crm.controller;

import aranya.crm.config.WebMvcConfig;
import aranya.crm.dto.UserSummaryDto;
import aranya.crm.security.CapPermissionEvaluator;
import aranya.crm.security.annotation.CurrentUserArgumentResolver;
import aranya.crm.service.UserService;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.context.annotation.Bean;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import java.util.List;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * GET /api/v1/users —— 只读的可指派用户列表(派工/审批指派用)。
 * 账号管理写操作已迁至 {@link AdminUserController}(见 AdminUserControllerTest)。
 */
@WebMvcTest(controllers = UserController.class)
@org.springframework.context.annotation.Import({
        UserControllerTest.TestSecurityConfig.class,
        WebMvcConfig.class,
        CurrentUserArgumentResolver.class
})
class UserControllerTest {

    @TestConfiguration
    @EnableWebSecurity
    @EnableMethodSecurity
    static class TestSecurityConfig {
        @Bean
        SecurityFilterChain testFilterChain(HttpSecurity http) throws Exception {
            http.csrf(AbstractHttpConfigurer::disable)
                    .authorizeHttpRequests(a -> a.anyRequest().permitAll());
            return http.build();
        }
    }

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private UserService userService;

    @MockitoBean
    private CapPermissionEvaluator capEval;

    @BeforeEach
    void setUpCaps() {
        when(capEval.hasCap(any(), eq("admin:users.manage"))).thenAnswer(invocation -> {
            Object auth = invocation.getArgument(0);
            return auth instanceof org.springframework.security.core.Authentication authentication
                    && authentication.getAuthorities().stream().anyMatch(a -> "ROLE_MANAGER".equals(a.getAuthority()));
        });
        when(capEval.hasCap(any(), eq("cases:services.create"))).thenAnswer(invocation -> {
            Object auth = invocation.getArgument(0);
            return auth instanceof org.springframework.security.core.Authentication authentication
                    && authentication.getAuthorities().stream().anyMatch(a -> "ROLE_SOCIAL_WORKER".equals(a.getAuthority()));
        });
    }

    @Test
    @DisplayName("Manager can list users — 200 with body")
    @WithMockUser(roles = "MANAGER")
    void list_returns200_forManager() throws Exception {
        when(userService.listUsers()).thenReturn(List.of(
                UserSummaryDto.builder()
                        .id(1L)
                        .username("u")
                        .email("u@x.com")
                        .fullName("U")
                        .status("ACTIVE")
                        .roles(List.of("MANAGER"))
                        .build()
        ));

        mockMvc.perform(get("/api/v1/users"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].id").value(1))
                .andExpect(jsonPath("$[0].email").value("u@x.com"))
                .andExpect(jsonPath("$[0].roles[0]").value("MANAGER"));
    }

    @Test
    @DisplayName("Volunteer cannot list users — 403")
    @WithMockUser(roles = "VOLUNTEER")
    void list_returns403_forVolunteer() throws Exception {
        mockMvc.perform(get("/api/v1/users"))
                .andExpect(status().isForbidden());
    }

    @Test
    @DisplayName("Social Worker can list users for service assignment — 200")
    @WithMockUser(roles = "SOCIAL_WORKER")
    void list_returns200_forSocialWorker() throws Exception {
        when(userService.listUsers()).thenReturn(List.of(
                UserSummaryDto.builder()
                        .id(2L)
                        .username("volunteer")
                        .email("v@x.com")
                        .fullName("Volunteer")
                        .status("ACTIVE")
                        .roles(List.of("VOLUNTEER"))
                        .build()
        ));

        mockMvc.perform(get("/api/v1/users"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].roles[0]").value("VOLUNTEER"));
    }
}
