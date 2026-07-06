package aranya.crm.security;

import lombok.RequiredArgsConstructor;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.List;

/**
 * Spring Security SpEL helper for cap-key authorization.
 *
 * Usage in @PreAuthorize:
 *   @PreAuthorize("@capEval.hasCap(authentication, 'clients:create')")
 *
 * Returns true when the authenticated user holds at least one role
 * whose effective scope for the given cap key is not NO/absent.
 */
@Component("capEval")
@RequiredArgsConstructor
public class CapPermissionEvaluator {

    private final JdbcTemplate jdbcTemplate;

    public boolean hasCap(Authentication authentication, String capKey) {
        if (authentication == null || !authentication.isAuthenticated()) {
            return false;
        }

        List<String> roleNames = roleNames(authentication);

        if (roleNames.isEmpty()) {
            return false;
        }

        String correctedScope = correctedScope(roleNames, capKey);
        if (correctedScope != null) {
            return !correctedScope.equals("NO");
        }

        String placeholders = String.join(",", roleNames.stream().map(_i -> "?").toList());
        String sql = """
                SELECT COUNT(*) FROM role_cap rc
                JOIN cap_definition cd ON cd.id = rc.cap_def_id
                JOIN role r ON r.id = rc.role_id
                WHERE r.name IN (%s)
                  AND cd.cap_key = ?
                  AND rc.scope_value != 'NO'
                """.formatted(placeholders);

        Object[] params = new Object[roleNames.size() + 1];
        for (int i = 0; i < roleNames.size(); i++) {
            params[i] = roleNames.get(i);
        }
        params[roleNames.size()] = capKey;

        Integer count = jdbcTemplate.queryForObject(sql, Integer.class, params);
        return count != null && count > 0;
    }

    /**
     * Returns the effective scope value for the given cap key.
     * Precedence: ALL > YES > OWN > TEAM > WORKFLOW > NO.
     * Returns "NO" when the cap is absent or the user has no roles.
     */
    public String capScope(Authentication authentication, String capKey) {
        if (authentication == null || !authentication.isAuthenticated()) {
            return "NO";
        }

        List<String> roleNames = roleNames(authentication);

        if (roleNames.isEmpty()) {
            return "NO";
        }

        String correctedScope = correctedScope(roleNames, capKey);
        if (correctedScope != null) {
            return correctedScope;
        }

        String placeholders = String.join(",", roleNames.stream().map(_i -> "?").toList());
        String sql = """
                SELECT
                  CASE
                    WHEN BOOL_OR(rc.scope_value = 'ALL')      THEN 'ALL'
                    WHEN BOOL_OR(rc.scope_value = 'YES')      THEN 'YES'
                    WHEN BOOL_OR(rc.scope_value = 'OWN')      THEN 'OWN'
                    WHEN BOOL_OR(rc.scope_value = 'TEAM')     THEN 'TEAM'
                    WHEN BOOL_OR(rc.scope_value = 'WORKFLOW') THEN 'WORKFLOW'
                    ELSE 'NO'
                  END
                FROM role_cap rc
                JOIN cap_definition cd ON cd.id = rc.cap_def_id
                JOIN role r ON r.id = rc.role_id
                WHERE r.name IN (%s)
                  AND cd.cap_key = ?
                """.formatted(placeholders);

        List<Object> params = new ArrayList<>(roleNames);
        params.add(capKey);

        String scope = jdbcTemplate.queryForObject(sql, String.class, params.toArray());
        return scope != null ? scope : "NO";
    }

    private List<String> roleNames(Authentication authentication) {
        return authentication.getAuthorities().stream()
                .map(GrantedAuthority::getAuthority)
                .filter(a -> a.startsWith("ROLE_"))
                .map(a -> a.substring("ROLE_".length()))
                .toList();
    }

    private String correctedScope(List<String> roleNames, String capKey) {
        if (capKey.equals("route:approvals")) {
            return "NO";
        }

        if (roleNames.size() == 1 && roleNames.contains("VOLUNTEER")) {
            if (capKey.equals("route:tasks") || capKey.equals("tasks.list")) {
                return "YES";
            }
            if (capKey.equals("cases:view") || capKey.startsWith("cases:documents.")) {
                return "NO";
            }
            if (capKey.startsWith("route:")) {
                return "NO";
            }
        }

        if (roleNames.contains("SOCIAL_WORKER")) {
            if (capKey.equals("clients:create")) {
                return "WORKFLOW";
            }
            if (capKey.equals("clients:update") || capKey.equals("clients:delete")) {
                return "NO";
            }
            if (capKey.equals("cases:create")) {
                return "WORKFLOW";
            }
            if (capKey.equals("cases:view")) {
                return "ALL";
            }
            if (capKey.equals("cases:services.create")) {
                return "WORKFLOW";
            }
            if (capKey.equals("cases:documents.upload") || capKey.equals("cases:documents.delete")) {
                return "ALL";
            }
            if (capKey.equals("approvals:create")) {
                return "YES";
            }
        }

        if (roleNames.stream().anyMatch(role -> role.equals("MANAGER") || role.equals("FULL_MANAGER") || role.equals("TEAM_LEAD"))) {
            if (capKey.equals("approvals:view")
                    || capKey.equals("approvals:decide")
                    || capKey.equals("approvals:create")) {
                return "YES";
            }
            if (capKey.equals("clients:create")
                    || capKey.equals("clients:update")
                    || capKey.equals("clients:delete")
                    || capKey.equals("cases:create")
                    || capKey.equals("cases:services.create")
                    || capKey.equals("cases:delete")) {
                return "WORKFLOW";
            }
        }

        return null;
    }
}
