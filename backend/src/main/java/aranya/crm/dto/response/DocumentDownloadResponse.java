package aranya.crm.dto.response;

import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
public class DocumentDownloadResponse {
    private String url;
    private String fileName;
    private Long expiresInSeconds;
}
