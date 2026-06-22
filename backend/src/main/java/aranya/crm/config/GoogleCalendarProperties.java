package aranya.crm.config;

import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

/**
 * Google Calendar 集成配置。
 * - enabled: 总开关;为 false 时所有同步/读取都跳过(凭证缺失的本地环境用)
 * - serviceAccountPath: Service Account JSON 资源路径(同 Firebase 凭证处理方式)
 * - calendarId: 目标共享日历 ID(主日历通常即账号邮箱)
 * - applicationName: 调用 Google API 时上报的应用名
 */
@Component
@ConfigurationProperties(prefix = "google.calendar")
public class GoogleCalendarProperties {
    private boolean enabled = false;
    private String serviceAccountPath;
    private String calendarId;
    private String applicationName = "Aranya CRM";
    /**
     * 域级委派(DWD)要模拟的 Workspace 用户邮箱。
     * - 留空:SA 直连(需把日历共享给 SA 邮箱,路线1)
     * - 填写(如 infotech@aranya.sg):SA 模拟该用户(需管理员授权 DWD,路线2),无需对外共享日历
     */
    private String impersonatedUser;
    /** 写入/读取事件使用的时区(aranya.sg → 新加坡) */
    private String timeZone = "Asia/Singapore";
    /** Case 事件在 Google 日历的颜色 colorId(3 = Grape 紫,见配色规范第六节) */
    private String eventColorId = "3";
    /** 无明确结束时间的事件默认时长(分钟) */
    private int defaultDurationMinutes = 60;

    public boolean isEnabled() {
        return enabled;
    }

    public void setEnabled(boolean enabled) {
        this.enabled = enabled;
    }

    public String getServiceAccountPath() {
        return serviceAccountPath;
    }

    public void setServiceAccountPath(String serviceAccountPath) {
        this.serviceAccountPath = serviceAccountPath;
    }

    public String getCalendarId() {
        return calendarId;
    }

    public void setCalendarId(String calendarId) {
        this.calendarId = calendarId;
    }

    public String getApplicationName() {
        return applicationName;
    }

    public void setApplicationName(String applicationName) {
        this.applicationName = applicationName;
    }

    public String getTimeZone() {
        return timeZone;
    }

    public void setTimeZone(String timeZone) {
        this.timeZone = timeZone;
    }

    public String getEventColorId() {
        return eventColorId;
    }

    public void setEventColorId(String eventColorId) {
        this.eventColorId = eventColorId;
    }

    public int getDefaultDurationMinutes() {
        return defaultDurationMinutes;
    }

    public void setDefaultDurationMinutes(int defaultDurationMinutes) {
        this.defaultDurationMinutes = defaultDurationMinutes;
    }

    public String getImpersonatedUser() {
        return impersonatedUser;
    }

    public void setImpersonatedUser(String impersonatedUser) {
        this.impersonatedUser = impersonatedUser;
    }
}
