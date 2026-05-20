package aranya.crm.dto.request;

import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.Setter;

import java.time.LocalDate;

@Getter
@Setter
public class UpdateClientRequest {

    @Size(max = 150)
    private String nameEn;

    @Size(max = 100)
    private String nameChn;

    @Size(max = 20)
    private String abbr;

    @Size(max = 20)
    private String contact;

    @Size(max = 50)
    private String preferredCommunication;

    private Boolean whatsappEnabled;

    @Size(max = 50)
    private String preferredLanguage;

    @Size(max = 100)
    private String spokenLanguage;

    private String addressText;

    @Size(max = 20)
    private String postalCode;

    @Size(max = 100)
    private String areaDistrict;

    @Size(max = 50)
    private String viharaType;

    @Size(max = 150)
    private String nricNameEn;

    @Size(max = 100)
    private String nricNameChn;

    @Size(max = 50)
    private String nricNo;

    @Size(max = 20)
    private String ordinationCertificateStatus;

    private LocalDate dateOfVerification;

    @Size(max = 10)
    private String gender;

    private LocalDate dateOfBirth;

    @Size(max = 30)
    private String maritalStatus;

    @Size(max = 50)
    private String nationality;

    @Size(max = 50)
    private String ethnicity;

    @Size(max = 50)
    private String dialectGroup;

    private LocalDate dateJoined;

    private String membershipRemarks;

    @Size(max = 30)
    private String buddhistTradition;

    @Size(max = 30)
    private String ordinationStatus;

    private LocalDate dateOfTonsure;

    @Size(max = 50)
    private String countryOfTonsure;

    @Size(max = 100)
    private String placeOfTonsure;

    private LocalDate dateOfOrdination;

    @Size(max = 50)
    private String countryOfOrdination;

    @Size(max = 100)
    private String placeOfOrdination;

    private Boolean wellbeingPhysicalHealth;
    private Boolean wellbeingMentalHealth;
    private Boolean wellbeingSocialSupport;
    private Boolean wellbeingFinancialStability;
    private Boolean wellbeingLivingConditions;
    private Boolean wellbeingSpiritual;
    private Boolean wellbeingLegalIssues;

    private String wellbeingRemarks;

    @Size(max = 100)
    private String specialNeeds;

    private String specialNeedsRemarks;

    @Size(max = 100)
    private String bankTransferInfo;

    @Size(max = 100)
    private String payNowInfo;

    @Size(max = 100)
    private String nextOfKinContact;

    private String comments;
}
