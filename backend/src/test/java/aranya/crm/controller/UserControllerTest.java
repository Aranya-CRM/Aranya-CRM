package aranya.crm.controller;

import aranya.crm.entity.User;
import aranya.crm.dto.UserSummaryDto;
import aranya.crm.service.UserService;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Import;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.test.web.servlet.MockMvc;

import java.util.List;

import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.doNothing;
import static org.mockito.Mockito.when;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.authentication;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(controllers = UserController.class)
@Import(UserControllerTest.TestSecurityConfig.class)
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

    @MockBean
    private UserService userService;

    @Test
    @DisplayName("Manager can call GET /api/v1/users")
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
                .andExpect(status().isOk());
    }

    @Test
    @DisplayName("Volunteer cannot call GET /api/v1/users")
    @WithMockUser(roles = "VOLUNTEER")
    void list_returns403_forVolunteer() throws Exception {
        mockMvc.perform(get("/api/v1/users"))
                .andExpect(status().isForbidden());
    }

    @Test
    @DisplayName("Social Worker cannot call GET /api/v1/users")
    @WithMockUser(roles = "SOCIAL_WORKER")
    void list_returns403_forSocialWorker() throws Exception {
        mockMvc.perform(get("/api/v1/users"))
                .andExpect(status().isForbidden());
    }

    @Test
    @DisplayName("Manager can call DELETE /api/v1/users/{id}")
    @WithMockUser(roles = "MANAGER")
    void delete_returns204_forManager() throws Exception {
        doNothing().when(userService).deleteUser(eq(42L));

        mockMvc.perform(delete("/api/v1/users/42").with(csrf()))
                .andExpect(status().isNoContent());
    }

    @Test
    @DisplayName("Manager cannot delete their own account")
    void delete_returns400_forCurrentUser() throws Exception {
        mockMvc.perform(delete("/api/v1/users/42")
                        .with(csrf())
                        .with(authentication(managerAuthentication(42L))))
                .andExpect(status().isBadRequest());
    }

    @Test
    @DisplayName("Volunteer cannot call DELETE /api/v1/users/{id}")
    @WithMockUser(roles = "VOLUNTEER")
    void delete_returns403_forVolunteer() throws Exception {
        mockMvc.perform(delete("/api/v1/users/42").with(csrf()))
                .andExpect(status().isForbidden());
    }

    private UsernamePasswordAuthenticationToken managerAuthentication(Long userId) {
        User user = new User();
        user.setId(userId);
        user.setUsername("manager");
        user.setEmail("manager@test.com");
        user.setFullName("Manager User");
        user.setStatus("ACTIVE");

        return new UsernamePasswordAuthenticationToken(
                user,
                null,
                List.of(new SimpleGrantedAuthority("ROLE_MANAGER"))
        );
    }
}
