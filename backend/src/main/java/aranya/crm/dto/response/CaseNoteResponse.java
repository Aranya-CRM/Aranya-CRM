package aranya.crm.dto.response;

import lombok.Builder;
import lombok.Getter;

import java.time.LocalDate;
import java.time.LocalDateTime;

@Getter
@Builder
public class CaseNoteResponse {
    private String id;
    private String caseId;
    private LocalDate date;
    private String content;
    private String followUp;
    private String recordedBy;
    private LocalDateTime createdAt;
}
