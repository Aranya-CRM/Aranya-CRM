package aranya.crm.controller;

import aranya.crm.config.WebMvcConfig;
import aranya.crm.dto.UserSummaryDto;
import aranya.crm.dto.response.ApprovalRequestResponse;
import aranya.crm.entity.User;
import aranya.crm.security.annotation.CurrentUserArgumentResolver;
import aranya.crm.service.ApprovalService;
import aranya.crm.service.UserService;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import java.util.List;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.authentication;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(controllers = UserController.class)
@Import({
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
    private ApprovalService approvalService;

    // ── GET /api/v1/users ──────────────────────────────────────────────────────

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
    @DisplayName("Social Worker cannot list users — 403")
    @WithMockUser(roles = "SOCIAL_WORKER")
    void list_returns403_forSocialWorker() throws Exception {
        mockMvc.perform(get("/api/v1/users"))
                .andExpect(status().isForbidden());
    }

    // ── POST /api/v1/users/invite ──────────────────────────────────────────────

    private static final String VALID_INVITE_BODY = """
            {"username":"newuser","fullName":"New User","email":"new@x.com","roles":["VOLUNTEER"]}
            """;

    @Test
    @DisplayName("Manager can invite a user — 200")
    void invite_returns200_forManager() throws Exception {
        when(userService.invite(any(), eq(1L))).thenReturn(
                UserSummaryDto.builder()
                        .id(10L)
                        .username("newuser")
                        .email("new@x.com")
                        .fullName("New User")
                        .status("ACTIVE")
                        .roles(List.of("VOLUNTEER"))
                        .build()
        );

        mockMvc.perform(post("/api/v1/users/invite")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(VALID_INVITE_BODY)
                        .with(authentication(authFor(managerUser(1L), "ROLE_MANAGER"))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(10))
                .andExpect(jsonPath("$.roles[0]").value("VOLUNTEER"));
    }

    @Test
    @DisplayName("Social Worker cannot invite a user — 403")
    @WithMockUser(roles = "SOCIAL_WORKER")
    void invite_returns403_forSocialWorker() throws Exception {
        mockMvc.perform(post("/api/v1/users/invite")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(VALID_INVITE_BODY))
                .andExpect(status().isForbidden());
    }

    @Test
    @DisplayName("Invite with missing required fields returns 400")
    void invite_returns400_whenBodyInvalid() throws Exception {
        mockMvc.perform(post("/api/v1/users/invite")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{}")
                        .with(authentication(authFor(managerUser(1L), "ROLE_MANAGER"))))
                .andExpect(status().isBadRequest());
    }

    // ── PATCH /api/v1/users/{id}/roles ─────────────────────────────────────────

    @Test
    @DisplayName("Manager can update user roles — 200")
    void updateRoles_returns200_forManager() throws Exception {
        when(userService.updateRoles(eq(5L), any(), eq(1L))).thenReturn(
                UserSummaryDto.builder()
                        .id(5L)
                        .username("target")
                        .email("target@x.com")
                        .fullName("Target User")
                        .status("ACTIVE")
                        .roles(List.of("MANAGER"))
                        .build()
        );

        mockMvc.perform(patch("/api/v1/users/5/roles")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"roles":["MANAGER"]}
                                """)
                        .with(authentication(authFor(managerUser(1L), "ROLE_MANAGER"))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.roles[0]").value("MANAGER"));
    }

    @Test
    @DisplayName("Social Worker cannot update roles — 403")
    @WithMockUser(roles = "SOCIAL_WORKER")
    void updateRoles_returns403_forSocialWorker() throws Exception {
        mockMvc.perform(patch("/api/v1/users/5/roles")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"roles":["MANAGER"]}
                                """))
                .andExpect(status().isForbidden());
    }

    // ── PATCH /api/v1/users/{id}/status ────────────────────────────────────────

    @Test
    @DisplayName("Manager can update another user's status — 200")
    void updateStatus_returns200_forManager() throws Exception {
        when(userService.updateStatus(eq(5L), eq("INACTIVE"))).thenReturn(
                UserSummaryDto.builder()
                        .id(5L)
                        .username("target")
                        .email("target@x.com")
                        .fullName("Target")
                        .status("INACTIVE")
                        .roles(List.of("VOLUNTEER"))
                        .build()
        );

        mockMvc.perform(patch("/api/v1/users/5/status")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"status":"INACTIVE"}
                                """)
                        .with(authentication(authFor(managerUser(1L), "ROLE_MANAGER"))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("INACTIVE"));
    }

    @Test
    @DisplayName("Manager cannot deactivate their own account — 400")
    void updateStatus_returns400_whenSelfDeactivating() throws Exception {
        mockMvc.perform(patch("/api/v1/users/5/status")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"status":"INACTIVE"}
                                """)
                        .with(authentication(authFor(managerUser(5L), "ROLE_MANAGER"))))
                .andExpect(status().isBadRequest());
    }

    @Test
    @DisplayName("Social Worker cannot update user status — 403")
    @WithMockUser(roles = "SOCIAL_WORKER")
    void updateStatus_returns403_forSocialWorker() throws Exception {
        mockMvc.perform(patch("/api/v1/users/5/status")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"status":"INACTIVE"}
                                """))
                .andExpect(status().isForbidden());
    }

    // ── DELETE /api/v1/users/{id} ──────────────────────────────────────────────

    @Test
    @DisplayName("Manager delete submits approval request — 202")
    @WithMockUser(roles = "MANAGER")
    void delete_returns202_forManager() throws Exception {
        when(approvalService.createRequest(eq("DELETE_USER"), eq("USER"), eq(42L), any(), any()))
                .thenReturn(approvalResponse(90L, "DELETE_USER"));

        mockMvc.perform(delete("/api/v1/users/42"))
                .andExpect(status().isAccepted())
                .andExpect(jsonPath("$.id").value(90))
                .andExpect(jsonPath("$.type").value("DELETE_USER"));
    }

    @Test
    @DisplayName("Manager cannot delete their own account — 400")
    void delete_returns400_forCurrentUser() throws Exception {
        mockMvc.perform(delete("/api/v1/users/42")
                        .with(authentication(authFor(managerUser(42L), "ROLE_MANAGER"))))
                .andExpect(status().isBadRequest());
    }

    @Test
    @DisplayName("Volunteer cannot delete a user — 403")
    @WithMockUser(roles = "VOLUNTEER")
    void delete_returns403_forVolunteer() throws Exception {
        mockMvc.perform(delete("/api/v1/users/42"))
                .andExpect(status().isForbidden());
    }

    // ── helpers ────────────────────────────────────────────────────────────────

    private static User managerUser(Long id) {
        User user = new User();
        user.setId(id);
        user.setUsername("manager");
        user.setEmail("manager@test.com");
        user.setFullName("Manager User");
        user.setStatus("ACTIVE");
        return user;
    }

    private static UsernamePasswordAuthenticationToken authFor(User user, String authority) {
        return new UsernamePasswordAuthenticationToken(
                user, null, List.of(new SimpleGrantedAuthority(authority)));
    }

    private static ApprovalRequestResponse approvalResponse(Long id, String type) {
        return ApprovalRequestResponse.builder()
                .id(id)
                .type(type)
                .status("PENDING")
                .build();
    }
}
