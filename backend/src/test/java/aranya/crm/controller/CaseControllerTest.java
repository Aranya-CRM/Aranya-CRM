package aranya.crm.controller;

import aranya.crm.config.WebMvcConfig;
import aranya.crm.dto.response.ApprovalRequestResponse;
import aranya.crm.dto.response.ServiceEventResponse;
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
        when(approvalService.createRequest(eq("CASE_CREATE"), eq("CLIENT"), eq(5L), any(), eq(requester), any(), any()))
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
    @DisplayName("createCase rejects duplicate pending case create approvals for the same client")
    void createCase_rejectsDuplicatePendingCaseCreateApproval() throws Exception {
        User requester = user(10L, "Social Worker");
        when(capEval.hasCap(any(), eq("cases:create"))).thenReturn(true);
        when(approvalService.hasPendingRequest("CASE_CREATE", "CLIENT", 5L)).thenReturn(true);

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
                .andExpect(status().isConflict());

        verify(approvalService, never()).createRequest(eq("CASE_CREATE"), any(), any(), any(), any(), any(), any());
    }

    @Test
    @DisplayName("updateCaseServices submits an approval request instead of updating services")
    void updateCaseServices_submitsApprovalRequest() throws Exception {
        User requester = user(10L, "Social Worker");
        when(capEval.hasCap(any(), eq("cases:services.create"))).thenReturn(true);
        when(approvalService.createRequest(eq("CASE_SERVICE_UPDATE"), eq("CASE"), eq(7L), any(), eq(requester), any(), any()))
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
    @DisplayName("createServiceEvent creates an appointment immediately")
    void createServiceEvent_createsAppointmentImmediately() throws Exception {
        User requester = user(10L, "Social Worker");
        when(capEval.hasCap(any(), eq("cases:services.create"))).thenReturn(true);
        when(caseService.executeApprovedCreateServiceEvent(eq(7L), any(), eq(requester)))
                .thenReturn(ServiceEventResponse.builder()
                        .id(33L)
                        .caseId(7L)
                        .serviceKey("mealDelivery")
                        .assignedUserId(12L)
                        .scheduledStart(LocalDateTime.of(2026, 6, 20, 10, 0))
                        .title("1 Meal Delivery: C001@Office")
                        .build());

        mockMvc.perform(post("/api/v1/cases/7/service-events")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "serviceKey": "mealDelivery",
                                  "assignedUserId": 12,
                                  "scheduledStart": "2026-06-20T10:00:00",
                                  "workDescription": "Deliver lunch and check if follow-up is needed.",
                                  "location": "Office"
                                }
                                """)
                        .with(authentication(auth(requester, "SOCIAL_WORKER"))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(33))
                .andExpect(jsonPath("$.serviceKey").value("mealDelivery"));

        verify(approvalService, never()).createRequest(eq("SERVICE_EVENT_CREATE"), any(), any(), any(), any());
    }

    @Test
    @DisplayName("deleteCaseNote deletes immediately")
    void deleteCaseNote_deletesImmediately() throws Exception {
        User requester = user(10L, "Social Worker");

        mockMvc.perform(delete("/api/v1/cases/7/notes/22")
                        .with(authentication(auth(requester, "SOCIAL_WORKER"))))
                .andExpect(status().isNoContent());

        verify(caseNoteService).deleteOwnCaseNote(7L, 22L, requester);
        verify(approvalService, never()).createRequest(eq("DELETE_CASE_NOTE"), any(), any(), any(), any());
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
