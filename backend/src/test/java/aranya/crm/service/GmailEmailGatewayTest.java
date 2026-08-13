package aranya.crm.service;

import aranya.crm.entity.Client;
import aranya.crm.entity.ClientCase;
import aranya.crm.entity.ServiceAppointment;
import aranya.crm.entity.ServiceType;
import aranya.crm.entity.User;
import org.junit.jupiter.api.Test;

import java.time.LocalDateTime;

import static org.assertj.core.api.Assertions.assertThat;

class GmailEmailGatewayTest {

    @Test
    void buildsEnglishLinkFreeEmailWithTheActualEventTitleAndUsefulDetails() {
        Client client = new Client();
        client.setAbbr("VKZhi");

        ClientCase clientCase = new ClientCase();
        clientCase.setCaseCode("CASE-2026-015");
        clientCase.setTitle("Home support");
        clientCase.setClient(client);

        ServiceType serviceType = new ServiceType();
        serviceType.setName("Medical Appointment");

        ServiceAppointment event = new ServiceAppointment();
        event.setId(15L);
        event.setEventSeq(72L);
        event.setClientCase(clientCase);
        event.setServiceType(serviceType);
        event.setLocation("TTSH");
        event.setAddress("11 Jalan Tan Tock Seng, Singapore");
        event.setScheduledStart(LocalDateTime.of(2026, 7, 21, 9, 0));
        event.setScheduledEnd(LocalDateTime.of(2026, 7, 21, 11, 0));
        event.setAgenda("Attend the specialist consultation");
        event.setWorkDescription("Provide transport and appointment support");

        User recipient = new User();
        recipient.setFullName("Kong Yikai");
        recipient.setPreferredLanguage("zh");

        GmailEmailGateway.EmailContent content = GmailEmailGateway.buildEmailContent(
                event,
                recipient,
                LocalDateTime.of(2026, 7, 22, 17, 30)
        );

        assertThat(content.subject())
                .isEqualTo("Overdue event report: 072 Medical Appointment: VKZhi @ TTSH")
                .doesNotContainPattern("[\\p{IsHan}]");
        assertThat(content.text())
                .contains("Hello Kong Yikai")
                .contains("This is a reminder that the report for the following event is overdue.")
                .contains("Event: 072 Medical Appointment: VKZhi @ TTSH")
                .contains("Case: CASE-2026-015 - Home support")
                .contains("Scheduled start: 2026-07-21 09:00 (Asia/Singapore)")
                .contains("Scheduled end: 2026-07-21 11:00 (Asia/Singapore)")
                .contains("Report deadline: 2026-07-22 17:30 (Asia/Singapore)")
                .contains("Location: 11 Jalan Tan Tock Seng, Singapore")
                .contains("Agenda: Attend the specialist consultation")
                .contains("Work description: Provide transport and appointment support")
                .doesNotContain("#15", "http://", "https://")
                .doesNotContainPattern("[\\p{IsHan}]");
        assertThat(content.html())
                .contains("072 Medical Appointment: VKZhi @ TTSH")
                .contains("Please submit the event report as soon as possible.")
                .doesNotContain("<a", "href=", "http://", "https://")
                .doesNotContainPattern("[\\p{IsHan}]");
    }
}
