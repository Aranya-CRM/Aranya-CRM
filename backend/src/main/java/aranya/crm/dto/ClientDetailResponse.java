package aranya.crm.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

@Data
@Builder
@AllArgsConstructor
public class ClientDetailResponse {
    private Long id;
    private String abbr;
    private String nameEn;
    private String nameChn;
    private String contact;
    private String preferredCommunication;
    private boolean whatsappEnabled;
    private String preferredLanguage;
    private String spokenLanguage;
    private String addressText;
    private String postalCode;
    private String areaDistrict;
    private String viharaType;
    private String gender;
    private LocalDate dateOfBirth;
    private String maritalStatus;
    private String nationality;
    private String ethnicity;
    private String dialectGroup;
    private String membershipStatus;
    private LocalDate dateJoined;
    private String membershipRemarks;
    private String buddhistTradition;
    private String ordinationStatus;
    private boolean wellbeingLivingConditions;
    private boolean wellbeingMentalHealth;
    private boolean wellbeingPhysicalHealth;
    private boolean wellbeingFinancialStability;
    private boolean wellbeingSocialSupport;
    private boolean wellbeingLegalIssues;
    private boolean wellbeingSpiritual;
    private String wellbeingRemarks;
    private String specialNeeds;
    private String specialNeedsRemarks;
    private String nextOfKinContact;
    private String comments;
    private LocalDateTime createdAt;
    private List<RelatedContactResponse> relatedContacts;
}
