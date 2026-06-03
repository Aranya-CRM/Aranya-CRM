package aranya.crm.service;

import lombok.RequiredArgsConstructor;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.stereotype.Service;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
public class UiManifestV2Service {

    private final JdbcTemplate jdbcTemplate;

    /**
     * Returns a flat cap-key → scope-value map for the authenticated user.
     *
     * When the user holds multiple roles the most-permissive scope wins per cap key:
     * ALL > YES > OWN = TEAM > WORKFLOW > (absent/NO).
     * Only caps where at least one role grants access are included; absent = NO.
     */
    public Map<String, String> buildCaps(Authentication authentication) {
        List<String> roleNames = authentication.getAuthorities().stream()
                .map(GrantedAuthority::getAuthority)
                .filter(a -> a.startsWith("ROLE_"))
                .map(a -> a.substring("ROLE_".length()))
                .toList();

        if (roleNames.isEmpty()) {
            return Map.of();
        }

        String placeholders = String.join(",", roleNames.stream().map(_i -> "?").toList());
        String sql = """
                SELECT cd.cap_key,
                  CASE
                    WHEN BOOL_OR(rc.scope_value = 'ALL')      THEN 'ALL'
                    WHEN BOOL_OR(rc.scope_value = 'YES')      THEN 'YES'
                    WHEN BOOL_OR(rc.scope_value = 'OWN')      THEN 'OWN'
                    WHEN BOOL_OR(rc.scope_value = 'TEAM')     THEN 'TEAM'
                    WHEN BOOL_OR(rc.scope_value = 'WORKFLOW') THEN 'WORKFLOW'
                    ELSE 'NO'
                  END AS effective_scope
                FROM role_cap rc
                JOIN cap_definition cd ON cd.id = rc.cap_def_id
                JOIN role r ON r.id = rc.role_id
                WHERE r.name IN (%s)
                GROUP BY cd.cap_key
                ORDER BY cd.cap_key
                """.formatted(placeholders);

        Map<String, String> caps = new LinkedHashMap<>();
        jdbcTemplate.query(sql, rs -> {
            String scope = rs.getString("effective_scope");
            if (scope != null && !scope.equals("NO")) {
                caps.put(rs.getString("cap_key"), scope);
            }
        }, roleNames.toArray());

        return caps;
    }
}
