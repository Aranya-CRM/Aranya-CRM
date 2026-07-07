package aranya.crm.dto.response;

import lombok.Builder;
import lombok.Data;

import java.time.OffsetDateTime;

@Data
@Builder
public class MeResponse {
    private Long id;
    private String email;
    private String fullName;
    private String username;
    private String phone;
    private boolean emailVerified;
    private String status;
    private String preferredLanguage;
    private OffsetDateTime createdAt;
}
