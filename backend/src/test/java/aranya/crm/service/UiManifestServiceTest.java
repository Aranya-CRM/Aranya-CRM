package aranya.crm.service;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.RowCallbackHandler;
import org.springframework.security.authentication.TestingAuthenticationToken;
import org.springframework.security.core.Authentication;

import java.sql.ResultSet;
import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.doAnswer;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class UiManifestServiceTest {

    @Mock
    private JdbcTemplate jdbcTemplate;

    @InjectMocks
    private UiManifestService uiManifestService;

    @Test
    @DisplayName("buildManifest returns empty capabilities when authentication has no roles")
    void buildManifest_returnsEmptyCapabilitiesWhenAuthenticationHasNoRoles() {
        Authentication authentication = new TestingAuthenticationToken(
                "user@test.com",
                "n/a",
                "SCOPE_profile"
        );

        Map<String, Object> result = uiManifestService.buildManifest(authentication);

        assertThat(result.get("routes")).isEqualTo(List.of());
        assertThat(result.get("features")).isEqualTo(List.of());
        assertThat(result.get("widgets")).isEqualTo(List.of());
        verifyNoInteractions(jdbcTemplate);
    }

    @Test
    @DisplayName("buildManifest queries role permissions and groups capability ids by type")
    void buildManifest_queriesRolePermissionsAndGroupsCapabilityIdsByType() {
        Authentication authentication = new TestingAuthenticationToken(
                "manager@test.com",
                "n/a",
                "ROLE_MANAGER",
                "ROLE_SOCIAL_WORKER",
                "SCOPE_ignored"
        );

        doAnswer(invocation -> {
            RowCallbackHandler handler = invocation.getArgument(1);
            handler.processRow(resultSet("ROUTE", "dashboard"));
            handler.processRow(resultSet("FEATURE", "clients.update"));
            handler.processRow(resultSet("WIDGET", "dashboard.activeCases"));
            handler.processRow(resultSet("UNKNOWN", "future.capability"));
            return null;
        }).when(jdbcTemplate).query(
                anyString(),
                any(RowCallbackHandler.class),
                eq("MANAGER"),
                eq("SOCIAL_WORKER")
        );

        Map<String, Object> result = uiManifestService.buildManifest(authentication);

        assertThat(result.get("routes")).isEqualTo(List.of("dashboard"));
        assertThat(result.get("features")).isEqualTo(List.of("clients.update"));
        assertThat(result.get("widgets")).isEqualTo(List.of("dashboard.activeCases"));
        verify(jdbcTemplate).query(
                anyString(),
                any(RowCallbackHandler.class),
                eq("MANAGER"),
                eq("SOCIAL_WORKER")
        );
    }

    private ResultSet resultSet(String type, String code) throws Exception {
        ResultSet resultSet = mock(ResultSet.class);
        when(resultSet.getString("type")).thenReturn(type);
        when(resultSet.getString("code")).thenReturn(code);
        return resultSet;
    }
}
