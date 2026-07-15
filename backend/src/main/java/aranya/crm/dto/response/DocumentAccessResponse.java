package aranya.crm.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;

import java.util.List;

/**
 * A user's granted case-document view categories (additional permissions).
 * {@code categories} holds {@code DocumentCategory} names, e.g. ["MEDICAL", "ORDINATION"].
 */
@Getter
@Builder
@AllArgsConstructor
public class DocumentAccessResponse {
    private Long userId;
    private List<String> categories;
}
