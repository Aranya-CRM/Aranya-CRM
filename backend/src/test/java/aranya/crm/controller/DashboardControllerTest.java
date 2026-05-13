package aranya.crm.controller;

import aranya.crm.dto.response.DashboardResponse;
import aranya.crm.service.DashboardService;
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

import java.util.List;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(controllers = DashboardController.class)
@Import(DashboardControllerTest.TestSecurityConfig.class)
class DashboardControllerTest {

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
    private DashboardService dashboardService;

    @MockitoBean
    private UserService userService;

    @Test
    @DisplayName("GET /api/v1/dashboard returns dashboard data blocks")
    @WithMockUser(roles = "SOCIAL_WORKER")
    void getDashboard_returnsDashboardDataBlocks() throws Exception {
        when(dashboardService.getDashboard(any())).thenReturn(
                DashboardResponse.builder()
                        .designSystem(DashboardResponse.DesignSystem.builder()
                                .name("aranya-crm-dashboard")
                                .version("1.0")
                                .build())
                        .screen(DashboardResponse.Screen.builder()
                                .id("dashboard")
                                .version("2026-05-13")
                                .build())
                        .sections(List.of(
                                DashboardResponse.Section.builder()
                                        .id("sw.stats")
                                        .stats(List.of(DashboardResponse.Stat.builder()
                                                .id("activeMonastics")
                                                .value("3")
                                                .build()))
                                        .build()
                        ))
                        .metadata(DashboardResponse.Metadata.now())
                        .build()
        );

        mockMvc.perform(get("/api/v1/dashboard"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.screen.id").value("dashboard"))
                .andExpect(jsonPath("$.sections[0].id").value("sw.stats"))
                .andExpect(jsonPath("$.sections[0].stats[0].id").value("activeMonastics"))
                .andExpect(jsonPath("$.sections[0].stats[0].value").value("3"))
                .andExpect(jsonPath("$.sections[0].type").doesNotExist())
                .andExpect(jsonPath("$.sections[0].title").doesNotExist());
    }

    @Test
    @DisplayName("Old dashboard route is not exposed")
    @WithMockUser(roles = "SOCIAL_WORKER")
    void oldDashboardRoute_isNotExposed() throws Exception {
        mockMvc.perform(get("/api/dashboard"))
                .andExpect(status().isNotFound());
    }
}
