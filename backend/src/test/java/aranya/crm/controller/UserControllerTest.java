package aranya.crm.controller;

import aranya.crm.dto.response.MeResponse;
import aranya.crm.dto.UserSummaryDto;
import aranya.crm.service.UserService;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Import;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.test.web.servlet.MockMvc;

import java.util.List;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.doNothing;
import static org.mockito.Mockito.when;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(controllers = UserController.class)
@Import(UserControllerTest.TestSecurityConfig.class)
class UserControllerTest {

    /**
     * 测试用最小 Security 配置：
     * - HTTP 层 permitAll（让所有请求穿透到 controller）
     * - @EnableMethodSecurity 让 @PreAuthorize 生效
     * - 保留 SecurityFilterChain 是为了让 ExceptionTranslationFilter 把
     *   method-security 抛出的 AccessDeniedException 翻成 403。
     */
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

    @MockBean
    private UserService userService;

    // 下面两个 mock 仅用于满足 @WebMvcTest 扫到 JwtAuthFilter 后的构造依赖；
    // 测试本身不会触发 JwtAuthFilter 的真实逻辑（请求里没 Authorization header，
    // filter 直接 pass-through）。
    @MockBean
    private JwtUtil jwtUtil;

    @MockBean
    private CustomUserDetailsService customUserDetailsService;

    @Test
    @DisplayName("Manager 调用 GET /api/v1/users 返回 200")
    @WithMockUser(roles = "MANAGER")
    void list_returns200_forManager() throws Exception {
        when(userService.listUsers()).thenReturn(List.of(
                UserSummaryDto.builder()
                        .id(1L).username("u").email("u@x.com").fullName("U")
                        .status("ACTIVE").roles(List.of("MANAGER"))
                        .build()
        ));

        mockMvc.perform(get("/api/v1/users"))
                .andExpect(status().isOk());
    }

    @Test
    @DisplayName("Volunteer 调用 GET /api/v1/users 返回 403")
    @WithMockUser(roles = "VOLUNTEER")
    void list_returns403_forVolunteer() throws Exception {
        mockMvc.perform(get("/api/v1/users"))
                .andExpect(status().isForbidden());
    }

    @Test
    @DisplayName("Social Worker 调用 GET /api/v1/users 返回 403")
    @WithMockUser(roles = "SOCIAL_WORKER")
    void list_returns403_forSocialWorker() throws Exception {
        mockMvc.perform(get("/api/v1/users"))
                .andExpect(status().isForbidden());
    }

    @Test
    @DisplayName("Manager 调用 DELETE /api/v1/users/{id} 返回 204")
    @WithMockUser(roles = "MANAGER")
    void delete_returns204_forManager() throws Exception {
        doNothing().when(userService).deleteUser(eq(42L));

        mockMvc.perform(delete("/api/v1/users/42").with(csrf()))
                .andExpect(status().isNoContent());
    }

    @Test
    @DisplayName("Volunteer 调用 DELETE /api/v1/users/{id} 返回 403")
    @WithMockUser(roles = "VOLUNTEER")
    void delete_returns403_forVolunteer() throws Exception {
        mockMvc.perform(delete("/api/v1/users/42").with(csrf()))
                .andExpect(status().isForbidden());
    }

    /* ── /me endpoint：方法级 isAuthenticated() 显式覆盖类级 hasRole('MANAGER') ── */

    @Test
    @DisplayName("Volunteer 调用 GET /api/v1/users/me 返回 200 且不返回 roles")
    @WithMockUser(roles = "VOLUNTEER")
    void me_returns200_forVolunteer() throws Exception {
        when(userService.getCurrentUser(any())).thenReturn(
                MeResponse.builder()
                        .id(2L).email("v@x.com").fullName("V")
                        .build()
        );

        mockMvc.perform(get("/api/v1/users/me"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.roles").doesNotExist());
    }

    @Test
    @DisplayName("Social Worker 调用 GET /api/v1/users/me 返回 200 且不返回 roles")
    @WithMockUser(roles = "SOCIAL_WORKER")
    void me_returns200_forSocialWorker() throws Exception {
        when(userService.getCurrentUser(any())).thenReturn(
                MeResponse.builder()
                        .id(3L).email("sw@x.com").fullName("SW")
                        .build()
        );

        mockMvc.perform(get("/api/v1/users/me"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.roles").doesNotExist());
    }

    @Test
    @DisplayName("Manager 调用 GET /api/v1/users/me 返回 200 且不返回 roles")
    @WithMockUser(roles = "MANAGER")
    void me_returns200_forManager() throws Exception {
        when(userService.getCurrentUser(any())).thenReturn(
                MeResponse.builder()
                        .id(1L).email("admin@x.com").fullName("Admin")
                        .build()
        );

        mockMvc.perform(get("/api/v1/users/me"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.roles").doesNotExist());
    }

    @Test
    @DisplayName("匿名（未登录）调用 GET /api/v1/users/me 返回 403")
    void me_returns403_forAnonymous() throws Exception {
        mockMvc.perform(get("/api/v1/users/me"))
                .andExpect(status().isForbidden());
    }
}
