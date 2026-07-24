package aranya.crm.service;

import aranya.crm.config.EventReminderProperties;
import aranya.crm.config.GoogleGmailProperties;
import aranya.crm.entity.User;
import com.google.api.services.gmail.Gmail;
import com.google.api.services.gmail.model.Message;
import jakarta.mail.Session;
import jakarta.mail.internet.InternetAddress;
import jakarta.mail.internet.MimeBodyPart;
import jakarta.mail.internet.MimeMessage;
import jakarta.mail.internet.MimeMultipart;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.stereotype.Component;
import org.springframework.web.util.HtmlUtils;

import java.io.ByteArrayOutputStream;
import java.nio.charset.StandardCharsets;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.Base64;
import java.util.Properties;

@Component
@RequiredArgsConstructor
public class GmailEmailGateway {

    private static final DateTimeFormatter DEADLINE_FORMAT = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm");

    private final ObjectProvider<Gmail> gmailProvider;
    private final GoogleGmailProperties gmailProperties;
    private final EventReminderProperties reminderProperties;

    public boolean isEnabled() {
        return gmailProperties.isEnabled() && gmailProvider.getIfAvailable() != null;
    }

    public String sendOverdueEmail(Long eventId, User recipient, LocalDateTime deadline) throws Exception {
        Gmail gmail = gmailProvider.getIfAvailable();
        if (gmail == null) {
            throw new IllegalStateException("Gmail API client is not configured");
        }

        boolean zh = "zh".equalsIgnoreCase(recipient.getPreferredLanguage());
        String dueText = deadline.format(DEADLINE_FORMAT) + " (Asia/Singapore)";
        String eventUrl = stripTrailingSlash(reminderProperties.getPublicBaseUrl()) + "/reports/" + eventId;
        String subject = zh ? "事件报告已逾期" : "Event report overdue";
        String text = zh
                ? "事件 #" + eventId + " 的报告已逾期。截止时间：" + dueText
                    + "。请登录 Aranya CRM 处理：" + eventUrl
                : "The report for event #" + eventId + " is overdue. Deadline: " + dueText
                    + ". Sign in to Aranya CRM to complete it: " + eventUrl;
        String html = zh
                ? "<p>事件 <strong>#" + eventId + "</strong> 的报告已逾期。</p>"
                    + "<p>截止时间：" + HtmlUtils.htmlEscape(dueText) + "</p>"
                    + "<p><a href=\"" + HtmlUtils.htmlEscape(eventUrl) + "\">登录 Aranya CRM 处理</a></p>"
                : "<p>The report for event <strong>#" + eventId + "</strong> is overdue.</p>"
                    + "<p>Deadline: " + HtmlUtils.htmlEscape(dueText) + "</p>"
                    + "<p><a href=\"" + HtmlUtils.htmlEscape(eventUrl) + "\">Open Aranya CRM</a></p>";

        MimeMessage mimeMessage = createMimeMessage(eventId, recipient, subject, text, html);
        ByteArrayOutputStream output = new ByteArrayOutputStream();
        mimeMessage.writeTo(output);

        Message request = new Message().setRaw(
                Base64.getUrlEncoder().withoutPadding().encodeToString(output.toByteArray())
        );
        Message sent = gmail.users().messages().send("me", request).execute();
        return sent.getId();
    }

    private MimeMessage createMimeMessage(
            Long eventId,
            User recipient,
            String subject,
            String text,
            String html
    ) throws Exception {
        MimeMessage message = new MimeMessage(Session.getInstance(new Properties()));
        message.setFrom(new InternetAddress(
                gmailProperties.getFromAddress(),
                gmailProperties.getFromName(),
                StandardCharsets.UTF_8.name()
        ));
        message.addRecipient(
                jakarta.mail.Message.RecipientType.TO,
                new InternetAddress(recipient.getEmail())
        );
        message.setSubject(subject, StandardCharsets.UTF_8.name());
        message.setHeader("Auto-Submitted", "auto-generated");
        message.setHeader("X-Auto-Response-Suppress", "All");

        MimeBodyPart textPart = new MimeBodyPart();
        textPart.setText(text, StandardCharsets.UTF_8.name());
        MimeBodyPart htmlPart = new MimeBodyPart();
        htmlPart.setContent(html, "text/html; charset=UTF-8");
        MimeMultipart alternatives = new MimeMultipart("alternative");
        alternatives.addBodyPart(textPart);
        alternatives.addBodyPart(htmlPart);
        message.setContent(alternatives);
        message.saveChanges();
        message.setHeader("Message-ID", deterministicMessageId(eventId, recipient.getId()));
        return message;
    }

    private String deterministicMessageId(Long eventId, Long recipientId) {
        String from = gmailProperties.getFromAddress();
        int at = from == null ? -1 : from.lastIndexOf('@');
        String domain = at >= 0 ? from.substring(at + 1) : "aranya.invalid";
        return "<event-" + eventId + "-overdue-user-" + recipientId + "@" + domain + ">";
    }

    private String stripTrailingSlash(String value) {
        if (value == null || value.isBlank()) return "http://localhost:5173";
        return value.endsWith("/") ? value.substring(0, value.length() - 1) : value;
    }
}
