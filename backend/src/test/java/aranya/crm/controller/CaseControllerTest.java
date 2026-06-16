package aranya.crm.controller;

import aranya.crm.config.WebMvcConfig;
import aranya.crm.dto.response.ApprovalRequestResponse;
import aranya.crm.entity.User;
import aranya.crm.security.CapPermissionEvaluator;
import aranya.crm.security.annotation.CurrentUserArgumentResolver;
import aranya.crm.service.ApprovalService;
import aranya.crm.service.CaseNoteService;
import aranya.crm.service.CaseService;
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

import java.time.LocalDateTime;
import java.util.List;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.authentication;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(controllers = CaseController.class)
@Import({
        CaseControllerTest.TestSecurityConfig.class,
        WebMvcConfig.class,
        CurrentUserArgumentResolver.class
})
class CaseControllerTest {

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
    private CaseService caseService;

    @MockitoBean
    private CaseNoteService caseNoteService;

    @MockitoBean
    private ApprovalService approvalService;

    @MockitoBean
    private CapPermissionEvaluator capEval;

    @Test
    @DisplayName("createCase submits an approval request instead of creating a case")
    void createCase_submitsApprovalRequest() throws Exception {
        User requester = user(10L, "Social Worker");
        when(capEval.hasCap(any(), eq("cases:create"))).thenReturn(true);
        when(approvalService.createRequest(eq("CASE_CREATE"), eq("CLIENT"), eq(5L), any(), eq(requester)))
                .thenReturn(approvalResponse(100L, "CASE_CREATE", "CLIENT", 5L));

        mockMvc.perform(post("/api/v1/cases")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "clientId": 5,
                                  "openedAt": "2026-06-15",
                                  "status": "OPEN",
                                  "colorCode": "GREEN",
                                  "services": ["mealDelivery"]
                                }
                                """)
                        .with(authentication(auth(requester, "SOCIAL_WORKER"))))
                .andExpect(status().isAccepted())
                .andExpect(jsonPath("$.id").value(100))
                .andExpect(jsonPath("$.type").value("CASE_CREATE"))
                .andExpect(jsonPath("$.status").value("PENDING"));

        verify(caseService, never()).executeApprovedCreateCase(any(), any());
    }

    @Test
    @DisplayName("updateCaseServices submits an approval request instead of updating services")
    void updateCaseServices_submitsApprovalRequest() throws Exception {
        User requester = user(10L, "Social Worker");
        when(capEval.hasCap(any(), eq("cases:services.create"))).thenReturn(true);
        when(approvalService.createRequest(eq("CASE_SERVICE_UPDATE"), eq("CASE"), eq(7L), any(), eq(requester)))
                .thenReturn(approvalResponse(101L, "CASE_SERVICE_UPDATE", "CASE", 7L));

        mockMvc.perform(patch("/api/v1/cases/7/services")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("[\"mealDelivery\",\"legalAid\"]")
                        .with(authentication(auth(requester, "SOCIAL_WORKER"))))
                .andExpect(status().isAccepted())
                .andExpect(jsonPath("$.id").value(101))
                .andExpect(jsonPath("$.type").value("CASE_SERVICE_UPDATE"));

        verify(caseService, never()).executeApprovedUpdateCaseServices(any(), any());
    }

    @Test
    @DisplayName("createServiceEvent submits an approval request instead of creating an appointment")
    void createServiceEvent_submitsApprovalRequest() throws Exception {
        User requester = user(10L, "Social Worker");
        when(capEval.hasCap(any(), eq("cases:services.create"))).thenReturn(true);
        when(approvalService.createRequest(eq("SERVICE_EVENT_CREATE"), eq("CASE"), eq(7L), any(), eq(requester)))
                .thenReturn(approvalResponse(102L, "SERVICE_EVENT_CREATE", "CASE", 7L));

        mockMvc.perform(post("/api/v1/cases/7/service-events")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "serviceKey": "mealDelivery",
                                  "assignedUserId": 12,
                                  "scheduledStart": "2026-06-20T10:00:00",
                                  "location": "Office"
                                }
                                """)
                        .with(authentication(auth(requester, "SOCIAL_WORKER"))))
                .andExpect(status().isAccepted())
                .andExpect(jsonPath("$.id").value(102))
                .andExpect(jsonPath("$.type").value("SERVICE_EVENT_CREATE"));

        verify(caseService, never()).executeApprovedCreateServiceEvent(any(), any(), any());
    }

    @Test
    @DisplayName("deleteCaseNote submits an approval request instead of deleting immediately")
    void deleteCaseNote_submitsApprovalRequest() throws Exception {
        User requester = user(10L, "Social Worker");
        when(approvalService.createRequest(eq("DELETE_CASE_NOTE"), eq("CASE_NOTE"), eq(22L), any(), eq(requester)))
                .thenReturn(approvalResponse(103L, "DELETE_CASE_NOTE", "CASE_NOTE", 22L));

        mockMvc.perform(delete("/api/v1/cases/7/notes/22")
                        .with(authentication(auth(requester, "SOCIAL_WORKER"))))
                .andExpect(status().isAccepted())
                .andExpect(jsonPath("$.id").value(103))
                .andExpect(jsonPath("$.type").value("DELETE_CASE_NOTE"));

        verify(caseNoteService, never()).executeApprovedDeleteCaseNote(any(), any());
    }

    private static ApprovalRequestResponse approvalResponse(Long id, String type, String targetType, Long targetId) {
        return ApprovalRequestResponse.builder()
                .id(id)
                .type(type)
                .status("PENDING")
                .targetType(targetType)
                .targetId(targetId)
                .payloadJson("{}")
                .requestedById(10L)
                .requestedByName("Social Worker")
                .createdAt(LocalDateTime.of(2026, 6, 15, 10, 0))
                .build();
    }

    private static UsernamePasswordAuthenticationToken auth(User user, String roleName) {
        return new UsernamePasswordAuthenticationToken(
                user,
                null,
                List.of(new SimpleGrantedAuthority("ROLE_" + roleName))
        );
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
}
