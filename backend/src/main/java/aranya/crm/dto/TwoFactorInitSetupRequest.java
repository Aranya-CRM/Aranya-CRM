package aranya.crm.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class TwoFactorInitSetupRequest {

    @NotBlank
    private String tempToken;
}
