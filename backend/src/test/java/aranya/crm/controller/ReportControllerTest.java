package aranya.crm.controller;

import aranya.crm.config.WebMvcConfig;
import aranya.crm.dto.response.ApprovalRequestResponse;
import aranya.crm.entity.User;
import aranya.crm.security.CapPermissionEvaluator;
import aranya.crm.security.annotation.CurrentUserArgumentResolver;
import aranya.crm.service.ApprovalService;
import aranya.crm.service.ReportService;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Import;
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
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.authentication;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(controllers = ReportController.class)
@Import({
        ReportControllerTest.TestSecurityConfig.class,
        WebMvcConfig.class,
        CurrentUserArgumentResolver.class
})
class ReportControllerTest {

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
    private ReportService reportService;

    @MockitoBean
    private ApprovalService approvalService;

    @MockitoBean
    private CapPermissionEvaluator capEval;

    @Test
    @DisplayName("Deleting own draft report remains direct delete")
    void deleteReport_deletesOwnDraftDirectly() throws Exception {
        User volunteer = user(10L, "Volunteer");
        when(capEval.hasCap(any(), eq("reports:delete"))).thenReturn(false);
        when(reportService.isOwnDraft(12L, volunteer)).thenReturn(true);

        mockMvc.perform(delete("/api/v1/reports/12")
                        .with(authentication(auth(volunteer, "VOLUNTEER"))))
                .andExpect(status().isNoContent());

        verify(reportService).deleteOwnDraftReport(12L, volunteer);
        verify(approvalService, never()).createRequest(any(), any(), any(), any(), any());
    }

    @Test
    @DisplayName("Manager report delete submits approval request")
    void deleteReport_submitsApprovalForManagerDelete() throws Exception {
        User manager = user(20L, "Manager");
        when(capEval.hasCap(any(), eq("reports:delete"))).thenReturn(true);
        when(approvalService.createRequest(eq("DELETE_REPORT"), eq("REPORT"), eq(12L), any(), eq(manager)))
                .thenReturn(approvalResponse(92L, "DELETE_REPORT"));

        mockMvc.perform(delete("/api/v1/reports/12")
                        .with(authentication(auth(manager, "MANAGER"))))
                .andExpect(status().isAccepted())
                .andExpect(jsonPath("$.id").value(92))
                .andExpect(jsonPath("$.type").value("DELETE_REPORT"));

        verify(reportService, never()).executeApprovedDeleteReport(any(), any());
    }

    private static ApprovalRequestResponse approvalResponse(Long id, String type) {
        return ApprovalRequestResponse.builder()
                .id(id)
                .type(type)
                .status("PENDING")
                .build();
    }

    private static User user(Long id, String fullName) {
        User user = new User();
        user.setId(id);
        user.setUsername("user" + id);
        user.setEmail("user" + id + "@test.com");
        user.setFullName(fullName);
        user.setStatus("ACTIVE");
        return user;
    }

    private static UsernamePasswordAuthenticationToken auth(User user, String roleName) {
        return new UsernamePasswordAuthenticationToken(
                user,
                null,
                List.of(new SimpleGrantedAuthority("ROLE_" + roleName))
        );
    }
}
