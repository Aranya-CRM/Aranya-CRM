package aranya.crm.config;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.boot.context.properties.bind.Binder;
import org.springframework.boot.context.properties.source.MapConfigurationPropertySource;

import java.time.Duration;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;

class FileStoragePropertiesTest {

    @Test
    @DisplayName("File storage properties bind GCS bucket and upload limits")
    void fileStorageProperties_bindGcsBucketAndUploadLimits() {
        MapConfigurationPropertySource source = new MapConfigurationPropertySource(Map.of(
                "storage.max-upload-size-mb", "30",
                "storage.gcs.bucket-name", "aranya-case-files-dev",
                "storage.gcs.signed-url-ttl-minutes", "15"
        ));

        FileStorageProperties properties = new Binder(source)
                .bind("storage", FileStorageProperties.class)
                .orElseThrow();

        assertThat(properties.getMaxUploadSizeMb()).isEqualTo(30);
        assertThat(properties.getGcs().getBucketName()).isEqualTo("aranya-case-files-dev");
        assertThat(properties.getGcs().getSignedUrlTtl()).isEqualTo(Duration.ofMinutes(15));
    }

    @Test
    @DisplayName("File storage properties use conservative defaults")
    void fileStorageProperties_useConservativeDefaults() {
        FileStorageProperties properties = new FileStorageProperties();

        assertThat(properties.getMaxUploadSizeMb()).isEqualTo(25);
        assertThat(properties.getGcs().getBucketName()).isBlank();
        assertThat(properties.getGcs().getSignedUrlTtl()).isEqualTo(Duration.ofMinutes(10));
    }
}
