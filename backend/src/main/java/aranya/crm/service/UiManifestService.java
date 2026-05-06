package aranya.crm.service;

import lombok.RequiredArgsConstructor;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
public class UiManifestService {

    private final JdbcTemplate jdbcTemplate;

    public Map<String, Object> buildManifest(Authentication authentication) {
        List<String> roleNames = authentication.getAuthorities().stream()
                .map(GrantedAuthority::getAuthority)
                .filter(authority -> authority.startsWith("ROLE_"))
                .map(authority -> authority.substring("ROLE_".length()))
                .toList();

        Map<String, List<String>> capabilities = new LinkedHashMap<>();
        capabilities.put("routes", new ArrayList<>());
        capabilities.put("features", new ArrayList<>());
        capabilities.put("widgets", new ArrayList<>());

        if (roleNames.isEmpty()) {
            return mapOf(capabilities);
        }

        String placeholders = String.join(",", roleNames.stream().map(_ignored -> "?").toList());
        String sql = """
                SELECT DISTINCT p.code, p.type
                FROM permission p
                JOIN role_permission rp ON rp.permission_id = p.id
                JOIN role r ON r.id = rp.role_id
                WHERE r.name IN (%s)
                ORDER BY p.type, p.code
                """.formatted(placeholders);

        jdbcTemplate.query(sql, rs -> {
            String type = rs.getString("type");
            String code = rs.getString("code");
            switch (type) {
                case "ROUTE" -> capabilities.get("routes").add(code);
                case "FEATURE" -> capabilities.get("features").add(code);
                case "WIDGET" -> capabilities.get("widgets").add(code);
                default -> {
                    // Ignore unknown capability types so old clients are not broken by future types.
                }
            }
        }, roleNames.toArray());

        return mapOf(capabilities);
    }

    private Map<String, Object> mapOf(Map<String, List<String>> capabilities) {
        Map<String, Object> response = new LinkedHashMap<>();
        response.put("routes", capabilities.get("routes"));
        response.put("features", capabilities.get("features"));
        response.put("widgets", capabilities.get("widgets"));
        return response;
    }
}
