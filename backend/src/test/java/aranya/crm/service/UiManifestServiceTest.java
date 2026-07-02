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
    @DisplayName("buildCaps returns empty caps when authentication has no roles")
    void buildCaps_returnsEmptyCapsWhenAuthenticationHasNoRoles() {
        Authentication authentication = new TestingAuthenticationToken(
                "user@test.com",
                "n/a",
                "SCOPE_profile"
        );

        Map<String, String> result = uiManifestService.buildCaps(authentication);

        assertThat(result).isEmpty();
        verifyNoInteractions(jdbcTemplate);
    }

    @Test
    @DisplayName("buildCaps queries role caps and applies volunteer route correction")
    void buildCaps_queriesRoleCapsAndAppliesVolunteerRouteCorrection() {
        Authentication authentication = new TestingAuthenticationToken(
                "volunteer@test.com",
                "n/a",
                "ROLE_VOLUNTEER"
        );

        doAnswer(invocation -> {
            RowCallbackHandler handler = invocation.getArgument(1);
            handler.processRow(resultSet("route:dashboard", "YES"));
            handler.processRow(resultSet("route:reports", "YES"));
            handler.processRow(resultSet("route:tasks", "YES"));
            handler.processRow(resultSet("cases:view", "OWN"));
            handler.processRow(resultSet("cases:documents.upload", "YES"));
            return null;
        }).when(jdbcTemplate).query(
                anyString(),
                any(RowCallbackHandler.class),
                eq("VOLUNTEER")
        );

        Map<String, String> result = uiManifestService.buildCaps(authentication);

        assertThat(result).containsEntry("route:tasks", "YES");
        assertThat(result).containsEntry("tasks.list", "YES");
        assertThat(result).doesNotContainKeys(
                "route:dashboard",
                "route:reports",
                "cases:view",
                "cases:documents.upload"
        );
        verify(jdbcTemplate).query(
                anyString(),
                any(RowCallbackHandler.class),
                eq("VOLUNTEER")
        );
    }

    @Test
    @DisplayName("buildCaps limits social worker member actions to create approval")
    void buildCaps_limitsSocialWorkerMemberActions() {
        Authentication authentication = new TestingAuthenticationToken(
                "sw@test.com",
                "n/a",
                "ROLE_SOCIAL_WORKER"
        );

        doAnswer(invocation -> {
            RowCallbackHandler handler = invocation.getArgument(1);
            handler.processRow(resultSet("clients:create", "YES"));
            handler.processRow(resultSet("clients:update", "ALL"));
            handler.processRow(resultSet("clients:delete", "WORKFLOW"));
            handler.processRow(resultSet("cases:view", "OWN"));
            handler.processRow(resultSet("cases:create", "YES"));
            handler.processRow(resultSet("cases:services.create", "NO"));
            return null;
        }).when(jdbcTemplate).query(
                anyString(),
                any(RowCallbackHandler.class),
                eq("SOCIAL_WORKER")
        );

        Map<String, String> result = uiManifestService.buildCaps(authentication);

        assertThat(result).containsEntry("clients:create", "WORKFLOW");
        assertThat(result).containsEntry("cases:view", "ALL");
        assertThat(result).containsEntry("cases:create", "WORKFLOW");
        assertThat(result).containsEntry("cases:services.create", "WORKFLOW");
        assertThat(result).doesNotContainKeys("clients:update", "clients:delete");
    }

    @Test
    @DisplayName("buildCaps marks manager member and case writes as workflow actions")
    void buildCaps_marksManagerWritesAsWorkflow() {
        Authentication authentication = new TestingAuthenticationToken(
                "manager@test.com",
                "n/a",
                "ROLE_MANAGER"
        );

        doAnswer(invocation -> {
            RowCallbackHandler handler = invocation.getArgument(1);
            handler.processRow(resultSet("clients:create", "ALL"));
            handler.processRow(resultSet("clients:update", "ALL"));
            handler.processRow(resultSet("clients:delete", "WORKFLOW"));
            handler.processRow(resultSet("cases:create", "ALL"));
            handler.processRow(resultSet("cases:services.create", "ALL"));
            handler.processRow(resultSet("cases:delete", "ALL"));
            return null;
        }).when(jdbcTemplate).query(
                anyString(),
                any(RowCallbackHandler.class),
                eq("MANAGER")
        );

        Map<String, String> result = uiManifestService.buildCaps(authentication);

        assertThat(result).containsEntry("clients:create", "WORKFLOW");
        assertThat(result).containsEntry("clients:update", "WORKFLOW");
        assertThat(result).containsEntry("clients:delete", "WORKFLOW");
        assertThat(result).containsEntry("cases:create", "WORKFLOW");
        assertThat(result).containsEntry("cases:services.create", "WORKFLOW");
        assertThat(result).containsEntry("cases:delete", "WORKFLOW");
        assertThat(result).containsEntry("approvals:view", "YES");
        assertThat(result).containsEntry("approvals:decide", "YES");
    }

    private ResultSet resultSet(String capKey, String scope) throws Exception {
        ResultSet resultSet = mock(ResultSet.class);
        when(resultSet.getString("cap_key")).thenReturn(capKey);
        when(resultSet.getString("effective_scope")).thenReturn(scope);
        return resultSet;
    }
}
