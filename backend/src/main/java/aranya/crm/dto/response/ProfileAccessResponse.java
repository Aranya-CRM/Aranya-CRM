package aranya.crm.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;

import java.util.List;

/**
 * Sensitive client-profile section grants for a single user.
 * Contains ONLY section sets — no user identity or role information.
 *
 * <ul>
 *   <li>{@code sections}  — editable per-user grants (user_cap).</li>
 *   <li>{@code inherited} — always-on sections the user already has via role baseline;
 *       shown checked + locked and never sent back on save.</li>
 * </ul>
 */
@Getter
@Builder
@AllArgsConstructor
public class ProfileAccessResponse {
    private List<String> sections;
    private List<String> inherited;
}
