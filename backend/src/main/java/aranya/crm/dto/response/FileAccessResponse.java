package aranya.crm.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;

import java.util.List;

/**
 * Sensitive-file access grants for a single user.
 * Intentionally contains ONLY category sets — no user identity or role information.
 *
 * <ul>
 *   <li>{@code categories} — editable per-user grants (user_cap).</li>
 *   <li>{@code inherited}  — always-on categories the user already has via role baseline;
 *       shown checked + locked and never sent back on save.</li>
 * </ul>
 */
@Getter
@Builder
@AllArgsConstructor
public class FileAccessResponse {
    private List<String> categories;
    private List<String> inherited;
}
