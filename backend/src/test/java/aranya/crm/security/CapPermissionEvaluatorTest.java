package aranya.crm.security;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.authentication.TestingAuthenticationToken;
import org.springframework.security.core.Authentication;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verifyNoInteractions;

class CapPermissionEvaluatorTest {

    @Test
    @DisplayName("volunteer-only users cannot access case document capabilities")
    void volunteerOnlyUsers_cannotAccessCaseDocumentCapabilities() {
        JdbcTemplate jdbcTemplate = mock(JdbcTemplate.class);
        CapPermissionEvaluator evaluator = new CapPermissionEvaluator(jdbcTemplate);
        Authentication authentication = new TestingAuthenticationToken(
                "volunteer@test.com",
                "n/a",
                "ROLE_VOLUNTEER"
        );

        assertThat(evaluator.hasCap(authentication, "cases:view")).isFalse();
        assertThat(evaluator.hasCap(authentication, "cases:documents.upload")).isFalse();
        assertThat(evaluator.capScope(authentication, "cases:view")).isEqualTo("NO");
        verifyNoInteractions(jdbcTemplate);
    }
}
