package aranya.crm.security;

import lombok.RequiredArgsConstructor;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.stereotype.Component;

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

        List<String> roleNames = authentication.getAuthorities().stream()
                .map(GrantedAuthority::getAuthority)
                .filter(a -> a.startsWith("ROLE_"))
                .map(a -> a.substring("ROLE_".length()))
                .toList();

        if (roleNames.isEmpty()) {
            return false;
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
}
