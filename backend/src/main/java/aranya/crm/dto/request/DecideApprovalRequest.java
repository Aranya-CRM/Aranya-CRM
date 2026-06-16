package aranya.crm.dto.request;

import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class DecideApprovalRequest {

    @Size(max = 1000)
    private String comment;
}
