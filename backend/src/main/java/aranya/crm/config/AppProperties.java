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
    private JwtProperties jwt = new JwtProperties();

    @Data
    public static class CorsProperties {
        private List<String> allowedOrigins;
    }

    @Data
    public static class JwtProperties {
        private String secret;
        private long accessTokenExpiration;
        private long refreshTokenExpiration;
    }
}
