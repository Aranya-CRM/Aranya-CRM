package aranya.crm.dto.request;

import jakarta.validation.constraints.NotNull;
import lombok.Getter;
import lombok.Setter;

import java.time.LocalDate;

@Getter
@Setter
public class CreateReportRequest {

    @NotNull
    private Long clientId;

    @NotNull
    private LocalDate dateOfVisit;

    private String timeOfVisit;
    private String durationOfVisit;
    private String staffName;
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
}
