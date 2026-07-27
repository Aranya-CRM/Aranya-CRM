package aranya.crm.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.Setter;

import java.time.LocalDateTime;

@Getter
@Setter
@Entity
@Table(name = "event_overdue_notification")
public class EventOverdueNotification {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "event_id", nullable = false)
    private ServiceAppointment event;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "recipient_user_id", nullable = false)
    private User recipientUser;

    @Column(name = "deadline", nullable = false)
    private LocalDateTime deadline;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "read_at")
    private LocalDateTime readAt;

    @Column(name = "resolved_at")
    private LocalDateTime resolvedAt;

    @Column(name = "email_status", nullable = false, length = 20)
    private String emailStatus;

    @Column(name = "email_document_id", length = 160)
    private String emailDocumentId;

    @Column(name = "email_attempts", nullable = false)
    private int emailAttempts;

    @Column(name = "email_error", columnDefinition = "TEXT")
    private String emailError;

    @Column(name = "last_email_attempt_at")
    private LocalDateTime lastEmailAttemptAt;
}
