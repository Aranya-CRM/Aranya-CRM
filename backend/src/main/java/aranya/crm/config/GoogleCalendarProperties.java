package aranya.crm.config;

import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.List;

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
    /** 认证方式:SERVICE_ACCOUNT(默认)或 OAUTH(后端持有单一账号的 refresh token) */
    private String authMode = "SERVICE_ACCOUNT";
    private String serviceAccountPath;
    private String calendarId; // 单日历(向后兼容);多日历时用 list
    /** 多日历配置:"id1|名称1;id2|名称2"(用 ; 分隔条目,| 分隔 id 与显示名) */
    private String list;
    /** 默认写入日历 id(留空则取 list 第一项 / calendarId) */
    private String defaultId;
    private String applicationName = "Aranya CRM";

    // ── OAuth 模式(单一账号,如 infotech@aranya.sg) ──
    private String oauthClientId;
    private String oauthClientSecret;
    private String oauthRefreshToken;
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

    public String getAuthMode() {
        return authMode;
    }

    public void setAuthMode(String authMode) {
        this.authMode = authMode;
    }

    public String getOauthClientId() {
        return oauthClientId;
    }

    public void setOauthClientId(String oauthClientId) {
        this.oauthClientId = oauthClientId;
    }

    public String getOauthClientSecret() {
        return oauthClientSecret;
    }

    public void setOauthClientSecret(String oauthClientSecret) {
        this.oauthClientSecret = oauthClientSecret;
    }

    public String getOauthRefreshToken() {
        return oauthRefreshToken;
    }

    public void setOauthRefreshToken(String oauthRefreshToken) {
        this.oauthRefreshToken = oauthRefreshToken;
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

    public String getList() {
        return list;
    }

    public void setList(String list) {
        this.list = list;
    }

    public String getDefaultId() {
        return defaultId;
    }

    public void setDefaultId(String defaultId) {
        this.defaultId = defaultId;
    }

    /** 解析出所有可读写日历;list 为空时回退到单个 calendarId。 */
    public List<CalendarOption> resolveCalendars() {
        List<CalendarOption> out = new ArrayList<>();
        if (list != null && !list.isBlank()) {
            for (String entry : list.split(";")) {
                String e = entry.trim();
                if (e.isEmpty()) continue;
                String[] parts = e.split("\\|", 2);
                String id = parts[0].trim();
                if (id.isEmpty()) continue;
                String name = parts.length > 1 && !parts[1].isBlank() ? parts[1].trim() : id;
                out.add(new CalendarOption(id, name, defaultId != null && id.equals(defaultId.trim())));
            }
        } else if (calendarId != null && !calendarId.isBlank()) {
            out.add(new CalendarOption(calendarId.trim(), calendarId.trim(), true));
        }
        // 确保恰有一个默认项
        if (!out.isEmpty() && out.stream().noneMatch(CalendarOption::isDefault)) {
            CalendarOption first = out.get(0);
            out.set(0, new CalendarOption(first.id(), first.name(), true));
        }
        return out;
    }

    public String resolveDefaultCalendarId() {
        return resolveCalendars().stream()
                .filter(CalendarOption::isDefault)
                .map(CalendarOption::id)
                .findFirst()
                .orElse(calendarId);
    }

    public boolean isKnownCalendar(String id) {
        if (id == null) return false;
        return resolveCalendars().stream().anyMatch(c -> c.id().equals(id));
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
