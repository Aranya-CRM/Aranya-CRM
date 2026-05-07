package aranya.crm.config;


import com.google.auth.oauth2.GoogleCredentials;
import com.google.firebase.FirebaseApp;
import com.google.firebase.FirebaseOptions;
import jakarta.annotation.PostConstruct;
import lombok.RequiredArgsConstructor;
import lombok.Value;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.io.Resource;
import org.springframework.core.io.ResourceLoader;

import java.io.IOException;
import java.io.InputStream;

@Slf4j
@Configuration
@RequiredArgsConstructor
public class FirebaseConfig{
    private final FirebaseProperties firebaseProperties;
    private final ResourceLoader resourceLoader;

    @PostConstruct
    public void initialize(){
        if(!FirebaseApp.getApps().isEmpty()){
            log.info("Firebase Admin SDK already initialized, skipping");
            return;
        }

        Resource serviceAccount = resourceLoader.getResource(
                firebaseProperties.getServiceAccountPath()
        );

        if(!serviceAccount.exists()) {
            throw new IllegalArgumentException(
                    "Firebase service account file not found: "+firebaseProperties.getServiceAccountPath()
            );
        }

        try (InputStream inputStream = serviceAccount.getInputStream()){
            FirebaseOptions options = FirebaseOptions.builder()
                    .setCredentials(GoogleCredentials.fromStream(inputStream))
                    .setProjectId(firebaseProperties.getProjectId())
                    .build();

            FirebaseApp.initializeApp(options);
            log.info("Firebase Admin SDK initialized for project: {}",firebaseProperties.getProjectId());
        }catch (IOException e){
            log.error("Failed to initialize Firebase Admin SDK", e);
             throw new IllegalStateException(
                     "Failed to initialize Firebase Admin SDK,check account file "+firebaseProperties.getServiceAccountPath(), e
             );
        }
    }

}
