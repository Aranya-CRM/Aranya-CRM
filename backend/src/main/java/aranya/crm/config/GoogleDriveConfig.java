package aranya.crm.config;

import com.google.api.client.googleapis.javanet.GoogleNetHttpTransport;
import com.google.api.client.http.HttpRequestInitializer;
import com.google.api.client.json.gson.GsonFactory;
import com.google.api.services.drive.Drive;
import com.google.auth.http.HttpCredentialsAdapter;
import com.google.auth.oauth2.GoogleCredentials;
import com.google.auth.oauth2.UserCredentials;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

/**
 * 构建 Google Drive API 客户端(一次性历史文件迁移用)。
 * 复用 {@link GoogleCalendarProperties} 里 infotech 的 OAuth 三元组(refresh token 需含 drive.readonly)。
 * google.drive.enabled=false 或凭证缺失时返回 null,由 GoogleDriveService 容错跳过。
 */
@Slf4j
@Configuration
@RequiredArgsConstructor
public class GoogleDriveConfig {

    private final GoogleDriveProperties driveProperties;
    private final GoogleCalendarProperties oauthProperties;

    @Bean
    public Drive googleDriveClient() {
        if (!driveProperties.isEnabled()) {
            log.info("Google Drive integration disabled (google.drive.enabled=false)");
            return null;
        }
        String clientId = oauthProperties.getOauthClientId();
        String clientSecret = oauthProperties.getOauthClientSecret();
        String refreshToken = oauthProperties.getOauthRefreshToken();
        if (isBlank(clientId) || isBlank(clientSecret) || isBlank(refreshToken)) {
            log.warn("Google Drive enabled but OAuth clientId/clientSecret/refreshToken incomplete; integration inactive");
            return null;
        }
        try {
            GoogleCredentials credentials = UserCredentials.newBuilder()
                    .setClientId(clientId)
                    .setClientSecret(clientSecret)
                    .setRefreshToken(refreshToken)
                    .build();
            HttpRequestInitializer initializer = new HttpCredentialsAdapter(credentials);
            Drive drive = new Drive.Builder(
                    GoogleNetHttpTransport.newTrustedTransport(),
                    GsonFactory.getDefaultInstance(),
                    initializer)
                    .setApplicationName(driveProperties.getApplicationName())
                    .build();
            log.info("Google Drive client initialized (rootFolderId={})", driveProperties.getRootFolderId());
            return drive;
        } catch (Exception e) {
            log.error("Failed to initialize Google Drive client; import inactive", e);
            return null;
        }
    }

    private boolean isBlank(String s) {
        return s == null || s.isBlank();
    }
}
