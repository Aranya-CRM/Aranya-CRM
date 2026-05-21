package aranya.crm.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class CreateClientRequest {

    @NotBlank
    @Size(max = 150)
    private String nameEn;

    @Size(max = 100)
    private String nameChn;

    @NotBlank
    @Size(max = 20)
    private String abbr;

    @Size(max = 50)
    private String buddhistTradition;

    @Size(max = 30)
    private String ordinationStatus;

    @Size(max = 100)
    private String areaDistrict;

    @Size(max = 50)
    private String preferredLanguage;

    @Size(max = 20)
    private String contact;

    /** Intensity color for the initial case: GREEN, YELLOW, ORANGE, RED */
    @Size(max = 20)
    private String colorCode;
}
