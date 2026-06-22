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

    // 报告应提交的截止时间(可空,由分配者指定);留空则不做截止提醒
    private LocalDateTime reportDueAt;

    @NotBlank
    @Size(max = 2000)
    private String workDescription;

    @Size(max = 2000)
    private String notes;

    @Size(max = 255)
    private String location;
}
