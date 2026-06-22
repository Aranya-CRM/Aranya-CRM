package aranya.crm.config;

import com.google.api.client.googleapis.javanet.GoogleNetHttpTransport;
import com.google.api.client.http.HttpRequestInitializer;
import com.google.api.client.json.gson.GsonFactory;
import com.google.auth.http.HttpCredentialsAdapter;
import com.google.auth.oauth2.GoogleCredentials;
import com.google.auth.oauth2.ServiceAccountCredentials;
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
 * 构建 Google Calendar API 客户端(基于 Service Account 凭证)。
 * 当 google.calendar.enabled=false 或凭证缺失时返回 null,由 GoogleCalendarService 容错跳过。
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
        String path = properties.getServiceAccountPath();
        if (path == null || path.isBlank()) {
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
                // 域级委派(DWD):以指定 Workspace 用户身份操作,无需对外共享日历
                builder.setServiceAccountUser(subject);
                log.info("Google Calendar using domain-wide delegation, impersonating {}", subject);
            }
            GoogleCredentials credentials = builder.build();
            HttpRequestInitializer initializer = new HttpCredentialsAdapter(credentials);
            Calendar calendar = new Calendar.Builder(
                    GoogleNetHttpTransport.newTrustedTransport(),
                    GsonFactory.getDefaultInstance(),
                    initializer)
                    .setApplicationName(properties.getApplicationName())
                    .build();
            log.info("Google Calendar client initialized for calendarId={}", properties.getCalendarId());
            return calendar;
        } catch (Exception e) {
            log.error("Failed to initialize Google Calendar client; integration inactive", e);
            return null;
        }
    }
}
