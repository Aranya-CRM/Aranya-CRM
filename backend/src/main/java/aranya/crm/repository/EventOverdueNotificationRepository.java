package aranya.crm.repository;

import aranya.crm.entity.EventOverdueNotification;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface EventOverdueNotificationRepository extends JpaRepository<EventOverdueNotification, Long> {

    @EntityGraph(attributePaths = {"event", "recipientUser"})
    List<EventOverdueNotification> findTop50ByRecipientUser_IdAndResolvedAtIsNullOrderByCreatedAtDesc(
            Long recipientUserId
    );

    Optional<EventOverdueNotification> findByIdAndRecipientUser_Id(Long id, Long recipientUserId);

    @Query(value = """
            SELECT *
            FROM event_overdue_notification
            WHERE resolved_at IS NULL
              AND email_status IN ('PENDING', 'FAILED')
              AND email_attempts < :maxAttempts
            ORDER BY created_at ASC
            LIMIT 100
            FOR UPDATE SKIP LOCKED
            """, nativeQuery = true)
    List<EventOverdueNotification> lockRetryableEmails(@Param("maxAttempts") int maxAttempts);
}
