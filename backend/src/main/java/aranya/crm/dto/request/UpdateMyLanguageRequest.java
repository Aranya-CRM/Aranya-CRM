package aranya.crm.dto.request;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class UpdateMyLanguageRequest {
    /** 界面语言:zh 或 en。 */
    @NotBlank
    private String language;
}
