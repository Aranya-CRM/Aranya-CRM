package aranya.crm.service;

import aranya.crm.config.AppProperties;
import aranya.crm.entity.User;
import com.google.firebase.auth.FirebaseAuth;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.mockito.MockedStatic;
import org.mockito.Mockito;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.ArgumentMatchers.isNull;
import static org.mockito.Mockito.doReturn;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class InviteEmailServiceTest {

    private static final String LINK = "https://aranyacrm.page.link/reset?oobCode=abc123";

    private static User invitedUser() {
        User user = new User();
        user.setId(1L);
        user.setEmail("new.user@test.com");
        user.setFullName("New User");
        return user;
    }

    @Test
    @DisplayName("setup email content is bilingual and contains the setup link")
    void buildSetupEmailContent_isBilingualWithLink() {
        GmailEmailGateway.EmailContent content =
                InviteEmailService.buildSetupEmailContent("Li Ling", LINK);

        assertThat(content.subject())
                .contains("Set your Aranya CRM password")
                .containsPattern("[\\p{IsHan}]");
        assertThat(content.text())
                .contains("Hello Li Ling")
                .contains("您好,Li Ling")
                .contains(LINK)
                .contains("expires in about 1 hour")
                .contains("请联系管理员重新发送邀请");
        assertThat(content.html())
                .contains("<a href=\"" + LINK + "\"")
                .contains("设置密码");
    }

    @Test
    @DisplayName("setup email html escapes an unsafe name")
    void buildSetupEmailContent_escapesName() {
        GmailEmailGateway.EmailContent content =
                InviteEmailService.buildSetupEmailContent("<script>x</script>", LINK);

        assertThat(content.html())
                .doesNotContain("<script>x</script>")
                .contains("&lt;script&gt;");
    }

    @Test
    @DisplayName("setup email falls back to 'there' for a blank name")
    void buildSetupEmailContent_fallsBackToThereForBlankName() {
        GmailEmailGateway.EmailContent content =
                InviteEmailService.buildSetupEmailContent("  ", LINK);

        assertThat(content.text()).contains("Hello there");
    }

    @Test
    @DisplayName("sendSetupEmail returns true when link generation and Gmail send succeed")
    void sendSetupEmail_returnsTrueOnSuccess() throws Exception {
        GmailEmailGateway gateway = mock(GmailEmailGateway.class);
        AppProperties appProperties = new AppProperties();
        appProperties.setFrontendUrl("http://localhost:5173/");
        InviteEmailService service = new InviteEmailService(gateway, appProperties);
        User user = invitedUser();

        when(gateway.isEnabled()).thenReturn(true);
        try (MockedStatic<FirebaseAuth> firebaseAuthStatic = Mockito.mockStatic(FirebaseAuth.class)) {
            FirebaseAuth auth = mock(FirebaseAuth.class);
            firebaseAuthStatic.when(FirebaseAuth::getInstance).thenReturn(auth);
            doReturn(LINK).when(auth).generatePasswordResetLink(anyString(), any());
            when(gateway.sendEmail(anyString(), anyString(), any(), isNull())).thenReturn("gmail-msg-1");

            assertThat(service.sendSetupEmail(user)).isTrue();
            verify(gateway).sendEmail(eq("new.user@test.com"), eq("New User"), any(), isNull());
        }
    }

    @Test
    @DisplayName("sendSetupEmail returns false and never throws when Gmail is off, Firebase is down or Gmail send fails")
    void sendSetupEmail_neverThrows() throws Exception {
        GmailEmailGateway gateway = mock(GmailEmailGateway.class);
        AppProperties appProperties = new AppProperties();
        appProperties.setFrontendUrl("http://localhost:5173");
        InviteEmailService service = new InviteEmailService(gateway, appProperties);
        User user = invitedUser();

        when(gateway.isEnabled()).thenReturn(false);
        assertThat(service.sendSetupEmail(user)).isFalse();

        when(gateway.isEnabled()).thenReturn(true);
        try (MockedStatic<FirebaseAuth> firebaseAuthStatic = Mockito.mockStatic(FirebaseAuth.class)) {
            FirebaseAuth auth = mock(FirebaseAuth.class);
            firebaseAuthStatic.when(FirebaseAuth::getInstance).thenReturn(auth);

            doThrow(new RuntimeException("firebase down")).when(auth).generatePasswordResetLink(anyString(), any());
            assertThat(service.sendSetupEmail(user)).isFalse();

            doReturn(LINK).when(auth).generatePasswordResetLink(anyString(), any());
            doThrow(new RuntimeException("gmail down")).when(gateway).sendEmail(anyString(), anyString(), any(), any());
            assertThat(service.sendSetupEmail(user)).isFalse();
        }
    }
}
