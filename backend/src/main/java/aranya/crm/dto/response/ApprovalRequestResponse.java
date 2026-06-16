package aranya.crm.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;

import java.time.LocalDateTime;

@Data
@Builder
@AllArgsConstructor
public class ApprovalRequestResponse {
    private Long id;
    private String type;
    private String status;
    private String targetType;
    private Long targetId;
    private String payloadJson;
    private Long requestedById;
    private String requestedByName;
    private Long decidedById;
    private String decidedByName;
    private String decisionComment;
    private LocalDateTime createdAt;
    private LocalDateTime decidedAt;
}
