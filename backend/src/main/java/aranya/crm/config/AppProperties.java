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

    /** 前端对外地址:邀请邮件中 Firebase 设置密码链接的跳转目标(continueUrl = 该地址 + /login)。 */
    private String frontendUrl;

    @Data
    public static class CorsProperties {
        private List<String> allowedOrigins;
    }

}
