package aranya.crm.service;

import aranya.crm.config.GoogleGmailProperties;
import aranya.crm.entity.Client;
import aranya.crm.entity.ClientCase;
import aranya.crm.entity.ServiceAppointment;
import aranya.crm.entity.ServiceType;
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

    public boolean isEnabled() {
        return gmailProperties.isEnabled() && gmailProvider.getIfAvailable() != null;
    }

    public String sendOverdueEmail(
            ServiceAppointment event,
            User recipient,
            LocalDateTime deadline
    ) throws Exception {
        Gmail gmail = gmailProvider.getIfAvailable();
        if (gmail == null) {
            throw new IllegalStateException("Gmail API client is not configured");
        }

        EmailContent content = buildEmailContent(event, recipient, deadline);
        MimeMessage mimeMessage = createMimeMessage(
                event.getId(),
                recipient,
                content.subject(),
                content.text(),
                content.html()
        );
        ByteArrayOutputStream output = new ByteArrayOutputStream();
        mimeMessage.writeTo(output);

        Message request = new Message().setRaw(
                Base64.getUrlEncoder().withoutPadding().encodeToString(output.toByteArray())
        );
        Message sent = gmail.users().messages().send("me", request).execute();
        return sent.getId();
    }

    static EmailContent buildEmailContent(
            ServiceAppointment event,
            User recipient,
            LocalDateTime deadline
    ) {
        String eventTitle = eventTitle(event);
        String recipientName = valueOrFallback(recipient.getFullName(), "there");
        String caseDetails = caseDetails(event.getClientCase());
        String serviceName = event.getServiceType() == null
                ? null
                : event.getServiceType().getName();
        String eventLocation = firstNonBlank(event.getAddress(), event.getLocation());

        StringBuilder text = new StringBuilder()
                .append("Hello ").append(recipientName).append(",\n\n")
                .append("This is a reminder that the report for the following event is overdue.\n\n")
                .append("Event: ").append(eventTitle).append('\n');
        appendTextDetail(text, "Case", caseDetails);
        appendTextDetail(text, "Service", serviceName);
        appendTextDetail(text, "Scheduled start", formatDateTime(event.getScheduledStart()));
        appendTextDetail(text, "Scheduled end", formatDateTime(event.getScheduledEnd()));
        appendTextDetail(text, "Report deadline", formatDateTime(deadline));
        appendTextDetail(text, "Location", eventLocation);
        appendTextDetail(text, "Agenda", event.getAgenda());
        appendTextDetail(text, "Work description", event.getWorkDescription());
        text.append("\nPlease submit the event report as soon as possible.")
                .append("\n\nThis is an automated reminder from Aranya CRM.");

        StringBuilder details = new StringBuilder();
        appendHtmlDetail(details, "Event", eventTitle);
        appendHtmlDetail(details, "Case", caseDetails);
        appendHtmlDetail(details, "Service", serviceName);
        appendHtmlDetail(details, "Scheduled start", formatDateTime(event.getScheduledStart()));
        appendHtmlDetail(details, "Scheduled end", formatDateTime(event.getScheduledEnd()));
        appendHtmlDetail(details, "Report deadline", formatDateTime(deadline));
        appendHtmlDetail(details, "Location", eventLocation);
        appendHtmlDetail(details, "Agenda", event.getAgenda());
        appendHtmlDetail(details, "Work description", event.getWorkDescription());

        String html = "<p>Hello " + html(recipientName) + ",</p>"
                + "<p>This is a reminder that the report for the following event is overdue.</p>"
                + "<table role=\"presentation\" style=\"border-collapse:collapse\">"
                + details
                + "</table>"
                + "<p>Please submit the event report as soon as possible.</p>"
                + "<p>This is an automated reminder from Aranya CRM.</p>";

        return new EmailContent(
                "Overdue event report: " + eventTitle,
                text.toString(),
                html
        );
    }

    private static String eventTitle(ServiceAppointment event) {
        ServiceType serviceType = event.getServiceType();
        String serviceName = serviceType == null
                ? "Service event"
                : valueOrFallback(serviceType.getName(), "Service event");

        ClientCase clientCase = event.getClientCase();
        Client client = clientCase == null ? null : clientCase.getClient();
        String clientAbbr = client == null ? null : client.getAbbr();

        StringBuilder title = new StringBuilder();
        if (event.getEventSeq() != null) {
            title.append(String.format("%03d", event.getEventSeq())).append(' ');
        }
        title.append(serviceName);
        if (clientAbbr != null && !clientAbbr.isBlank()) {
            title.append(": ").append(clientAbbr.trim());
        }
        if (event.getLocation() != null && !event.getLocation().isBlank()) {
            title.append(" @ ").append(event.getLocation().trim());
        }
        return title.toString();
    }

    private static String caseDetails(ClientCase clientCase) {
        if (clientCase == null) return null;
        String caseCode = normalize(clientCase.getCaseCode());
        String caseTitle = normalize(clientCase.getTitle());
        if (caseCode == null) return caseTitle;
        if (caseTitle == null) return caseCode;
        return caseCode + " - " + caseTitle;
    }

    private static void appendTextDetail(StringBuilder text, String label, String value) {
        String normalized = normalize(value);
        if (normalized != null) {
            text.append(label).append(": ").append(normalized).append('\n');
        }
    }

    private static void appendHtmlDetail(StringBuilder html, String label, String value) {
        String normalized = normalize(value);
        if (normalized != null) {
            html.append("<tr><td style=\"padding:4px 16px 4px 0;vertical-align:top\"><strong>")
                    .append(HtmlUtils.htmlEscape(label))
                    .append("</strong></td><td style=\"padding:4px 0;white-space:pre-wrap\">")
                    .append(html(normalized))
                    .append("</td></tr>");
        }
    }

    private static String formatDateTime(LocalDateTime value) {
        return value == null ? null : value.format(DEADLINE_FORMAT) + " (Asia/Singapore)";
    }

    private static String firstNonBlank(String first, String second) {
        String normalized = normalize(first);
        return normalized != null ? normalized : normalize(second);
    }

    private static String valueOrFallback(String value, String fallback) {
        String normalized = normalize(value);
        return normalized != null ? normalized : fallback;
    }

    private static String normalize(String value) {
        if (value == null || value.isBlank()) return null;
        return value.trim().replace("\r\n", "\n").replace('\r', '\n');
    }

    private static String html(String value) {
        return HtmlUtils.htmlEscape(value).replace("\n", "<br>");
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

    record EmailContent(String subject, String text, String html) {}
}
