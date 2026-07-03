package aranya.crm.dto.response;

import lombok.Builder;
import lombok.Data;

/** 单个 Drive 文件的导入结果。 */
@Data
@Builder
public class DriveImportResultResponse {
    private String driveFileId;
    /** IMPORTED / SKIPPED / FAILED */
    private String status;
    private Long caseId;
    private String fileName;
    private Long documentId;
    private String message;
}
