package aranya.crm.dto;

import lombok.Builder;
import lombok.Data;

import java.util.List;

@Data
@Builder
public class MeResponse {
    private Long id;
    private String email;
    private String fullName;
    private List<String> roles;
}
