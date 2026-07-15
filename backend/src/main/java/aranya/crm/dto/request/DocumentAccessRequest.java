package aranya.crm.dto.request;

import aranya.crm.entity.DocumentCategory;
import lombok.Getter;
import lombok.Setter;

import java.util.List;

/**
 * Set the case-document view categories a user is granted.
 * A null or empty list revokes all per-category document grants for that user.
 */
@Getter
@Setter
public class DocumentAccessRequest {
    private List<DocumentCategory> categories;
}
