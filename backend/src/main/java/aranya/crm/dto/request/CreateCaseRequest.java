package aranya.crm.dto.request;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.Setter;

import java.time.LocalDate;
import java.util.List;

@Getter
@Setter
public class CreateCaseRequest {

    @NotNull
    private Long clientId;

    private Long socialWorkerId;

    @NotNull
    private LocalDate openedAt;

    @Size(max = 20)
    private String status;

    @Size(max = 20)
    private String colorCode;

    private String comments;

    private String remarks;

    private List<String> services;
}
