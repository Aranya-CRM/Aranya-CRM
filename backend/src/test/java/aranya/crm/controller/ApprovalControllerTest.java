package aranya.crm.controller;

import aranya.crm.config.WebMvcConfig;
import aranya.crm.dto.response.ApprovalRequestResponse;
import aranya.crm.entity.User;
import aranya.crm.security.CapPermissionEvaluator;
import aranya.crm.security.annotation.CurrentUserArgumentResolver;
import aranya.crm.service.ApprovalService;
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
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import java.util.List;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.authentication;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(controllers = ApprovalController.class)
@Import({
        ApprovalControllerTest.TestSecurityConfig.class,
        WebMvcConfig.class,
        CurrentUserArgumentResolver.class
})
class ApprovalControllerTest {

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
    private ApprovalService approvalService;

    @MockitoBean
    private CapPermissionEvaluator capEval;

    @Test
    @DisplayName("Manager can list pending approvals")
    void listPending_returnsPendingApprovals() throws Exception {
        when(capEval.hasCap(any(), eq("approvals:view"))).thenReturn(true);
        when(approvalService.listPending()).thenReturn(List.of(approval(1L, "CASE_CREATE", "PENDING")));

        mockMvc.perform(get("/api/v1/approvals")
                        .with(authentication(auth(manager()))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].id").value(1))
                .andExpect(jsonPath("$[0].type").value("CASE_CREATE"));
    }

    @Test
    @DisplayName("Manager can approve an approval request")
    void approve_returnsApprovedRequest() throws Exception {
        User manager = manager();
        when(capEval.hasCap(any(), eq("approvals:decide"))).thenReturn(true);
        when(approvalService.approve(eq(1L), eq(manager), eq("ok")))
                .thenReturn(approval(1L, "CASE_CREATE", "APPROVED"));

        mockMvc.perform(post("/api/v1/approvals/1/approve")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"comment\":\"ok\"}")
                        .with(authentication(auth(manager))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("APPROVED"));
    }

    @Test
    @DisplayName("Manager can reject an approval request")
    void reject_returnsRejectedRequest() throws Exception {
        User manager = manager();
        when(capEval.hasCap(any(), eq("approvals:decide"))).thenReturn(true);
        when(approvalService.reject(eq(2L), eq(manager), eq("missing info")))
                .thenReturn(approval(2L, "DELETE_CLIENT", "REJECTED"));

        mockMvc.perform(post("/api/v1/approvals/2/reject")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"comment\":\"missing info\"}")
                        .with(authentication(auth(manager))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("REJECTED"));
    }

    private static ApprovalRequestResponse approval(Long id, String type, String status) {
        return ApprovalRequestResponse.builder()
                .id(id)
                .type(type)
                .status(status)
                .build();
    }

    private static User manager() {
        User user = new User();
        user.setId(10L);
        user.setUsername("manager");
        user.setEmail("manager@test.com");
        user.setFullName("Manager User");
        user.setStatus("ACTIVE");
        return user;
    }

    private static UsernamePasswordAuthenticationToken auth(User user) {
        return new UsernamePasswordAuthenticationToken(
                user,
                null,
                List.of(new SimpleGrantedAuthority("ROLE_MANAGER"))
        );
    }
}
