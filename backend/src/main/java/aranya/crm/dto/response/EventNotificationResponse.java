package aranya.crm.dto.response;

import lombok.Builder;
import lombok.Data;

import java.time.LocalDateTime;

@Data
@Builder
public class EventNotificationResponse {
    private Long id;
    private Long eventId;
    private LocalDateTime deadline;
    private LocalDateTime createdAt;
    private LocalDateTime readAt;
}
