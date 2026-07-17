package aranya.crm.security;

import aranya.crm.entity.User;
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
 * Effective permission = role baseline (role_cap) ∪ per-user additional grants (user_cap),
 * with a small hard-coded correction layer ({@link #correctedScope}) taking precedence for
 * legacy special cases. Returns true when the resulting scope for the cap key is not NO/absent.
 */
@Component("capEval")
@RequiredArgsConstructor
public class CapPermissionEvaluator {

    private static final long NO_USER = -1L;

    private final JdbcTemplate jdbcTemplate;

    public boolean hasCap(Authentication authentication, String capKey) {
        if (authentication == null || !authentication.isAuthenticated()) {
            return false;
        }
        return hasCap(roleNames(authentication), userId(authentication), capKey);
    }

    /** Service-layer entry point: evaluate a cap for a resolved {@link User} (e.g. @CurrentUser). */
    public boolean hasCap(User user, String capKey) {
        if (user == null) {
            return false;
        }
        return hasCap(roleNames(user), user.getId() != null ? user.getId() : NO_USER, capKey);
    }

    private boolean hasCap(List<String> roleNames, Long userId, String capKey) {
        if (roleNames.isEmpty()) {
            return false;
        }

        String correctedScope = correctedScope(roleNames, capKey);
        if (correctedScope != null) {
            return !correctedScope.equals("NO");
        }

        String placeholders = String.join(",", roleNames.stream().map(_i -> "?").toList());
        String sql = """
                SELECT COUNT(*) FROM (
                  SELECT rc.scope_value AS sv
                  FROM role_cap rc
                  JOIN cap_definition cd ON cd.id = rc.cap_def_id
                  JOIN role r ON r.id = rc.role_id
                  WHERE r.name IN (%s) AND cd.cap_key = ? AND rc.scope_value <> 'NO'
                  UNION ALL
                  SELECT uc.scope_value AS sv
                  FROM user_cap uc
                  JOIN cap_definition cd2 ON cd2.id = uc.cap_def_id
                  WHERE uc.user_id = ? AND cd2.cap_key = ? AND uc.scope_value <> 'NO'
                    AND (uc.expires_at IS NULL OR uc.expires_at > now())
                ) x
                """.formatted(placeholders);

        List<Object> params = new ArrayList<>(roleNames);
        params.add(capKey);
        params.add(userId);
        params.add(capKey);

        Integer count = jdbcTemplate.queryForObject(sql, Integer.class, params.toArray());
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
                    WHEN BOOL_OR(sv = 'ALL')      THEN 'ALL'
                    WHEN BOOL_OR(sv = 'YES')      THEN 'YES'
                    WHEN BOOL_OR(sv = 'OWN')      THEN 'OWN'
                    WHEN BOOL_OR(sv = 'TEAM')     THEN 'TEAM'
                    WHEN BOOL_OR(sv = 'WORKFLOW') THEN 'WORKFLOW'
                    ELSE 'NO'
                  END
                FROM (
                  SELECT rc.scope_value AS sv
                  FROM role_cap rc
                  JOIN cap_definition cd ON cd.id = rc.cap_def_id
                  JOIN role r ON r.id = rc.role_id
                  WHERE r.name IN (%s) AND cd.cap_key = ?
                  UNION ALL
                  SELECT uc.scope_value AS sv
                  FROM user_cap uc
                  JOIN cap_definition cd2 ON cd2.id = uc.cap_def_id
                  WHERE uc.user_id = ? AND cd2.cap_key = ?
                    AND (uc.expires_at IS NULL OR uc.expires_at > now())
                ) x
                """.formatted(placeholders);

        List<Object> params = new ArrayList<>(roleNames);
        params.add(capKey);
        params.add(userId(authentication));
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

    private List<String> roleNames(User user) {
        if (user.getUserRoles() == null) {
            return List.of();
        }
        return user.getUserRoles().stream()
                .map(userRole -> userRole.getRole().getName())
                .toList();
    }

    private Long userId(Authentication authentication) {
        Object principal = authentication.getPrincipal();
        if (principal instanceof User user && user.getId() != null) {
            return user.getId();
        }
        return NO_USER;
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

        boolean managerLike = roleNames.stream().anyMatch(role -> role.equals("MANAGER") || role.equals("ADMIN") || role.equals("FULL_MANAGER") || role.equals("TEAM_LEAD"));

        if (roleNames.contains("SOCIAL_WORKER") && !managerLike) {
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
                return "OWN";
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

        if (managerLike) {
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
