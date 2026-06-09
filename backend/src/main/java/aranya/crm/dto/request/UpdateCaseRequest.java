package aranya.crm.dto.request;

import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class UpdateCaseRequest {

    @Size(max = 20)
    private String status;

    @Size(max = 20)
    private String colorCode;

    private Long socialWorkerId;

    private String comments;

    private String remarks;
}
