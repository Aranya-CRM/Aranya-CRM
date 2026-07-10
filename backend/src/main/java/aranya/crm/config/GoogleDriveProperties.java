package aranya.crm.config;

import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

/**
 * Google Drive 导入配置(一次性历史文件迁移)。
 * OAuth 凭据复用 {@link GoogleCalendarProperties}(同一 infotech 账号),
 * 该账号的 refresh token 需同时含 drive.readonly scope。
 * - enabled: 总开关;false 或凭证缺失时 Drive 客户端为 null,导入功能优雅降级。
 * - rootFolderId: 浏览起点文件夹 id(留空则用 "root")。
 */
@Component
@ConfigurationProperties(prefix = "google.drive")
public class GoogleDriveProperties {

    private boolean enabled = false;
    private String rootFolderId;
    private String applicationName = "Aranya CRM";

    public boolean isEnabled() {
        return enabled;
    }

    public void setEnabled(boolean enabled) {
        this.enabled = enabled;
    }

    public String getRootFolderId() {
        return rootFolderId == null || rootFolderId.isBlank() ? "root" : rootFolderId.trim();
    }

    public void setRootFolderId(String rootFolderId) {
        this.rootFolderId = rootFolderId;
    }

    public String getApplicationName() {
        return applicationName;
    }

    public void setApplicationName(String applicationName) {
        this.applicationName = applicationName;
    }
}
