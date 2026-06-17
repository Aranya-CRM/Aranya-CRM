package aranya.crm.controller;

import aranya.crm.config.WebMvcConfig;
import aranya.crm.dto.response.ClientDetailResponse;
import aranya.crm.dto.response.ClientSummaryResponse;
import aranya.crm.dto.response.RelatedContactResponse;
import aranya.crm.dto.response.ApprovalRequestResponse;
import aranya.crm.entity.User;
import aranya.crm.security.CapPermissionEvaluator;
import aranya.crm.security.annotation.CurrentUserArgumentResolver;
import aranya.crm.service.ApprovalService;
import aranya.crm.service.ClientService;
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

import java.time.LocalDateTime;
import java.util.List;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.authentication;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(controllers = ClientController.class)
@Import({
        ClientControllerTest.TestSecurityConfig.class,
        WebMvcConfig.class,
        CurrentUserArgumentResolver.class
})
class ClientControllerTest {

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
    private ClientService clientService;

    @MockitoBean
    private ApprovalService approvalService;

    @MockitoBean
    private UserService userService;

    @MockitoBean
    private CapPermissionEvaluator capEval;

    @Test
    @DisplayName("Authenticated user can list clients")
    @WithMockUser(roles = "VOLUNTEER")
    void listClients_returns200_forAuthenticatedUser() throws Exception {
        when(clientService.listClients("tan", "ACTIVE")).thenReturn(List.of(
                ClientSummaryResponse.builder()
                        .id(10L)
                        .abbr("C001")
                        .nameEn("Tan Mei Lin")
                        .nameChn("陈美玲")
                        .area("Hougang")
                        .membershipStatus("ACTIVE")
                        .build()
        ));

        mockMvc.perform(get("/api/v1/clients")
                        .param("q", "tan")
                        .param("membershipStatus", "ACTIVE"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].id").value(10))
                .andExpect(jsonPath("$[0].abbr").value("C001"))
                .andExpect(jsonPath("$[0].area").value("Hougang"));
    }

    @Test
    @DisplayName("Anonymous user cannot list clients")
    void listClients_returns403_forAnonymousUser() throws Exception {
        mockMvc.perform(get("/api/v1/clients"))
                .andExpect(status().isForbidden());
    }

    @Test
    @DisplayName("Authenticated user can get client detail")
    @WithMockUser(roles = "VOLUNTEER")
    void getClientDetail_returns200_forAuthenticatedUser() throws Exception {
        when(clientService.getClientDetail(10L)).thenReturn(
                ClientDetailResponse.builder()
                        .id(10L)
                        .abbr("C001")
                        .nameEn("Tan Mei Lin")
                        .nameChn("陈美玲")
                        .contact("91234567")
                        .membershipStatus("ACTIVE")
                        .createdAt(LocalDateTime.of(2026, 5, 7, 9, 30))
                        .relatedContacts(List.of(
                                RelatedContactResponse.builder()
                                        .id(20L)
                                        .name("Tan Wei")
                                        .relationshipType("Son")
                                        .primary(true)
                                        .build()
                        ))
                        .build()
        );

        mockMvc.perform(get("/api/v1/clients/10"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(10))
                .andExpect(jsonPath("$.abbr").value("C001"))
                .andExpect(jsonPath("$.relatedContacts[0].name").value("Tan Wei"))
                .andExpect(jsonPath("$.cases").doesNotExist());
    }

    @Test
    @DisplayName("Anonymous user cannot get client detail")
    void getClientDetail_returns403_forAnonymousUser() throws Exception {
        mockMvc.perform(get("/api/v1/clients/10"))
                .andExpect(status().isForbidden());
    }

    // ── createClient ────────────────────────────────────────────────────────

    private static final String VALID_CREATE_BODY = """
            {"nameEn":"John Smith","abbr":"JS","buddhistTradition":"Mahayana"}
            """;

    @Test
    @DisplayName("Manager create client submits approval request — 202")
    void createClient_returns202Approval_forManager() throws Exception {
        User manager = managerUser(1L);
        when(capEval.hasCap(any(), eq("clients:create"))).thenReturn(true);
        when(approvalService.createRequest(eq("CLIENT_CREATE"), eq("CLIENT"), eq(null), any(), eq(manager)))
                .thenReturn(approvalResponse(90L, "CLIENT_CREATE"));

        mockMvc.perform(post("/api/v1/clients")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(VALID_CREATE_BODY)
                        .with(authentication(authFor(manager, "ROLE_MANAGER"))))
                .andExpect(status().isAccepted())
                .andExpect(jsonPath("$.id").value(90))
                .andExpect(jsonPath("$.type").value("CLIENT_CREATE"));

        verify(clientService, never()).createClient(any(), any());
    }

    @Test
    @DisplayName("Social Worker create client submits approval request — 202")
    void createClient_returns202Approval_forSocialWorker() throws Exception {
        User socialWorker = socialWorkerUser(2L);
        when(capEval.hasCap(any(), eq("clients:create"))).thenReturn(true);
        when(approvalService.createRequest(eq("CLIENT_CREATE"), eq("CLIENT"), eq(null), any(), eq(socialWorker)))
                .thenReturn(approvalResponse(92L, "CLIENT_CREATE"));

        mockMvc.perform(post("/api/v1/clients")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(VALID_CREATE_BODY)
                        .with(authentication(authFor(socialWorker, "ROLE_SOCIAL_WORKER"))))
                .andExpect(status().isAccepted())
                .andExpect(jsonPath("$.id").value(92))
                .andExpect(jsonPath("$.type").value("CLIENT_CREATE"));
    }

    @Test
    @DisplayName("Volunteer cannot create a client — 403")
    @WithMockUser(roles = "VOLUNTEER")
    void createClient_returns403_forVolunteer() throws Exception {
        mockMvc.perform(post("/api/v1/clients")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(VALID_CREATE_BODY))
                .andExpect(status().isForbidden());
    }

    @Test
    @DisplayName("Anonymous user cannot create a client — 403")
    void createClient_returns403_forAnonymousUser() throws Exception {
        mockMvc.perform(post("/api/v1/clients")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(VALID_CREATE_BODY))
                .andExpect(status().isForbidden());
    }

    @Test
    @DisplayName("Missing required fields returns 400")
    @WithMockUser(roles = "MANAGER")
    void createClient_returns400_whenRequiredFieldsMissing() throws Exception {
        mockMvc.perform(post("/api/v1/clients")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{}"))
                .andExpect(status().isBadRequest());
    }

    // ── updateClient ─────────────────────────────────────────────────────────

    @Test
    @DisplayName("Manager update client submits approval request — 202")
    void updateClient_returns202Approval_forManager() throws Exception {
        User manager = managerUser(1L);
        when(capEval.hasCap(any(), eq("clients:update"))).thenReturn(true);
        when(approvalService.createRequest(eq("CLIENT_UPDATE"), eq("CLIENT"), eq(10L), any(), eq(manager)))
                .thenReturn(approvalResponse(93L, "CLIENT_UPDATE"));

        mockMvc.perform(patch("/api/v1/clients/10")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"nameEn":"Updated Name"}
                                """)
                        .with(authentication(authFor(manager, "ROLE_MANAGER"))))
                .andExpect(status().isAccepted())
                .andExpect(jsonPath("$.id").value(93))
                .andExpect(jsonPath("$.type").value("CLIENT_UPDATE"));

        verify(clientService, never()).updateClient(any(), any());
    }

    @Test
    @DisplayName("Volunteer cannot update a client — 403")
    @WithMockUser(roles = "VOLUNTEER")
    void updateClient_returns403_forVolunteer() throws Exception {
        mockMvc.perform(patch("/api/v1/clients/10")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"nameEn":"Updated Name"}
                                """))
                .andExpect(status().isForbidden());
    }

    @Test
    @DisplayName("Social Worker cannot update a client — 403")
    @WithMockUser(roles = "SOCIAL_WORKER")
    void updateClient_returns403_forSocialWorker() throws Exception {
        mockMvc.perform(patch("/api/v1/clients/10")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"nameEn":"Updated Name"}
                                """))
                .andExpect(status().isForbidden());
    }

    @Test
    @DisplayName("Anonymous user cannot update a client — 403")
    void updateClient_returns403_forAnonymousUser() throws Exception {
        mockMvc.perform(patch("/api/v1/clients/10")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"nameEn":"Updated Name"}
                                """))
                .andExpect(status().isForbidden());
    }

    @Test
    @DisplayName("Manager delete submits client deletion approval — 202")
    void deleteClient_returns202_forManager() throws Exception {
        User manager = managerUser(1L);
        when(capEval.hasCap(any(), eq("clients:delete"))).thenReturn(true);
        when(approvalService.createRequest(eq("DELETE_CLIENT"), eq("CLIENT"), eq(10L), any(), eq(manager)))
                .thenReturn(approvalResponse(91L, "DELETE_CLIENT"));

        mockMvc.perform(delete("/api/v1/clients/10")
                        .with(authentication(authFor(manager, "ROLE_MANAGER"))))
                .andExpect(status().isAccepted())
                .andExpect(jsonPath("$.id").value(91))
                .andExpect(jsonPath("$.type").value("DELETE_CLIENT"));
    }

    // ── helpers ───────────────────────────────────────────────────────────────

    private static UsernamePasswordAuthenticationToken managerAuth(Long id) {
        return authFor(managerUser(id), "ROLE_MANAGER");
    }

    private static User managerUser(Long id) {
        User user = new User();
        user.setId(id);
        user.setUsername("manager");
        user.setEmail("manager@test.com");
        user.setFullName("Manager User");
        user.setStatus("ACTIVE");
        return user;
    }

    private static User socialWorkerUser(Long id) {
        User user = new User();
        user.setId(id);
        user.setUsername("social-worker");
        user.setEmail("sw@test.com");
        user.setFullName("Social Worker");
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
