package aranya.crm.service;

import aranya.crm.config.EventReminderProperties;
import aranya.crm.dto.response.EventNotificationResponse;
import aranya.crm.entity.EventOverdueNotification;
import aranya.crm.entity.User;
import aranya.crm.repository.EventOverdueNotificationRepository;
import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.sql.Timestamp;
import java.time.LocalDateTime;
import java.util.List;

@Slf4j
@Service
@RequiredArgsConstructor
public class EventOverdueNotificationService {

    private final JdbcTemplate jdbcTemplate;
    private final EventOverdueNotificationRepository notificationRepository;
    private final GmailEmailGateway emailGateway;
    private final EventReminderProperties properties;

    /**
     * Finds overdue events, creates one persistent notification per active participant,
     * and sends each email through the Gmail API.
     */
    @Transactional
    public ScanResult scanAndNotify() {
        int resolved = resolveStaleNotifications();
        int created = createMissingNotifications();
        int emailsSent = sendPendingEmails();
        return new ScanResult(created, resolved, emailsSent);
    }

    @Transactional(readOnly = true)
    public List<EventNotificationResponse> listForUser(User currentUser) {
        Long userId = requireUserId(currentUser);
        return notificationRepository
                .findTop50ByRecipientUser_IdAndResolvedAtIsNullOrderByCreatedAtDesc(userId)
                .stream()
                .map(this::toResponse)
                .toList();
    }

    @Transactional
    public EventNotificationResponse markRead(Long notificationId, User currentUser) {
        Long userId = requireUserId(currentUser);
        EventOverdueNotification notification = notificationRepository
                .findByIdAndRecipientUser_Id(notificationId, userId)
                .orElseThrow(() -> new EntityNotFoundException("Notification not found: " + notificationId));
        if (notification.getResolvedAt() != null) {
            throw new EntityNotFoundException("Notification not found: " + notificationId);
        }
        if (notification.getReadAt() == null) {
            notification.setReadAt(LocalDateTime.now());
        }
        return toResponse(notification);
    }

    @Transactional
    public int markAllRead(User currentUser) {
        Long userId = requireUserId(currentUser);
        return jdbcTemplate.update("""
                UPDATE event_overdue_notification
                SET read_at = CURRENT_TIMESTAMP
                WHERE recipient_user_id = ?
                  AND resolved_at IS NULL
                  AND read_at IS NULL
                """, userId);
    }

    @Transactional
    public int resolveForEvent(Long eventId) {
        if (eventId == null) return 0;
        return jdbcTemplate.update("""
                UPDATE event_overdue_notification
                SET resolved_at = CURRENT_TIMESTAMP
                WHERE event_id = ?
                  AND resolved_at IS NULL
                """, eventId);
    }

    private int resolveStaleNotifications() {
        return jdbcTemplate.update("""
                UPDATE event_overdue_notification notification
                SET resolved_at = CURRENT_TIMESTAMP
                WHERE notification.resolved_at IS NULL
                  AND (
                    EXISTS (
                      SELECT 1
                      FROM visit_report report
                      WHERE report.service_appointment_id = notification.event_id
                        AND UPPER(report.status) = 'SUBMITTED'
                    )
                    OR NOT EXISTS (
                      SELECT 1
                      FROM service_event_assignment assignment
                      WHERE assignment.service_appointment_id = notification.event_id
                        AND assignment.user_id = notification.recipient_user_id
                        AND UPPER(assignment.status) = 'ACTIVE'
                    )
                    OR EXISTS (
                      SELECT 1
                      FROM service_appointment event
                      WHERE event.id = notification.event_id
                        AND UPPER(event.status) IN ('CANCELLED', 'DELETED')
                    )
                  )
                """);
    }

    private int createMissingNotifications() {
        String sql = """
                SELECT event.id AS event_id,
                       assignment.user_id AS recipient_user_id,
                       COALESCE(
                         event.report_due_at,
                         COALESCE(event.scheduled_end, event.scheduled_start)
                           + make_interval(hours => ?)
                       ) AS deadline
                FROM service_appointment event
                JOIN service_event_assignment assignment
                  ON assignment.service_appointment_id = event.id
                 AND UPPER(assignment.status) = 'ACTIVE'
                JOIN users recipient
                  ON recipient.id = assignment.user_id
                 AND UPPER(recipient.status) = 'ACTIVE'
                WHERE UPPER(event.status) NOT IN ('CANCELLED', 'DELETED')
                  AND COALESCE(
                        event.report_due_at,
                        COALESCE(event.scheduled_end, event.scheduled_start)
                          + make_interval(hours => ?)
                      ) < CURRENT_TIMESTAMP
                  AND NOT EXISTS (
                    SELECT 1
                    FROM visit_report report
                    WHERE report.service_appointment_id = event.id
                      AND UPPER(report.status) = 'SUBMITTED'
                  )
                """;

        List<OverdueCandidate> candidates = jdbcTemplate.query(
                sql,
                (resultSet, rowNum) -> new OverdueCandidate(
                        resultSet.getLong("event_id"),
                        resultSet.getLong("recipient_user_id"),
                        resultSet.getTimestamp("deadline").toLocalDateTime()
                ),
                properties.getGraceHours(),
                properties.getGraceHours()
        );

        int created = 0;
        for (OverdueCandidate candidate : candidates) {
            created += jdbcTemplate.update("""
                    INSERT INTO event_overdue_notification (
                      event_id, recipient_user_id, deadline, created_at,
                      email_status, email_attempts
                    )
                    VALUES (?, ?, ?, CURRENT_TIMESTAMP, 'PENDING', 0)
                    ON CONFLICT (event_id, recipient_user_id) DO NOTHING
                    """,
                    candidate.eventId(),
                    candidate.recipientUserId(),
                    Timestamp.valueOf(candidate.deadline())
            );
        }
        return created;
    }

    private int sendPendingEmails() {
        if (!emailGateway.isEnabled()) return 0;

        int sent = 0;
        List<EventOverdueNotification> notifications = notificationRepository
                .lockRetryableEmails(properties.getMaxEmailAttempts());

        for (EventOverdueNotification notification : notifications) {
            notification.setEmailStatus("SENDING");
            notification.setEmailAttempts(notification.getEmailAttempts() + 1);
            notification.setLastEmailAttemptAt(LocalDateTime.now());
            try {
                String messageId = emailGateway.sendOverdueEmail(
                        notification.getEvent(),
                        notification.getRecipientUser(),
                        notification.getDeadline()
                );
                notification.setEmailStatus("SENT");
                notification.setEmailDocumentId(messageId);
                notification.setEmailError(null);
                sent++;
            } catch (InterruptedException exception) {
                Thread.currentThread().interrupt();
                recordEmailFailure(notification, exception);
                break;
            } catch (Exception exception) {
                recordEmailFailure(notification, exception);
            }
        }
        return sent;
    }

    private void recordEmailFailure(EventOverdueNotification notification, Exception exception) {
        notification.setEmailStatus("FAILED");
        String message = exception.getMessage() != null
                ? exception.getMessage()
                : exception.getClass().getSimpleName();
        notification.setEmailError(message.substring(0, Math.min(message.length(), 2000)));
        log.warn("Failed to send overdue email for event {} and user {}",
                notification.getEvent().getId(),
                notification.getRecipientUser().getId(),
                exception);
    }

    private EventNotificationResponse toResponse(EventOverdueNotification notification) {
        return EventNotificationResponse.builder()
                .id(notification.getId())
                .eventId(notification.getEvent().getId())
                .deadline(notification.getDeadline())
                .createdAt(notification.getCreatedAt())
                .readAt(notification.getReadAt())
                .build();
    }

    private Long requireUserId(User currentUser) {
        if (currentUser == null || currentUser.getId() == null) {
            throw new AccessDeniedException("Authenticated user is required");
        }
        return currentUser.getId();
    }

    private record OverdueCandidate(Long eventId, Long recipientUserId, LocalDateTime deadline) {}

    public record ScanResult(int notificationsCreated, int notificationsResolved, int emailsSent) {}
}
