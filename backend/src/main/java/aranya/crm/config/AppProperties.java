package aranya.crm.config;

import lombok.Data;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

import java.util.List;

@Data
@Component
@ConfigurationProperties(prefix = "app")
public class AppProperties {

    private CorsProperties cors = new CorsProperties();

    @Data
    public static class CorsProperties {
        private List<String> allowedOrigins;
    }

}
