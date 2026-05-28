package aranya.crm.dto.request;

import jakarta.validation.constraints.NotBlank;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class CreateCaseNoteRequest {

    @NotBlank
    private String content;

    private String followUp;
}
