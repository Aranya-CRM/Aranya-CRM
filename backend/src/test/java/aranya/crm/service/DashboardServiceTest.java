package aranya.crm.service;

import aranya.crm.dto.response.DashboardResponse;
import aranya.crm.entity.Client;
import aranya.crm.entity.ClientCase;
import aranya.crm.entity.Role;
import aranya.crm.entity.User;
import aranya.crm.entity.UserRole;
import aranya.crm.entity.VisitReport;
import aranya.crm.repository.ClientRepository;
import aranya.crm.repository.VisitReportRepository;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.PageRequest;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class DashboardServiceTest {

    @Mock
    private ClientRepository clientRepository;

    @Mock
    private CaseService caseService;

    @Mock
    private VisitReportRepository visitReportRepository;

    @InjectMocks
    private DashboardService dashboardService;

    @Test
    @DisplayName("Social worker dashboard returns visible dynamic data blocks")
    void getDashboard_returnsSocialWorkerBlocks() {
        User user = userWithRole(7L, "SOCIAL_WORKER");
        Client client = client(12L, "Venerable Hui Ming", "释慧明");
        ClientCase clientCase = new ClientCase();
        clientCase.setId(20L);
        clientCase.setCaseCode("CASE-2026-001");
        clientCase.setClient(client);
        clientCase.setStatus("OPEN");
        clientCase.setColorCode("RED");
        clientCase.setOpenedAt(LocalDateTime.of(2026, 1, 20, 9, 30));

        when(clientRepository.countByMembershipStatusIgnoreCase("ACTIVE")).thenReturn(3L);
        when(caseService.countActiveCases()).thenReturn(2L);
        when(caseService.countUrgentCases()).thenReturn(1L);
        when(caseService.getActiveCases(5)).thenReturn(List.of(clientCase));
        when(visitReportRepository.findAllByOrderByCreatedAtDescIdDesc(PageRequest.of(0, 5)))
                .thenReturn(List.of());

        DashboardResponse response = dashboardService.getDashboard(authentication(user, "SOCIAL_WORKER"));

        assertThat(response.getSections()).extracting(DashboardResponse.Section::getId)
                .containsExactly("sw.stats", "sw.recent_cases", "sw.recent_reports", "sw.quick_actions");
        DashboardResponse.Section stats = response.getSections().get(0);
        assertThat(stats.getStats()).extracting(DashboardResponse.Stat::getId)
                .containsExactly("activeMonastics", "openCases", "urgentCases", "pendingReports");
        assertThat(stats.getStats()).extracting(DashboardResponse.Stat::getValue)
                .containsExactly("3", "2", "1", "0");
        DashboardResponse.Item recentCase = response.getSections().get(1).getItems().get(0);
        assertThat(recentCase.getId()).isEqualTo("20");
        assertThat(recentCase.getCaseCode()).isEqualTo("CASE-2026-001");
        assertThat(recentCase.getClientId()).isEqualTo("12");
        assertThat(recentCase.getClientNameEn()).isEqualTo("Venerable Hui Ming");
        assertThat(recentCase.getClientNameChn()).isEqualTo("释慧明");
        assertThat(recentCase.getStatusCode()).isEqualTo("OPEN");
        assertThat(recentCase.getColorCode()).isEqualTo("RED");
        assertThat(response.getSections().get(3).getActions()).extracting(DashboardResponse.Action::getId)
                .containsExactly("new_case", "add_client");
    }

    @Test
    @DisplayName("Volunteer dashboard returns only own report data blocks")
    void getDashboard_returnsVolunteerBlocks() {
        User user = userWithRole(9L, "VOLUNTEER");
        Client client = client(15L, "Venerable Sona", "释苏那");
        VisitReport report = new VisitReport();
        report.setId(30L);
        report.setClient(client);
        report.setCreatedBy(user);
        report.setDateOfVisit(LocalDate.of(2026, 5, 1));
        report.setTypeOfVisit("Temple Visit");
        report.setCreatedAt(LocalDateTime.of(2026, 5, 2, 10, 0));

        when(visitReportRepository.countByCreatedById(9L)).thenReturn(1L);
        when(visitReportRepository.findByCreatedByIdOrderByCreatedAtDescIdDesc(9L, PageRequest.of(0, 5)))
                .thenReturn(List.of(report));

        DashboardResponse response = dashboardService.getDashboard(authentication(user, "VOLUNTEER"));

        assertThat(response.getSections()).extracting(DashboardResponse.Section::getId)
                .containsExactly("volunteer.report_stats", "volunteer.my_recent_reports", "volunteer.quick_actions");
        assertThat(response.getSections().get(0).getStats().get(0).getId()).isEqualTo("myReportCount");
        assertThat(response.getSections().get(0).getStats().get(0).getValue()).isEqualTo("1");
        DashboardResponse.Item item = response.getSections().get(1).getItems().get(0);
        assertThat(item.getId()).isEqualTo("30");
        assertThat(item.getClientNameEn()).isEqualTo("Venerable Sona");
        assertThat(item.getReportType()).isEqualTo("Temple Visit");
        assertThat(response.getSections().get(2).getActions()).extracting(DashboardResponse.Action::getId)
                .containsExactly("submit_report");
    }

    @Test
    @DisplayName("Multi-role dashboard merges sections without duplicates")
    void getDashboard_mergesMultiRoleSectionsWithoutDuplicates() {
        User user = userWithRole(11L, "VOLUNTEER", "SOCIAL_WORKER");
        when(visitReportRepository.countByCreatedById(11L)).thenReturn(0L);
        when(visitReportRepository.findByCreatedByIdOrderByCreatedAtDescIdDesc(11L, PageRequest.of(0, 5)))
                .thenReturn(List.of());
        when(clientRepository.countByMembershipStatusIgnoreCase("ACTIVE")).thenReturn(0L);
        when(caseService.countActiveCases()).thenReturn(0L);
        when(caseService.countUrgentCases()).thenReturn(0L);
        when(caseService.getActiveCases(5)).thenReturn(List.of());
        when(visitReportRepository.findAllByOrderByCreatedAtDescIdDesc(PageRequest.of(0, 5)))
                .thenReturn(List.of());

        DashboardResponse response = dashboardService.getDashboard(authentication(user, "VOLUNTEER", "SOCIAL_WORKER"));

        assertThat(response.getSections()).extracting(DashboardResponse.Section::getId)
                .containsExactly(
                        "volunteer.report_stats",
                        "volunteer.my_recent_reports",
                        "volunteer.quick_actions",
                        "sw.stats",
                        "sw.recent_cases",
                        "sw.recent_reports",
                        "sw.quick_actions"
                );
        assertThat(response.getSections()).extracting(DashboardResponse.Section::getId).doesNotHaveDuplicates();
        verify(caseService).getActiveCases(5);
    }

    private static UsernamePasswordAuthenticationToken authentication(User user, String... roles) {
        return new UsernamePasswordAuthenticationToken(
                user,
                null,
                List.of(roles).stream()
                        .map(role -> new SimpleGrantedAuthority("ROLE_" + role))
                        .toList()
        );
    }

    private static User userWithRole(Long id, String... roleNames) {
        User user = new User();
        user.setId(id);
        user.setUsername("user-" + id);
        user.setEmail("user" + id + "@test.com");
        user.setFullName("User " + id);
        user.setStatus("ACTIVE");
        for (String roleName : roleNames) {
            Role role = new Role();
            role.setName(roleName);
            UserRole userRole = new UserRole();
            userRole.setUser(user);
            userRole.setRole(role);
            user.getUserRoles().add(userRole);
        }
        return user;
    }

    private static Client client(Long id, String nameEn, String nameChn) {
        Client client = new Client();
        client.setId(id);
        client.setAbbr("C" + id);
        client.setNameEn(nameEn);
        client.setNameChn(nameChn);
        client.setMembershipStatus("ACTIVE");
        return client;
    }
}
