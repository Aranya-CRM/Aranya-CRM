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
    @DisplayName("Manager can create a client — 201 with Location header")
    void createClient_returns201_forManager() throws Exception {
        when(capEval.hasCap(any(), eq("clients:create"))).thenReturn(true);
        when(clientService.createClient(any(), any())).thenReturn(
                ClientDetailResponse.builder()
                        .id(20L)
                        .abbr("JS")
                        .nameEn("John Smith")
                        .membershipStatus("ACTIVE")
                        .createdAt(LocalDateTime.of(2026, 5, 21, 10, 0))
                        .relatedContacts(List.of())
                        .build()
        );

        mockMvc.perform(post("/api/v1/clients")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(VALID_CREATE_BODY)
                        .with(authentication(managerAuth(1L))))
                .andExpect(status().isCreated())
                .andExpect(header().string("Location", org.hamcrest.Matchers.endsWith("/api/v1/clients/20")))
                .andExpect(jsonPath("$.id").value(20))
                .andExpect(jsonPath("$.abbr").value("JS"));
    }

    @Test
    @DisplayName("Social Worker cannot create a client — 403")
    @WithMockUser(roles = "SOCIAL_WORKER")
    void createClient_returns403_forSocialWorker() throws Exception {
        mockMvc.perform(post("/api/v1/clients")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(VALID_CREATE_BODY))
                .andExpect(status().isForbidden());
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
    @DisplayName("Manager can update a client — 200")
    @WithMockUser(roles = "MANAGER")
    void updateClient_returns200_forManager() throws Exception {
        when(capEval.hasCap(any(), eq("clients:update"))).thenReturn(true);
        when(clientService.updateClient(eq(10L), any())).thenReturn(
                ClientDetailResponse.builder()
                        .id(10L)
                        .abbr("C001")
                        .nameEn("Updated Name")
                        .membershipStatus("ACTIVE")
                        .createdAt(LocalDateTime.of(2026, 5, 7, 9, 30))
                        .relatedContacts(List.of())
                        .build()
        );

        mockMvc.perform(patch("/api/v1/clients/10")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"nameEn":"Updated Name"}
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(10))
                .andExpect(jsonPath("$.nameEn").value("Updated Name"));
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
