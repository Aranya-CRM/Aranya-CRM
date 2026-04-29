package aranya.crm.dto;

import lombok.Builder;
import lombok.Data;

import java.util.List;

@Data
@Builder
public class LoginResponse {
    private String accessToken;
    private String refreshToken;
    private String tokenType;
    private long expiresIn;
    private String email;
    private String fullName;
    private List<String> roles;
    private Boolean requiresTwoFactor;
    private String tempToken;
}
