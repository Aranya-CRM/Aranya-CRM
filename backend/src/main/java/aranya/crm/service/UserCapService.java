package aranya.crm.service;

import aranya.crm.entity.DocumentCategory;
import lombok.RequiredArgsConstructor;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.EnumSet;
import java.util.List;
import java.util.Locale;
import java.util.Optional;
import java.util.Set;

/**
 * Manages per-user additional capability grants (user_cap), specifically the grantable
 * per-category case-document view permissions. Grants are managed exclusively through
 * the {@code cases:documents.view.*} cap family, so no other capability can be granted here.
 */
@Service
@RequiredArgsConstructor
public class UserCapService {

    private static final String DOC_VIEW_PREFIX = "cases:documents.view.";
    private static final String DOC_VIEW_LIKE = DOC_VIEW_PREFIX + "%";

    private final JdbcTemplate jdbcTemplate;

    /** Categories the given user is currently granted to view (via user_cap, non-expired). */
    public Set<DocumentCategory> getDocumentCategories(Long userId) {
        List<String> keys = jdbcTemplate.queryForList(
                "SELECT cd.cap_key FROM user_cap uc "
                        + "JOIN cap_definition cd ON cd.id = uc.cap_def_id "
                        + "WHERE uc.user_id = ? AND cd.cap_key LIKE ? "
                        + "AND (uc.expires_at IS NULL OR uc.expires_at > now())",
                String.class, userId, DOC_VIEW_LIKE);

        Set<DocumentCategory> result = EnumSet.noneOf(DocumentCategory.class);
        for (String key : keys) {
            categoryFromCapKey(key).ifPresent(result::add);
        }
        return result;
    }

    /**
     * Replace the user's document-view grants with exactly {@code categories} (overwrite semantics).
     * Only touches the {@code cases:documents.view.*} cap family; the role baseline is never changed.
     */
    @Transactional
    public void setDocumentCategories(Long userId, Set<DocumentCategory> categories, Long grantedBy) {
        jdbcTemplate.update(
                "DELETE FROM user_cap WHERE user_id = ? AND cap_def_id IN "
                        + "(SELECT id FROM cap_definition WHERE cap_key LIKE ?)",
                userId, DOC_VIEW_LIKE);

        for (DocumentCategory category : categories) {
            jdbcTemplate.update(
                    "INSERT INTO user_cap (user_id, cap_def_id, scope_value, granted_by) "
                            + "SELECT ?, id, 'YES', ? FROM cap_definition WHERE cap_key = ? "
                            + "ON CONFLICT (user_id, cap_def_id) DO NOTHING",
                    userId, grantedBy, capKeyFor(category));
        }
    }

    private String capKeyFor(DocumentCategory category) {
        return DOC_VIEW_PREFIX + category.name().toLowerCase(Locale.ROOT);
    }

    private Optional<DocumentCategory> categoryFromCapKey(String capKey) {
        if (!capKey.startsWith(DOC_VIEW_PREFIX)) {
            return Optional.empty();
        }
        String suffix = capKey.substring(DOC_VIEW_PREFIX.length()).toUpperCase(Locale.ROOT);
        try {
            return Optional.of(DocumentCategory.valueOf(suffix));
        } catch (IllegalArgumentException e) {
            return Optional.empty();
        }
    }
}
