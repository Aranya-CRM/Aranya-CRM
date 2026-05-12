package aranya.crm.controller;

import aranya.crm.dto.response.ClientSummaryResponse;
import aranya.crm.dto.response.ClientDetailResponse;
import aranya.crm.dto.response.RelatedContactResponse;
import aranya.crm.service.ClientService;
import aranya.crm.service.UserService;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Import;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import java.time.LocalDateTime;
import java.util.List;

import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(controllers = ClientController.class)
@Import(ClientControllerTest.TestSecurityConfig.class)
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
    private UserService userService;

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
}
