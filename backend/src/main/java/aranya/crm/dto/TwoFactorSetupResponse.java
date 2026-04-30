package aranya.crm.dto;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class TwoFactorSetupResponse {
    private String secret;
    private String qrCodeUri;
    private String qrCodeBase64;
}
