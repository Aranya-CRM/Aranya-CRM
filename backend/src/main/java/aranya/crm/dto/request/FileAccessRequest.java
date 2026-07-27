package aranya.crm.dto.request;

import aranya.crm.entity.DocumentCategory;
import lombok.Getter;
import lombok.Setter;

import java.util.List;

/** Full-set replacement of a user's sensitive-file category grants. */
@Getter
@Setter
public class FileAccessRequest {
    private List<DocumentCategory> categories;
}
