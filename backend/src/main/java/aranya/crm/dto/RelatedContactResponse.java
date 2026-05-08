package aranya.crm.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;

@Data
@Builder
@AllArgsConstructor
public class RelatedContactResponse {
    private Long id;
    private String name;
    private String relationshipType;
    private String phone;
    private String email;
    private String addressText;
    private boolean primary;
    private String notes;
}
