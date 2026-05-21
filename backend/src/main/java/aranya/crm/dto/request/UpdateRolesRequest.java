package aranya.crm.dto.request;

import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.Size;
import lombok.Data;

import java.util.List;

@Data
public class UpdateRolesRequest {

    @NotEmpty
    @Size(min = 1, max = 1, message = "exactly one role must be selected")
    private List<String> roles;
}
