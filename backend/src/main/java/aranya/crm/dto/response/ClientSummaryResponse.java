package aranya.crm.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;

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
    private String membershipStatus;
}
