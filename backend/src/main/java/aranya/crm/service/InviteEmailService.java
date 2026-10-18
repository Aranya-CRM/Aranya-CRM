package aranya.crm.service;

import aranya.crm.config.AppProperties;
import aranya.crm.entity.User;
import com.google.firebase.auth.ActionCodeSettings;
import com.google.firebase.auth.FirebaseAuth;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.web.util.HtmlUtils;

/**
 * 邀请设置密码邮件:Firebase generatePasswordResetLink + 双语(EN/中文)正文,经 {@link GmailEmailGateway} 发送。
 * 邮件失败绝不影响邀请/重发结果 —— 一切异常只记日志,返回 false。
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class InviteEmailService {

    private final GmailEmailGateway emailGateway;
    private final AppProperties appProperties;

    /** 发送首次设置密码邮件;成功返回 true。Gmail 未启用时跳过(无独立开关,随 google.gmail.enabled)。 */
    public boolean sendSetupEmail(User user) {
        if (!emailGateway.isEnabled()) {
            log.info("Gmail disabled; skipping setup email for {}", user.getEmail());
            return false;
        }
        try {
            String link = generateSetupLink(user.getEmail());
            GmailEmailGateway.EmailContent content = buildSetupEmailContent(user.getFullName(), link);
            String gmailMessageId = emailGateway.sendEmail(user.getEmail(), user.getFullName(), content, null);
            log.info("Sent invite setup email to {} (gmail message {})", user.getEmail(), gmailMessageId);
            return true;
        } catch (Exception e) {
            log.error("Invite setup email failed for {}: {}", user.getEmail(), e.getMessage());
            return false;
        }
    }

    /**
     * Firebase 一次性设置密码链接(约 1 小时有效)。
     * handleCodeInApp=false:前端没有 oobCode 处理逻辑,改由 Firebase 托管页收集新密码,完成后跳转 /login。
     */
    private String generateSetupLink(String email) throws Exception {
        String base = appProperties.getFrontendUrl() == null ? "" : appProperties.getFrontendUrl().trim().replaceAll("/+$", "");
        ActionCodeSettings settings = ActionCodeSettings.builder()
                .setUrl(base + "/login")
                .setHandleCodeInApp(false)
                .build();
        return FirebaseAuth.getInstance().generatePasswordResetLink(email, settings);
    }

    static GmailEmailGateway.EmailContent buildSetupEmailContent(String name, String setupLink) {
        String greeting = name == null || name.isBlank() ? "there" : name.trim();

        String text = "Hello " + greeting + ",\n\n"
                + "You have been invited to Aranya CRM. Please set your password to activate your account:\n\n"
                + setupLink + "\n\n"
                + "The link expires in about 1 hour. If it has expired, ask your administrator to resend the invitation.\n\n"
                + "您好," + greeting + ":\n\n"
                + "您已被邀请加入 Aranya CRM。请访问以下链接设置密码以激活账号:\n\n"
                + setupLink + "\n\n"
                + "链接约 1 小时后失效;如已过期,请联系管理员重新发送邀请。\n\n"
                + "This is an automated email from Aranya CRM.";

        String safeLink = HtmlUtils.htmlEscape(setupLink);
        String html = "<p>Hello " + HtmlUtils.htmlEscape(greeting) + ",</p>"
                + "<p>You have been invited to Aranya CRM. Please set your password to activate your account:</p>"
                + "<p><a href=\"" + safeLink + "\">Set my password / 设置密码</a></p>"
                + "<p>The link expires in about 1 hour. If it has expired, ask your administrator to resend the invitation.</p>"
                + "<hr>"
                + "<p>您好,您已被邀请加入 Aranya CRM。请访问以下链接设置密码以激活账号:</p>"
                + "<p><a href=\"" + safeLink + "\">设置密码 / Set my password</a></p>"
                + "<p>链接约 1 小时后失效;如已过期,请联系管理员重新发送邀请。</p>"
                + "<p>This is an automated email from Aranya CRM.</p>";

        return new GmailEmailGateway.EmailContent(
                "Set your Aranya CRM password | 设置您的 Aranya CRM 密码",
                text,
                html
        );
    }
}
