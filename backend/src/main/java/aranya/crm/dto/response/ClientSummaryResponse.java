package aranya.crm.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;

import java.time.LocalDate;
import java.time.LocalDateTime;

@Data
@Builder
@AllArgsConstructor
public class ClientSummaryResponse {
    private Long id;
    private String abbr;
    private String nameEn;
    private String nameChn;
    private String contact;
    private String preferredCommunication;
    private String preferredLanguage;
    private String area;
    private String buddhistTradition;
    private String ordinationStatus;
    private String gender;
    private LocalDate dateOfBirth;
    private LocalDate dateOfOrdination;
    private String membershipStatus;
    private LocalDateTime createdAt;
}
