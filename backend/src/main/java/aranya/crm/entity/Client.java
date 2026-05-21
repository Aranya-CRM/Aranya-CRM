package aranya.crm.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.Setter;
import org.hibernate.annotations.DynamicUpdate;

import java.time.LocalDate;
import java.time.LocalDateTime;

@Getter
@Setter
@Entity
@Table(name = "client")
@DynamicUpdate
public class Client {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "abbr", nullable = false, unique = true, length = 20)
    private String abbr;

    @Column(name = "name_en", nullable = false, length = 150)
    private String nameEn;

    @Column(name = "name_chn", length = 100)
    private String nameChn;

    @Column(length = 20)
    private String contact;

    @Column(name = "preferred_communication", length = 50)
    private String preferredCommunication;

    @Column(name = "whatsapp_enabled", nullable = false)
    private boolean whatsappEnabled = false;

    @Column(name = "preferred_language", length = 50)
    private String preferredLanguage;

    @Column(name = "spoken_language", length = 100)
    private String spokenLanguage;

    @Column(name = "address_text", columnDefinition = "TEXT")
    private String addressText;

    @Column(name = "postal_code", length = 20)
    private String postalCode;

    @Column(name = "area_district", length = 100)
    private String areaDistrict;

    @Column(name = "vihara_type", length = 50)
    private String viharaType;

    @Column(name = "nric_name_en", length = 150)
    private String nricNameEn;

    @Column(name = "nric_name_chn", length = 100)
    private String nricNameChn;

    @Column(name = "nric_no", length = 50)
    private String nricNo;

    @Column(name = "ordination_certificate_status", length = 20)
    private String ordinationCertificateStatus;

    @Column(name = "date_of_verification")
    private LocalDate dateOfVerification;

    @Column(length = 10)
    private String gender;

    @Column(name = "date_of_birth")
    private LocalDate dateOfBirth;

    @Column(name = "marital_status", length = 30)
    private String maritalStatus;

    @Column(length = 50)
    private String nationality;

    @Column(length = 50)
    private String ethnicity;

    @Column(name = "dialect_group", length = 50)
    private String dialectGroup;

    @Column(name = "membership_status", nullable = false, length = 30)
    private String membershipStatus = "ACTIVE";

    @Column(name = "date_joined")
    private LocalDate dateJoined;

    @Column(name = "membership_remarks", columnDefinition = "TEXT")
    private String membershipRemarks;

    @Column(name = "buddhist_tradition", length = 30)
    private String buddhistTradition;

    @Column(name = "ordination_status", length = 30)
    private String ordinationStatus;

    @Column(name = "date_of_tonsure")
    private LocalDate dateOfTonsure;

    @Column(name = "country_of_tonsure", length = 50)
    private String countryOfTonsure;

    @Column(name = "place_of_tonsure", length = 100)
    private String placeOfTonsure;

    @Column(name = "date_of_ordination")
    private LocalDate dateOfOrdination;

    @Column(name = "country_of_ordination", length = 50)
    private String countryOfOrdination;

    @Column(name = "place_of_ordination", length = 100)
    private String placeOfOrdination;

    @Column(name = "wellbeing_living_conditions", nullable = false)
    private boolean wellbeingLivingConditions = false;

    @Column(name = "wellbeing_mental_health", nullable = false)
    private boolean wellbeingMentalHealth = false;

    @Column(name = "wellbeing_physical_health", nullable = false)
    private boolean wellbeingPhysicalHealth = false;

    @Column(name = "wellbeing_financial_stability", nullable = false)
    private boolean wellbeingFinancialStability = false;

    @Column(name = "wellbeing_social_support", nullable = false)
    private boolean wellbeingSocialSupport = false;

    @Column(name = "wellbeing_legal_issues", nullable = false)
    private boolean wellbeingLegalIssues = false;

    @Column(name = "wellbeing_spiritual", nullable = false)
    private boolean wellbeingSpiritual = false;

    @Column(name = "wellbeing_remarks", columnDefinition = "TEXT")
    private String wellbeingRemarks;

    @Column(name = "special_needs", length = 100)
    private String specialNeeds;

    @Column(name = "special_needs_remarks", columnDefinition = "TEXT")
    private String specialNeedsRemarks;

    @Column(name = "bank_transfer_info", length = 100)
    private String bankTransferInfo;

    @Column(name = "pay_now_info", length = 100)
    private String payNowInfo;

    @Column(name = "next_of_kin_contact", length = 100)
    private String nextOfKinContact;

    @Column(columnDefinition = "TEXT")
    private String comments;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @PrePersist
    protected void onCreate() {
        if (this.createdAt == null) {
            this.createdAt = LocalDateTime.now();
        }
    }
}
