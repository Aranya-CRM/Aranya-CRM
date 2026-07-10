package aranya.crm.config;

import lombok.Data;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

import java.time.Duration;

@Data
@Component
@ConfigurationProperties(prefix = "storage")
public class FileStorageProperties {

    private int maxUploadSizeMb = 25;
    private GcsProperties gcs = new GcsProperties();

    @Data
    public static class GcsProperties {
        private String bucketName = "";
        private int signedUrlTtlMinutes = 10;

        public Duration getSignedUrlTtl() {
            return Duration.ofMinutes(signedUrlTtlMinutes);
        }
    }
}
