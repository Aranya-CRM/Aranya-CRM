package aranya.crm.config;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.boot.env.YamlPropertySourceLoader;
import org.springframework.core.env.PropertySource;
import org.springframework.core.io.ClassPathResource;

import java.io.IOException;

import static org.assertj.core.api.Assertions.assertThat;

class ApplicationYamlTest {

    @Test
    @DisplayName("application.yml raises Spring multipart limits for case file uploads")
    void applicationYaml_raisesSpringMultipartLimitsForCaseFileUploads() throws IOException {
        PropertySource<?> source = new YamlPropertySourceLoader()
                .load("application", new ClassPathResource("application.yml"))
                .get(0);

        assertThat(source.getProperty("spring.servlet.multipart.max-file-size"))
                .isEqualTo("${SPRING_SERVLET_MULTIPART_MAX_FILE_SIZE:25MB}");
        assertThat(source.getProperty("spring.servlet.multipart.max-request-size"))
                .isEqualTo("${SPRING_SERVLET_MULTIPART_MAX_REQUEST_SIZE:25MB}");
    }
}
