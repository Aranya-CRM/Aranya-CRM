package aranya.crm.dto;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class MeResponse {
    private Long id;
    private String email;
    private String fullName;
}
