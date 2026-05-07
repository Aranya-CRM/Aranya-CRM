package aranya.crm.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;

import java.util.List;

/*TODO:
*  目前还是临时数据,还需要修改*/
@Data
@Builder
public class DashboardResponse {
    private List<ActiveCase> activeCases;
    private List<AttentionCase> attentionCases;
    private List<UpcomingAppointment> upcomingAppointments;

    @Data
    @Builder
    @AllArgsConstructor
    public static class LocalizedText {
        private String zh;
        private String en;
    }

    @Data
    @Builder
    public static class ActiveCase {
        private String id;
        private LocalizedText title;
        private LocalizedText client;
        private LocalizedText status;
    }

    @Data
    @Builder
    public static class AttentionCase {
        private String id;
        private LocalizedText client;
        private LocalizedText reason;
        private int daysOpen;
    }

    @Data
    @Builder
    public static class UpcomingAppointment {
        private String id;
        private String startsAt;
        private LocalizedText client;
        private LocalizedText purpose;
    }
}
