package aranya.crm.dto.request;

import lombok.Getter;
import lombok.Setter;

import java.util.List;

@Getter
@Setter
public class UpdateAssigneesRequest {
    private List<Long> userIds;
}
