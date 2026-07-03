package aranya.crm.dto.response;

import aranya.crm.entity.DocumentCategory;
import lombok.Builder;
import lombok.Getter;

import java.time.LocalDateTime;

@Getter
@Builder
public class CaseDocumentResponse {
    private Long id;
    private Long documentId;
    private Long caseId;
    private DocumentCategory category;
    private String fileName;
    private String mimeType;
    private Long fileSize;
    private String uploadedByName;
    private LocalDateTime uploadedAt;
}
