package aranya.crm.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.Setter;

import java.time.LocalDateTime;

@Getter
@Setter
public class CreateServiceEventRequest {

    @NotBlank
    @Size(max = 80)
    private String serviceKey;

    @NotNull
    private Long assignedUserId;

    @NotNull
    private LocalDateTime scheduledStart;

    @Size(max = 255)
    private String location;
}
