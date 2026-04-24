package aranya.crm.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class TwoFactorVerifyRequest {

    @NotBlank
    private String tempToken;

    @NotBlank
    private String code;
}
