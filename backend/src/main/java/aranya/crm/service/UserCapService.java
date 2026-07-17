package aranya.crm.service;

import aranya.crm.entity.ClientProfileSection;
import aranya.crm.entity.DocumentCategory;
import lombok.RequiredArgsConstructor;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Collection;
import java.util.EnumSet;
import java.util.List;
import java.util.Locale;
import java.util.Optional;
import java.util.Set;

/**
 * Manages per-user additional capability grants (user_cap). Writes are restricted to explicit
 * grantable cap families (document-view categories and client-profile sections), so no other
 * capability can be granted through this service.
 */
@Service
@RequiredArgsConstructor
public class UserCapService {

    private static final String DOC_VIEW_PREFIX = "cases:documents.view.";
    private static final String PROFILE_PREFIX = "clients:profile.";

    private final JdbcTemplate jdbcTemplate;

    // ---- Case document-view categories ----

    /** Categories the user is currently granted to view (via user_cap, non-expired). */
    public Set<DocumentCategory> getDocumentCategories(Long userId) {
        return mapDocumentCategories(grantedCapKeys(userId, DOC_VIEW_PREFIX));
    }

    /** Categories the user already views via role baseline (role_cap), independent of user_cap. */
    public Set<DocumentCategory> getInheritedDocumentCategories(Long userId) {
        return mapDocumentCategories(inheritedCapKeys(userId, DOC_VIEW_PREFIX));
    }

    @Transactional
    public void setDocumentCategories(Long userId, Set<DocumentCategory> categories, Long grantedBy) {
        replaceGrants(userId, DOC_VIEW_PREFIX,
                categories.stream().map(this::docCapKey).toList(), grantedBy);
    }

    // ---- Client profile sections ----

    /** Sections the user is currently granted to view (via user_cap, non-expired). */
    public Set<ClientProfileSection> getProfileSections(Long userId) {
        return mapProfileSections(grantedCapKeys(userId, PROFILE_PREFIX));
    }

    /** Sections the user already views via role baseline (role_cap), independent of user_cap. */
    public Set<ClientProfileSection> getInheritedProfileSections(Long userId) {
        return mapProfileSections(inheritedCapKeys(userId, PROFILE_PREFIX));
    }

    @Transactional
    public void setProfileSections(Long userId, Set<ClientProfileSection> sections, Long grantedBy) {
        replaceGrants(userId, PROFILE_PREFIX,
                sections.stream().map(ClientProfileSection::capKey).toList(), grantedBy);
    }

    // ---- Generic core (whitelisted per family via prefix) ----

    private List<String> grantedCapKeys(Long userId, String prefix) {
        return jdbcTemplate.queryForList(
                "SELECT cd.cap_key FROM user_cap uc "
                        + "JOIN cap_definition cd ON cd.id = uc.cap_def_id "
                        + "WHERE uc.user_id = ? AND cd.cap_key LIKE ? "
                        + "AND (uc.expires_at IS NULL OR uc.expires_at > now())",
                String.class, userId, prefix + "%");
    }

    private List<String> inheritedCapKeys(Long userId, String prefix) {
        return jdbcTemplate.queryForList(
                "SELECT DISTINCT cd.cap_key FROM role_cap rc "
                        + "JOIN cap_definition cd ON cd.id = rc.cap_def_id "
                        + "JOIN user_role ur ON ur.role_id = rc.role_id "
                        + "WHERE ur.user_id = ? AND cd.cap_key LIKE ? AND rc.scope_value <> 'NO'",
                String.class, userId, prefix + "%");
    }

    /** Overwrite semantics: within the given cap family only, replace user_cap with {@code capKeys}. */
    private void replaceGrants(Long userId, String prefix, Collection<String> capKeys, Long grantedBy) {
        jdbcTemplate.update(
                "DELETE FROM user_cap WHERE user_id = ? AND cap_def_id IN "
                        + "(SELECT id FROM cap_definition WHERE cap_key LIKE ?)",
                userId, prefix + "%");

        for (String capKey : capKeys) {
            jdbcTemplate.update(
                    "INSERT INTO user_cap (user_id, cap_def_id, scope_value, granted_by) "
                            + "SELECT ?, id, 'YES', ? FROM cap_definition WHERE cap_key = ? "
                            + "ON CONFLICT (user_id, cap_def_id) DO NOTHING",
                    userId, grantedBy, capKey);
        }
    }

    // ---- Mapping helpers ----

    private String docCapKey(DocumentCategory category) {
        return DOC_VIEW_PREFIX + category.name().toLowerCase(Locale.ROOT);
    }

    private Set<DocumentCategory> mapDocumentCategories(List<String> capKeys) {
        Set<DocumentCategory> result = EnumSet.noneOf(DocumentCategory.class);
        for (String key : capKeys) {
            suffix(key, DOC_VIEW_PREFIX)
                    .flatMap(this::parseDocumentCategory)
                    .ifPresent(result::add);
        }
        return result;
    }

    private Set<ClientProfileSection> mapProfileSections(List<String> capKeys) {
        Set<ClientProfileSection> result = EnumSet.noneOf(ClientProfileSection.class);
        for (String key : capKeys) {
            suffix(key, PROFILE_PREFIX)
                    .flatMap(this::parseProfileSection)
                    .ifPresent(result::add);
        }
        return result;
    }

    private Optional<String> suffix(String capKey, String prefix) {
        return capKey.startsWith(prefix)
                ? Optional.of(capKey.substring(prefix.length()).toUpperCase(Locale.ROOT))
                : Optional.empty();
    }

    private Optional<DocumentCategory> parseDocumentCategory(String name) {
        try {
            return Optional.of(DocumentCategory.valueOf(name));
        } catch (IllegalArgumentException e) {
            return Optional.empty();
        }
    }

    private Optional<ClientProfileSection> parseProfileSection(String name) {
        try {
            return Optional.of(ClientProfileSection.valueOf(name));
        } catch (IllegalArgumentException e) {
            return Optional.empty();
        }
    }
}
