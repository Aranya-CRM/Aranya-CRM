package aranya.crm.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;

@Data
@Builder
@AllArgsConstructor
public class UserAssignmentResponse {
    private Long id;
    private String fullName;
    private String email;
    private String role;
}
