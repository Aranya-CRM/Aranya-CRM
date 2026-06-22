package aranya.crm.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;

import java.time.LocalDateTime;

@Data
@Builder
@AllArgsConstructor
public class ServiceEventResponse {
    private Long id;
    private Long caseId;
    private Long clientId;
    private String clientAbbr;
    private String clientNameEn;
    private String clientNameChn;
    private String caseCode;
    private String serviceKey;
    private String serviceName;
    private String title;
    private String location;
    private LocalDateTime scheduledStart;
    private LocalDateTime reportDueAt;
    private boolean reportSubmitted;
    private String reminderState; // DONE / UPCOMING / PENDING / DUE_SOON / OVERDUE
    private String workDescription;
    private String notes;
    private Long assignedUserId;
    private String assignedUserName;
}
