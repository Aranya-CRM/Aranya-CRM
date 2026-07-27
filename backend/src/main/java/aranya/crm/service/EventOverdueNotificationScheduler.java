package aranya.crm.service;

import aranya.crm.config.EventReminderProperties;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

@Slf4j
@Component
@RequiredArgsConstructor
public class EventOverdueNotificationScheduler {

    private final EventOverdueNotificationService notificationService;
    private final EventReminderProperties properties;

    @Scheduled(
            cron = "${app.event-reminders.cron:0 */10 * * * *}",
            zone = "${app.event-reminders.time-zone:Asia/Singapore}"
    )
    public void notifyOverdueEventParticipants() {
        if (!properties.isEnabled()) return;

        try {
            EventOverdueNotificationService.ScanResult result = notificationService.scanAndNotify();
            if (result.notificationsCreated() > 0
                    || result.notificationsResolved() > 0
                    || result.emailsSent() > 0) {
                log.info(
                        "Event overdue scan completed: created={}, resolved={}, emailsSent={}",
                        result.notificationsCreated(),
                        result.notificationsResolved(),
                        result.emailsSent()
                );
            }
        } catch (Exception exception) {
            log.error("Event overdue scan failed; the next scheduled run will retry", exception);
        }
    }
}
