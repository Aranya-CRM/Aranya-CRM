package aranya.crm.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;

import java.time.LocalDateTime;

@Data
@Builder
@AllArgsConstructor
public class CaseDetailResponse {
    private Long id;
    private String caseCode;
    private String title;
    private String description;
    private String priority;
    private String status;
    private String colorCode;
    private String tradition;
    private LocalDateTime openedAt;
    private LocalDateTime closedAt;
    private Long clientId;
    private String clientAbbr;
    private String clientNameEn;
    private String clientNameChn;
    private String venue;
    private Long createdById;
    private String createdByName;
    private String comments;
    private String remarks;
}
