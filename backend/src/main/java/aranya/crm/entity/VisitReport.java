package aranya.crm.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.Setter;

import java.time.LocalDate;
import java.time.LocalDateTime;

@Getter
@Setter
@Entity
@Table(name = "visit_report")
public class VisitReport {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "client_id", nullable = false)
    private Client client;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "created_by")
    private User createdBy;

    @Column(name = "staff_name", length = 150)
    private String staffName;

    @Column(name = "report_timestamp", nullable = false)
    private LocalDateTime reportTimestamp;

    @Column(name = "date_of_visit", nullable = false)
    private LocalDate dateOfVisit;

    @Column(name = "time_of_visit", length = 20)
    private String timeOfVisit;

    @Column(name = "duration_of_visit", length = 50)
    private String durationOfVisit;

    @Column(name = "location")
    private String location;

    @Column(name = "programme_name")
    private String programmeName;

    @Column(name = "type_of_visit", length = 100)
    private String typeOfVisit;

    @Column(name = "purpose_of_visit", columnDefinition = "TEXT")
    private String purposeOfVisit;

    @Column(name = "what_was_done", columnDefinition = "TEXT")
    private String whatWasDone;

    @Column(name = "environment_observations", columnDefinition = "TEXT")
    private String environmentObservations;

    @Column(name = "sangha_observations", columnDefinition = "TEXT")
    private String sanghaObservations;

    @Column(name = "other_observations", columnDefinition = "TEXT")
    private String otherObservations;

    @Column(name = "personal_reflections", columnDefinition = "TEXT")
    private String personalReflections;

    @Column(name = "recommendations", columnDefinition = "TEXT")
    private String recommendations;

    @Column(name = "matters_to_highlight", columnDefinition = "TEXT")
    private String mattersToHighlight;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @PrePersist
    protected void onCreate() {
        LocalDateTime now = LocalDateTime.now();
        if (this.reportTimestamp == null) {
            this.reportTimestamp = now;
        }
        if (this.createdAt == null) {
            this.createdAt = now;
        }
    }
}
