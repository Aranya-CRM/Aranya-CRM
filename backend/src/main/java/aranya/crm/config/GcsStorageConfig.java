package aranya.crm.config;

import com.google.cloud.storage.Storage;
import com.google.cloud.storage.StorageOptions;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Lazy;

@Configuration
public class GcsStorageConfig {

    @Bean
    @Lazy
    public Storage gcsStorage() {
        return StorageOptions.getDefaultInstance().getService();
    }
}
