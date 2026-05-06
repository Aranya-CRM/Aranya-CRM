package aranya.crm.dto.request;

import jakarta.validation.constraints.NotEmpty;
import lombok.Data;

import java.util.List;

@Data
public class UpdateRolesRequest {

    @NotEmpty
    private List<String> roles;
}
