package aranya.crm.service;

import aranya.crm.dto.request.CreateReportRequest;
import aranya.crm.dto.response.ReportDetailResponse;
import aranya.crm.dto.response.ReportSummaryResponse;
import aranya.crm.entity.CaseNote;
import aranya.crm.entity.Client;
import aranya.crm.entity.ClientCase;
import aranya.crm.entity.User;
import aranya.crm.entity.VisitReport;
import aranya.crm.repository.CaseNoteRepository;
import aranya.crm.repository.CaseRepository;
import aranya.crm.repository.ClientRepository;
import aranya.crm.repository.VisitReportRepository;
import jakarta.persistence.EntityNotFoundException;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class ReportServiceTest {

    @Mock
    private ClientRepository clientRepository;

    @Mock
    private VisitReportRepository visitReportRepository;

    @Mock
    private CaseRepository caseRepository;

    @Mock
    private CaseNoteRepository caseNoteRepository;

    @Mock
    private OperationAuditLogService operationAuditLogService;

    @InjectMocks
    private ReportService reportService;

    @Test
    @DisplayName("listReports maps visit reports to summaries")
    void listReports_mapsVisitReportsToSummaries() {
        Client client = client(5L, "Venerable Dev Test", "测试法师");
        User creator = user(9L, "YiKai Kong");
        VisitReport report = report(1L, client, creator);
        when(visitReportRepository.findAllByOrderByCreatedAtDescIdDesc()).thenReturn(List.of(report));

        List<ReportSummaryResponse> response = reportService.listReports();

        assertThat(response).hasSize(1);
        assertThat(response.get(0).getId()).isEqualTo(1L);
        assertThat(response.get(0).getClientId()).isEqualTo(5L);
        assertThat(response.get(0).getClientNameEn()).isEqualTo("Venerable Dev Test");
        assertThat(response.get(0).getClientNameChn()).isEqualTo("测试法师");
        assertThat(response.get(0).getCreatedById()).isEqualTo(9L);
        assertThat(response.get(0).getCreatedByName()).isEqualTo("YiKai Kong");
        assertThat(response.get(0).getTypeOfVisit()).isEqualTo("Home Visit");
    }

    @Test
    @DisplayName("getReportDetail returns full report body")
    void getReportDetail_returnsFullReportBody() {
        VisitReport report = report(1L, client(5L, "Venerable Dev Test", "测试法师"), user(9L, "YiKai Kong"));
        report.setPurposeOfVisit("Follow up");
        report.setWhatWasDone("Completed welfare check");
        report.setEnvironmentObservations("Stable environment");
        report.setSanghaObservations("Calm");
        report.setOtherObservations("No extra concerns");
        report.setPersonalReflections("Support remains appropriate");
        report.setRecommendations("Follow up next month");
        report.setMattersToHighlight("Confirm medical transport");
        when(visitReportRepository.findById(1L)).thenReturn(Optional.of(report));

        ReportDetailResponse response = reportService.getReportDetail(1L);

        assertThat(response.getId()).isEqualTo(1L);
        assertThat(response.getPurposeOfVisit()).isEqualTo("Follow up");
        assertThat(response.getWhatWasDone()).isEqualTo("Completed welfare check");
        assertThat(response.getEnvironmentObservations()).isEqualTo("Stable environment");
        assertThat(response.getSanghaObservations()).isEqualTo("Calm");
        assertThat(response.getOtherObservations()).isEqualTo("No extra concerns");
        assertThat(response.getPersonalReflections()).isEqualTo("Support remains appropriate");
        assertThat(response.getRecommendations()).isEqualTo("Follow up next month");
        assertThat(response.getMattersToHighlight()).isEqualTo("Confirm medical transport");
    }

    @Test
    @DisplayName("getReportDetail throws when report does not exist")
    void getReportDetail_throwsWhenReportDoesNotExist() {
        when(visitReportRepository.findById(404L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> reportService.getReportDetail(404L))
                .isInstanceOf(EntityNotFoundException.class)
                .hasMessage("Report not found: 404");
    }

    @Test
    @DisplayName("createReport maps request and current user into visit report")
    void createReport_mapsRequestAndCurrentUserIntoVisitReport() {
        Client client = client(5L, "Venerable Dev Test", "测试法师");
        User creator = user(9L, "YiKai Kong");
        CreateReportRequest request = createRequest();

        when(clientRepository.findById(5L)).thenReturn(Optional.of(client));
        when(caseRepository.findFirstByClientIdOrderByOpenedAtDescIdDesc(5L)).thenReturn(Optional.empty());
        when(visitReportRepository.save(any(VisitReport.class))).thenAnswer(invocation -> {
            VisitReport saved = invocation.getArgument(0);
            saved.setId(88L);
            saved.setCreatedAt(LocalDateTime.of(2026, 5, 20, 10, 30));
            return saved;
        });

        ReportDetailResponse response = reportService.createReport(request, creator);

        ArgumentCaptor<VisitReport> reportCaptor = ArgumentCaptor.forClass(VisitReport.class);
        verify(visitReportRepository).save(reportCaptor.capture());
        VisitReport saved = reportCaptor.getValue();
        assertThat(saved.getClient()).isSameAs(client);
        assertThat(saved.getCreatedBy()).isSameAs(creator);
        assertThat(saved.getStaffName()).isEqualTo("YiKai Kong");
        assertThat(saved.getDateOfVisit()).isEqualTo(LocalDate.of(2026, 5, 20));
        assertThat(saved.getTimeOfVisit()).isEqualTo("10:30 AM");
        assertThat(saved.getDurationOfVisit()).isEqualTo("45 minutes");
        assertThat(saved.getLocation()).isEqualTo("Aranya Temple");
        assertThat(saved.getProgrammeName()).isEqualTo("Monthly Care Visit");
        assertThat(saved.getTypeOfVisit()).isEqualTo("Home Visit");
        assertThat(saved.getPurposeOfVisit()).isEqualTo("Follow up");
        assertThat(saved.getUpdatedAt()).isNotNull();

        assertThat(response.getId()).isEqualTo(88L);
        assertThat(response.getClientId()).isEqualTo(5L);
        assertThat(response.getCreatedById()).isEqualTo(9L);
        assertThat(response.getStaffName()).isEqualTo("YiKai Kong");
        assertThat(response.getStatus()).isEqualTo("SUBMITTED");
    }

    @Test
    @DisplayName("createReport trims text fields and stores blanks as null")
    void createReport_trimsTextFieldsAndStoresBlanksAsNull() {
        Client client = client(5L, "Venerable Dev Test", "测试法师");
        User creator = user(9L, "YiKai Kong");
        CreateReportRequest request = new CreateReportRequest();
        request.setClientId(5L);
        request.setDateOfVisit(LocalDate.of(2026, 5, 20));
        request.setStaffName("  Volunteer Lee  ");
        request.setLocation("   ");
        request.setTypeOfVisit("  Temple Visit  ");

        when(clientRepository.findById(5L)).thenReturn(Optional.of(client));
        when(caseRepository.findFirstByClientIdOrderByOpenedAtDescIdDesc(5L)).thenReturn(Optional.empty());
        when(visitReportRepository.save(any(VisitReport.class))).thenAnswer(invocation -> invocation.getArgument(0));

        reportService.createReport(request, creator);

        ArgumentCaptor<VisitReport> reportCaptor = ArgumentCaptor.forClass(VisitReport.class);
        verify(visitReportRepository).save(reportCaptor.capture());
        VisitReport saved = reportCaptor.getValue();
        assertThat(saved.getStaffName()).isEqualTo("Volunteer Lee");
        assertThat(saved.getLocation()).isNull();
        assertThat(saved.getTypeOfVisit()).isEqualTo("Temple Visit");
    }

    @Test
    @DisplayName("createReport creates a case note when the member has a case")
    void createReport_createsCaseNoteWhenMemberHasCase() {
        Client client = client(5L, "Venerable Dev Test", "测试法师");
        ClientCase clientCase = clientCase(12L, client, "CASE-2026-012");
        User creator = user(9L, "Volunteer User");
        CreateReportRequest request = createRequest();

        when(clientRepository.findById(5L)).thenReturn(Optional.of(client));
        when(caseRepository.findFirstByClientIdOrderByOpenedAtDescIdDesc(5L)).thenReturn(Optional.of(clientCase));
        when(visitReportRepository.save(any(VisitReport.class))).thenAnswer(invocation -> {
            VisitReport saved = invocation.getArgument(0);
            saved.setId(88L);
            saved.setCreatedAt(LocalDateTime.of(2026, 5, 20, 10, 30));
            return saved;
        });

        reportService.createReport(request, creator);

        ArgumentCaptor<CaseNote> noteCaptor = ArgumentCaptor.forClass(CaseNote.class);
        verify(caseNoteRepository).save(noteCaptor.capture());
        CaseNote note = noteCaptor.getValue();
        assertThat(note.getClientCase()).isSameAs(clientCase);
        assertThat(note.getCreatedBy()).isSameAs(creator);
        assertThat(note.getNoteType()).isEqualTo("REPORT");
        assertThat(note.getVisibility()).isEqualTo("INTERNAL");
        assertThat(note.getContent()).contains("Monthly Care Visit");
        assertThat(note.getContent()).contains("Completed welfare check");
        assertThat(note.getContent()).contains("Follow up next month");
    }

    @Test
    @DisplayName("createReport saves draft without creating a case note")
    void createReport_savesDraftWithoutCreatingCaseNote() {
        Client client = client(5L, "Venerable Dev Test", "测试法师");
        User creator = user(9L, "Volunteer User");
        CreateReportRequest request = createRequest();
        request.setStatus("DRAFT");

        when(clientRepository.findById(5L)).thenReturn(Optional.of(client));
        when(visitReportRepository.save(any(VisitReport.class))).thenAnswer(invocation -> invocation.getArgument(0));

        ReportDetailResponse response = reportService.createReport(request, creator);

        assertThat(response.getStatus()).isEqualTo("DRAFT");
        verify(caseRepository, never()).findFirstByClientIdOrderByOpenedAtDescIdDesc(any());
        verify(caseNoteRepository, never()).save(any());
    }

    @Test
    @DisplayName("createReport links report to the task case when case id is provided")
    void createReport_linksReportToTaskCaseWhenCaseIdIsProvided() {
        Client selectedClient = client(5L, "Venerable Selected", "选择法师");
        Client taskClient = client(9L, "Venerable Task", "任务法师");
        ClientCase taskCase = clientCase(12L, taskClient, "CASE-2026-012");
        User creator = user(9L, "Volunteer User");
        CreateReportRequest request = createRequest();
        request.setCaseId(12L);
        request.setStatus("DRAFT");

        when(clientRepository.findById(5L)).thenReturn(Optional.of(selectedClient));
        when(caseRepository.findById(12L)).thenReturn(Optional.of(taskCase));
        when(visitReportRepository.save(any(VisitReport.class))).thenAnswer(invocation -> invocation.getArgument(0));

        ReportDetailResponse response = reportService.createReport(request, creator);

        ArgumentCaptor<VisitReport> reportCaptor = ArgumentCaptor.forClass(VisitReport.class);
        verify(visitReportRepository).save(reportCaptor.capture());
        assertThat(reportCaptor.getValue().getClient()).isSameAs(selectedClient);
        assertThat(reportCaptor.getValue().getClientCase()).isSameAs(taskCase);
        assertThat(response.getClientId()).isEqualTo(5L);
        assertThat(response.getCaseId()).isEqualTo(12L);
        verify(caseNoteRepository, never()).save(any());
    }

    @Test
    @DisplayName("createReport throws when client does not exist")
    void createReport_throwsWhenClientDoesNotExist() {
        CreateReportRequest request = new CreateReportRequest();
        request.setClientId(99L);
        request.setDateOfVisit(LocalDate.of(2026, 5, 20));
        when(clientRepository.findById(99L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> reportService.createReport(request, user(9L, "YiKai Kong")))
                .isInstanceOf(EntityNotFoundException.class)
                .hasMessage("Client not found: 99");
    }

    @Test
    @DisplayName("listOwnReports maps only reports created by the current user")
    void listOwnReports_mapsOnlyReportsCreatedByCurrentUser() {
        Client client = client(5L, "Venerable Dev Test", "测试法师");
        User creator = user(9L, "YiKai Kong");
        VisitReport report = report(1L, client, creator);
        when(visitReportRepository.findByCreatedByIdOrderByCreatedAtDescIdDesc(9L)).thenReturn(List.of(report));

        List<ReportSummaryResponse> response = reportService.listOwnReports(creator);

        assertThat(response).hasSize(1);
        assertThat(response.get(0).getCreatedById()).isEqualTo(9L);
        assertThat(response.get(0).getClientId()).isEqualTo(5L);
    }

    @Test
    @DisplayName("listOwnReports filters volunteer task reports by case id")
    void listOwnReports_filtersVolunteerTaskReportsByCaseId() {
        Client client = client(5L, "Venerable Dev Test", "测试法师");
        User creator = user(9L, "YiKai Kong");
        ClientCase taskCase = clientCase(12L, client, "CASE-2026-012");
        VisitReport report = report(1L, client, creator);
        report.setClientCase(taskCase);
        when(visitReportRepository.findOwnReportsForCase(9L, 12L)).thenReturn(List.of(report));

        List<ReportSummaryResponse> response = reportService.listOwnReports(creator, 12L);

        assertThat(response).hasSize(1);
        assertThat(response.get(0).getCreatedById()).isEqualTo(9L);
        assertThat(response.get(0).getClientId()).isEqualTo(5L);
        assertThat(response.get(0).getCaseId()).isEqualTo(12L);
    }

    @Test
    @DisplayName("updateReport updates an existing report body")
    void updateReport_updatesExistingReportBody() {
        Client originalClient = client(5L, "Venerable Dev Test", "测试法师");
        Client updatedClient = client(6L, "Venerable Updated", "更新法师");
        User creator = user(9L, "YiKai Kong");
        VisitReport report = report(1L, originalClient, creator);
        report.setStatus("DRAFT");
        CreateReportRequest request = createRequest();
        request.setClientId(6L);
        request.setDateOfVisit(LocalDate.of(2026, 6, 1));
        request.setLocation("Updated location");
        request.setRecommendations("Updated recommendation");

        when(visitReportRepository.findById(1L)).thenReturn(Optional.of(report));
        when(clientRepository.findById(6L)).thenReturn(Optional.of(updatedClient));

        ReportDetailResponse response = reportService.updateReport(1L, request, creator);

        assertThat(report.getClient()).isSameAs(updatedClient);
        assertThat(report.getDateOfVisit()).isEqualTo(LocalDate.of(2026, 6, 1));
        assertThat(report.getLocation()).isEqualTo("Updated location");
        assertThat(report.getRecommendations()).isEqualTo("Updated recommendation");
        assertThat(report.getUpdatedAt()).isNotNull();
        assertThat(response.getClientId()).isEqualTo(6L);
        assertThat(response.getLocation()).isEqualTo("Updated location");
    }

    @Test
    @DisplayName("submitReport publishes draft and creates a case note")
    void submitReport_publishesDraftAndCreatesCaseNote() {
        Client client = client(5L, "Venerable Dev Test", "测试法师");
        User creator = user(9L, "Volunteer User");
        ClientCase clientCase = clientCase(12L, client, "CASE-2026-012");
        VisitReport report = report(1L, client, creator);
        report.setStatus("DRAFT");
        report.setWhatWasDone("Completed welfare check");

        when(visitReportRepository.findById(1L)).thenReturn(Optional.of(report));
        when(caseRepository.findFirstByClientIdOrderByOpenedAtDescIdDesc(5L)).thenReturn(Optional.of(clientCase));

        ReportDetailResponse response = reportService.submitReport(1L, creator);

        assertThat(response.getStatus()).isEqualTo("SUBMITTED");
        verify(caseNoteRepository).save(any(CaseNote.class));
    }

    @Test
    @DisplayName("updateReport rejects submitted reports")
    void updateReport_rejectsSubmittedReports() {
        User creator = user(9L, "YiKai Kong");
        VisitReport report = report(1L, client(5L, "Venerable Dev Test", "测试法师"), creator);
        report.setStatus("SUBMITTED");

        when(visitReportRepository.findById(1L)).thenReturn(Optional.of(report));

        assertThatThrownBy(() -> reportService.updateReport(1L, createRequest(), creator))
                .isInstanceOf(IllegalStateException.class)
                .hasMessage("Only draft or returned reports can be changed");
    }

    @Test
    @DisplayName("deleteReport removes an existing report")
    void deleteReport_removesExistingReport() {
        User creator = user(9L, "YiKai Kong");
        VisitReport report = report(1L, client(5L, "Venerable Dev Test", "测试法师"), creator);
        report.setStatus("DRAFT");
        when(visitReportRepository.findById(1L)).thenReturn(Optional.of(report));

        reportService.deleteOwnDraftReport(1L, creator);

        verify(visitReportRepository).delete(report);
    }

    @Test
    @DisplayName("isOwnDraft returns true only for current user's draft report")
    void isOwnDraft_returnsTrueForCurrentUsersDraft() {
        User creator = user(9L, "YiKai Kong");
        VisitReport report = report(1L, client(5L, "Venerable Dev Test", "测试法师"), creator);
        report.setStatus("DRAFT");
        when(visitReportRepository.findById(1L)).thenReturn(Optional.of(report));

        assertThat(reportService.isOwnDraft(1L, creator)).isTrue();
    }

    @Test
    @DisplayName("isOwnDraft returns false for submitted report")
    void isOwnDraft_returnsFalseForSubmittedReport() {
        User creator = user(9L, "YiKai Kong");
        VisitReport report = report(1L, client(5L, "Venerable Dev Test", "测试法师"), creator);
        report.setStatus("SUBMITTED");
        when(visitReportRepository.findById(1L)).thenReturn(Optional.of(report));

        assertThat(reportService.isOwnDraft(1L, creator)).isFalse();
    }

    @Test
    @DisplayName("deleteReport rejects submitted reports")
    void deleteReport_rejectsSubmittedReports() {
        User creator = user(9L, "YiKai Kong");
        VisitReport report = report(1L, client(5L, "Venerable Dev Test", "测试法师"), creator);
        report.setStatus("SUBMITTED");
        when(visitReportRepository.findById(1L)).thenReturn(Optional.of(report));

        assertThatThrownBy(() -> reportService.deleteOwnDraftReport(1L, creator))
                .isInstanceOf(IllegalStateException.class)
                .hasMessage("Only draft reports can be deleted");
    }

    @Test
    @DisplayName("deleteReport throws when report does not exist")
    void deleteReport_throwsWhenReportDoesNotExist() {
        when(visitReportRepository.findById(404L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> reportService.deleteOwnDraftReport(404L, user(9L, "YiKai Kong")))
                .isInstanceOf(EntityNotFoundException.class)
                .hasMessage("Report not found: 404");
    }

    private static CreateReportRequest createRequest() {
        CreateReportRequest request = new CreateReportRequest();
        request.setClientId(5L);
        request.setDateOfVisit(LocalDate.of(2026, 5, 20));
        request.setTimeOfVisit("10:30 AM");
        request.setDurationOfVisit("45 minutes");
        request.setLocation("Aranya Temple");
        request.setProgrammeName("Monthly Care Visit");
        request.setTypeOfVisit("Home Visit");
        request.setPurposeOfVisit("Follow up");
        request.setWhatWasDone("Completed welfare check");
        request.setEnvironmentObservations("Stable environment");
        request.setSanghaObservations("Calm");
        request.setOtherObservations("No extra concerns");
        request.setPersonalReflections("Support remains appropriate");
        request.setRecommendations("Follow up next month");
        request.setMattersToHighlight("Confirm medical transport");
        return request;
    }

    private static VisitReport report(Long id, Client client, User creator) {
        VisitReport report = new VisitReport();
        report.setId(id);
        report.setClient(client);
        report.setCreatedBy(creator);
        report.setStaffName(creator.getFullName());
        report.setReportTimestamp(LocalDateTime.of(2026, 5, 20, 10, 30));
        report.setDateOfVisit(LocalDate.of(2026, 5, 20));
        report.setTimeOfVisit("10:30 AM");
        report.setDurationOfVisit("45 minutes");
        report.setLocation("Aranya Temple");
        report.setProgrammeName("Monthly Care Visit");
        report.setTypeOfVisit("Home Visit");
        report.setCreatedAt(LocalDateTime.of(2026, 5, 20, 10, 30));
        report.setUpdatedAt(LocalDateTime.of(2026, 5, 20, 10, 30));
        report.setStatus("SUBMITTED");
        return report;
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

    private static User user(Long id, String fullName) {
        User user = new User();
        user.setId(id);
        user.setUsername("user-" + id);
        user.setEmail("user" + id + "@test.com");
        user.setFullName(fullName);
        user.setStatus("ACTIVE");
        return user;
    }

    private static ClientCase clientCase(Long id, Client client, String caseCode) {
        ClientCase clientCase = new ClientCase();
        clientCase.setId(id);
        clientCase.setClient(client);
        clientCase.setCaseCode(caseCode);
        clientCase.setTitle("Case " + caseCode);
        clientCase.setCreatedBy(user(1L, "Manager User"));
        clientCase.setOpenedAt(LocalDateTime.of(2026, 5, 1, 9, 0));
        clientCase.setCreatedAt(LocalDateTime.of(2026, 5, 1, 9, 0));
        return clientCase;
    }
}
