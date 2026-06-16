package aranya.crm.controller;

import aranya.crm.service.UiManifestService;
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

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.util.Map;

@WebMvcTest(controllers = UiManifestController.class)
@Import(UiManifestControllerTest.TestSecurityConfig.class)
class UiManifestControllerTest {

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
    private UiManifestService uiManifestService;

    @MockitoBean
    private UserService userService;

    @Test
    @DisplayName("Manifest returns cap scopes without role or layout fields")
    @WithMockUser(username = "volunteer@test.com", roles = "VOLUNTEER")
    void manifest_returnsCapabilityIds_withoutRoleOrLayoutFields() throws Exception {
        when(uiManifestService.buildCaps(any())).thenReturn(Map.of(
                "route:tasks", "YES",
                "tasks.list", "YES"
        ));

        mockMvc.perform(get("/api/ui/manifest"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.caps['route:tasks']").value("YES"))
                .andExpect(jsonPath("$.caps['tasks.list']").value("YES"))
                .andExpect(jsonPath("$.navigation").doesNotExist())
                .andExpect(jsonPath("$.pages").doesNotExist())
                .andExpect(jsonPath("$.sharedRegistry").doesNotExist())
                .andExpect(jsonPath("$.session").doesNotExist())
                .andExpect(jsonPath("$.roles").doesNotExist());
    }

    @Test
    @DisplayName("Anonymous manifest request returns 403")
    void manifest_returns403_forAnonymous() throws Exception {
        mockMvc.perform(get("/api/ui/manifest"))
                .andExpect(status().isForbidden());
    }
}
