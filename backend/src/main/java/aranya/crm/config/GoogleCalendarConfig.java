package aranya.crm.config;

import com.google.api.client.googleapis.javanet.GoogleNetHttpTransport;
import com.google.api.client.http.HttpRequestInitializer;
import com.google.api.client.json.gson.GsonFactory;
import com.google.auth.http.HttpCredentialsAdapter;
import com.google.auth.oauth2.GoogleCredentials;
import com.google.auth.oauth2.ServiceAccountCredentials;
import com.google.auth.oauth2.UserCredentials;
import com.google.api.services.calendar.Calendar;
import com.google.api.services.calendar.CalendarScopes;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.io.Resource;
import org.springframework.core.io.ResourceLoader;

import java.io.InputStream;
import java.util.Set;

/**
 * 构建 Google Calendar API 客户端。
 * 支持两种认证:
 *  - SERVICE_ACCOUNT:Service Account JSON(可选域级委派)
 *  - OAUTH:后端持有单一账号(如 infotech@aranya.sg)的 refresh token
 * 当 google.calendar.enabled=false 或凭证缺失/失败时返回 null,由 GoogleCalendarService 容错跳过。
 */
@Slf4j
@Configuration
@RequiredArgsConstructor
public class GoogleCalendarConfig {

    private final GoogleCalendarProperties properties;
    private final ResourceLoader resourceLoader;

    @Bean
    public Calendar googleCalendarClient() {
        if (!properties.isEnabled()) {
            log.info("Google Calendar integration disabled (google.calendar.enabled=false)");
            return null;
        }
        try {
            GoogleCredentials credentials = "OAUTH".equalsIgnoreCase(properties.getAuthMode())
                    ? buildOAuthCredentials()
                    : buildServiceAccountCredentials();
            if (credentials == null) {
                return null;
            }
            HttpRequestInitializer initializer = new HttpCredentialsAdapter(credentials);
            Calendar calendar = new Calendar.Builder(
                    GoogleNetHttpTransport.newTrustedTransport(),
                    GsonFactory.getDefaultInstance(),
                    initializer)
                    .setApplicationName(properties.getApplicationName())
                    .build();
            log.info("Google Calendar client initialized (mode={}, calendars={})",
                    properties.getAuthMode(), properties.resolveCalendars());
            return calendar;
        } catch (Exception e) {
            log.error("Failed to initialize Google Calendar client; integration inactive", e);
            return null;
        }
    }

    /** OAuth:用单一账号的 refresh token 刷新访问令牌(scope 由该 token 已授予的范围决定)。 */
    private GoogleCredentials buildOAuthCredentials() {
        String clientId = properties.getOauthClientId();
        String clientSecret = properties.getOauthClientSecret();
        String refreshToken = properties.getOauthRefreshToken();
        if (isBlank(clientId) || isBlank(clientSecret) || isBlank(refreshToken)) {
            log.warn("Google Calendar OAUTH mode but clientId/clientSecret/refreshToken incomplete; integration inactive");
            return null;
        }
        return UserCredentials.newBuilder()
                .setClientId(clientId)
                .setClientSecret(clientSecret)
                .setRefreshToken(refreshToken)
                .build();
    }

    /** Service Account:从 JSON 构造,可选域级委派模拟某 Workspace 用户。 */
    private GoogleCredentials buildServiceAccountCredentials() throws Exception {
        String path = properties.getServiceAccountPath();
        if (isBlank(path)) {
            log.warn("Google Calendar enabled but no serviceAccountPath configured; integration inactive");
            return null;
        }
        Resource serviceAccount = resourceLoader.getResource(path);
        if (!serviceAccount.exists()) {
            log.warn("Google Calendar service account file not found: {}; integration inactive", path);
            return null;
        }
        try (InputStream in = serviceAccount.getInputStream()) {
            ServiceAccountCredentials.Builder builder = ServiceAccountCredentials.fromStream(in)
                    .toBuilder()
                    .setScopes(Set.of(CalendarScopes.CALENDAR));
            String subject = properties.getImpersonatedUser();
            if (subject != null && !subject.isBlank()) {
                builder.setServiceAccountUser(subject);
                log.info("Google Calendar using domain-wide delegation, impersonating {}", subject);
            }
            return builder.build();
        }
    }

    private boolean isBlank(String s) {
        return s == null || s.isBlank();
    }
}
