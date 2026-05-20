package aranya.crm.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;

import java.time.LocalDate;
import java.time.LocalDateTime;

@Data
@Builder
@AllArgsConstructor
public class ReportSummaryResponse {
    private Long id;
    private Long clientId;
    private String clientNameEn;
    private String clientNameChn;
    private Long createdById;
    private String createdByName;
    private String staffName;
    private LocalDateTime reportTimestamp;
    private LocalDate dateOfVisit;
    private String timeOfVisit;
    private String durationOfVisit;
    private String location;
    private String programmeName;
    private String typeOfVisit;
    private LocalDateTime createdAt;
}
