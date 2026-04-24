package aranya.crm.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class TwoFactorEnableRequest {

    @NotBlank
    private String secret;

    @NotBlank
    @Size(min = 6, max = 6, message = "Code must be 6 digits")
    private String code;
}
