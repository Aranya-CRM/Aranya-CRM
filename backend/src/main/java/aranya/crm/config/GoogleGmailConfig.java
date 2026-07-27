package aranya.crm.config;

import com.google.api.client.googleapis.javanet.GoogleNetHttpTransport;
import com.google.api.client.json.gson.GsonFactory;
import com.google.api.services.gmail.Gmail;
import com.google.auth.http.HttpCredentialsAdapter;
import com.google.auth.oauth2.UserCredentials;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Slf4j
@Configuration
@RequiredArgsConstructor
public class GoogleGmailConfig {

    private final GoogleGmailProperties properties;

    @Bean
    public Gmail googleGmailClient() {
        if (!properties.isEnabled()) {
            log.info("Gmail integration disabled (google.gmail.enabled=false)");
            return null;
        }
        if (isBlank(properties.getOauthClientId())
                || isBlank(properties.getOauthClientSecret())
                || isBlank(properties.getOauthRefreshToken())
                || isBlank(properties.getFromAddress())) {
            log.warn("Gmail integration enabled but OAuth credentials/from address are incomplete");
            return null;
        }
        try {
            UserCredentials credentials = UserCredentials.newBuilder()
                    .setClientId(properties.getOauthClientId())
                    .setClientSecret(properties.getOauthClientSecret())
                    .setRefreshToken(properties.getOauthRefreshToken())
                    .build();
            Gmail client = new Gmail.Builder(
                    GoogleNetHttpTransport.newTrustedTransport(),
                    GsonFactory.getDefaultInstance(),
                    new HttpCredentialsAdapter(credentials)
            )
                    .setApplicationName(properties.getApplicationName())
                    .build();
            log.info("Gmail API client initialized for sender {}", properties.getFromAddress());
            return client;
        } catch (Exception exception) {
            log.error("Failed to initialize Gmail API client; email reminders inactive", exception);
            return null;
        }
    }

    private boolean isBlank(String value) {
        return value == null || value.isBlank();
    }
}
