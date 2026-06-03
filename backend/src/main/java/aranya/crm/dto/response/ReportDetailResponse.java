package aranya.crm.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;

import java.time.LocalDate;
import java.time.LocalDateTime;

@Data
@Builder
@AllArgsConstructor
public class ReportDetailResponse {
    private Long id;
    private Long caseId;
    private Long clientId;
    private String clientAbbr;
    private String clientNameEn;
    private String clientNameChn;
    private String caseCode;
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
    private String purposeOfVisit;
    private String whatWasDone;
    private String environmentObservations;
    private String sanghaObservations;
    private String otherObservations;
    private String personalReflections;
    private String recommendations;
    private String mattersToHighlight;
    private String status;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
