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

    // 负责人(可空;模板事件的人力以 manpower 自由文本记录)
    private Long assignedUserId;

    @NotNull
    private LocalDateTime scheduledStart;

    // 结束时间(可空;用于组织日历的时间段展示)
    private LocalDateTime scheduledEnd;

    // 报告应提交的截止时间(可空,由分配者指定);留空则不做截止提醒
    private LocalDateTime reportDueAt;

    @Size(max = 2000)
    private String workDescription;

    @Size(max = 2000)
    private String notes;

    @Size(max = 255)
    private String calendarId;        // 写入的目标日历(可空,默认用配置的默认日历)

    @Size(max = 255)
    private String location;          // 短地点名,进标题 @X

    @Size(max = 2000)
    private String address;           // 完整地址(多行),进正文 *Address*

    // ── 组织日历模板字段 ──
    @Size(max = 4000)
    private String agenda;          // *Agenda*

    @Size(max = 4000)
    private String schedule;        // *Schedule*

    @Size(max = 4000)
    private String manpower;        // *Manpower*(自由文本)

    @Size(max = 4000)
    private String instructions;    // *Instructions for Kappiya*
}
