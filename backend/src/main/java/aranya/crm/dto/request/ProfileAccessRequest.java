package aranya.crm.dto.request;

import aranya.crm.entity.ClientProfileSection;
import lombok.Getter;
import lombok.Setter;

import java.util.List;

/** Full-set replacement of a user's sensitive client-profile section grants. */
@Getter
@Setter
public class ProfileAccessRequest {
    private List<ClientProfileSection> sections;
}
