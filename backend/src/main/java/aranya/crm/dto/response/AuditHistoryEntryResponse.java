package aranya.crm.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;

import java.time.LocalDateTime;
import java.util.Map;

@Data
@Builder
@AllArgsConstructor
public class AuditHistoryEntryResponse {
    private String id;
    private String action;
    private String targetType;
    private Long targetId;
    private Long caseId;
    private String targetLabel;
    private String actorName;
    private LocalDateTime occurredAt;
    private boolean approvalRequired;
    private String lifecycleStatus;
    private String decisionStatus;
    private String summary;
    private String reason;
    private String requestedByName;
    private LocalDateTime requestedAt;
    private String decidedByName;
    private LocalDateTime decidedAt;
    private String approvalRequestId;
    private Integer version;
    private String previousVersionId;
    private Map<String, String> metadata;
    private String beforeValue;
    private String afterValue;
    private String result;
    private String source;
    private boolean canEdit;
    private boolean canDelete;
}
