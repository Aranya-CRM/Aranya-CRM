package aranya.crm.controller;

import aranya.crm.dto.DashboardResponse;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

/*TODO:
*  目前只是临时模拟数据,还需要修改
* */
@RestController
@RequestMapping("/api/dashboard")
public class DashboardController {

    @GetMapping
    public ResponseEntity<DashboardResponse> getDashboard() {
        return ResponseEntity.ok(
                DashboardResponse.builder()
                        .activeCases(List.of(
                                DashboardResponse.ActiveCase.builder()
                                        .id("case-001")
                                        .title(text("紧急住房支持", "Emergency Housing Support"))
                                        .client(text("释慧明", "Bhante Sumedho"))
                                        .status(text("审核中", "In Review"))
                                        .build(),
                                DashboardResponse.ActiveCase.builder()
                                        .id("case-002")
                                        .title(text("医疗补助申请", "Medical Assistance Application"))
                                        .client(text("释妙音", "Bhante Dhamma"))
                                        .status(text("待跟进", "Pending Follow-up"))
                                        .build()
                        ))
                        .attentionCases(List.of(
                                DashboardResponse.AttentionCase.builder()
                                        .id("attention-001")
                                        .client(text("释妙音", "Bhante Dhamma"))
                                        .reason(text("等待志愿者分配", "Awaiting volunteer assignment"))
                                        .daysOpen(5)
                                        .build(),
                                DashboardResponse.AttentionCase.builder()
                                        .id("attention-002")
                                        .client(text("释法住", "Bhante Saddha"))
                                        .reason(text("补充材料待提交", "Supporting documents pending"))
                                        .daysOpen(3)
                                        .build()
                        ))
                        .upcomingAppointments(List.of(
                                DashboardResponse.UpcomingAppointment.builder()
                                        .id("appt-001")
                                        .startsAt("2026-04-10T10:00:00+08:00")
                                        .client(text("释慧明", "Bhante Sumedho"))
                                        .purpose(text("家访评估", "Home Visit Assessment"))
                                        .build(),
                                DashboardResponse.UpcomingAppointment.builder()
                                        .id("appt-002")
                                        .startsAt("2026-04-11T14:30:00+08:00")
                                        .client(text("释妙音", "Bhante Dhamma"))
                                        .purpose(text("个案跟进", "Case Follow-up"))
                                        .build()
                        ))
                        .build()
        );
    }

    private DashboardResponse.LocalizedText text(String zh, String en) {
        return new DashboardResponse.LocalizedText(zh, en);
    }
}

