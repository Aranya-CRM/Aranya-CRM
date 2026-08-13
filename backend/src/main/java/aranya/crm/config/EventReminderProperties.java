package aranya.crm.config;

import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

@Component
@ConfigurationProperties(prefix = "app.event-reminders")
public class EventReminderProperties {

    private boolean enabled = true;
    private int graceHours = 0;
    private int maxEmailAttempts = 3;

    public boolean isEnabled() {
        return enabled;
    }

    public void setEnabled(boolean enabled) {
        this.enabled = enabled;
    }

    public int getGraceHours() {
        return graceHours;
    }

    public void setGraceHours(int graceHours) {
        this.graceHours = graceHours;
    }

    public int getMaxEmailAttempts() {
        return maxEmailAttempts;
    }

    public void setMaxEmailAttempts(int maxEmailAttempts) {
        this.maxEmailAttempts = maxEmailAttempts;
    }

}
