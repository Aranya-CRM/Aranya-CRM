package aranya.crm.service;

import aranya.crm.dto.response.CaseDetailResponse;
import aranya.crm.dto.response.CaseSummaryResponse;
import aranya.crm.dto.request.CreateCaseRequest;
import aranya.crm.entity.CaseAssignment;
import aranya.crm.entity.Client;
import aranya.crm.entity.ClientCase;
import aranya.crm.entity.Role;
import aranya.crm.entity.User;
import aranya.crm.entity.UserRole;
import aranya.crm.repository.CaseAssignmentRepository;
import aranya.crm.repository.CaseRepository;
import aranya.crm.repository.ClientRepository;
import aranya.crm.repository.UserRepository;
import jakarta.persistence.EntityNotFoundException;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.ArgumentCaptor;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.data.domain.Pageable;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class CaseServiceTest {

    @Mock
    private CaseRepository caseRepository;

    @Mock
    private CaseAssignmentRepository caseAssignmentRepository;

    @Mock
    private ClientRepository clientRepository;

    @Mock
    private UserRepository userRepository;

    @Mock
    private JdbcTemplate jdbcTemplate;

    @Mock
    private OperationAuditLogService operationAuditLogService;

    @InjectMocks
    private CaseService caseService;

    // ── listCases ─────────────────────────────────────────────────────────────

    @Test
    @DisplayName("listCases with no filters calls findAllByOrderByOpenedAtDescIdDesc")
    void listCases_noFilters_callsFindAll() {
        when(caseRepository.findAllByOrderByOpenedAtDescIdDesc()).thenReturn(List.of());

        caseService.listCases(null, null, null);

        verify(caseRepository).findAllByOrderByOpenedAtDescIdDesc();
    }

    @Test
    @DisplayName("listCases with query only calls searchCases(q)")
    void listCases_queryOnly_callsSearchCasesWithQuery() {
        when(caseRepository.searchCases("nyanatiloka")).thenReturn(List.of());

        caseService.listCases("nyanatiloka", "  ", null);

        verify(caseRepository).searchCases("nyanatiloka");
    }

    @Test
    @DisplayName("listCases with status only calls findByStatusIgnoreCase")
    void listCases_statusOnly_callsFindByStatus() {
        when(caseRepository.findByStatusIgnoreCaseOrderByOpenedAtDescIdDesc("OPEN")).thenReturn(List.of());

        caseService.listCases(null, "OPEN", null);

        verify(caseRepository).findByStatusIgnoreCaseOrderByOpenedAtDescIdDesc("OPEN");
    }

    @Test
    @DisplayName("listCases with both query and status calls searchCases(q, status)")
    void listCases_bothFilters_callsSearchCasesWithBoth() {
        when(caseRepository.searchCases("tan", "OPEN")).thenReturn(List.of());

        caseService.listCases(" tan ", " OPEN ", null);

        verify(caseRepository).searchCases("tan", "OPEN");
    }

    @Test
    @DisplayName("listCases scoped to a user queries primary assignments")
    void listCases_scopedUser_callsAssignedCasesQuery() {
        when(caseRepository.findAssignedCasesByUserIdOrderByOpenedAtDescIdDesc(10L)).thenReturn(List.of());

        caseService.listCases(null, null, 10L);

        verify(caseRepository).findAssignedCasesByUserIdOrderByOpenedAtDescIdDesc(10L);
        verify(caseRepository, never()).findByCreatedByIdOrderByOpenedAtDescIdDesc(10L);
    }

    @Test
    @DisplayName("listCases maps case fields to summary response correctly")
    void listCases_mapsFieldsToSummaryResponse() {
        ClientCase clientCase = buildCase(1L, "ASDFL/2026/C/001", "OPEN", "RED");

        when(caseRepository.findAllByOrderByOpenedAtDescIdDesc()).thenReturn(List.of(clientCase));

        List<CaseSummaryResponse> result = caseService.listCases(null, null, null);

        assertThat(result).hasSize(1);
        assertThat(result.get(0).getId()).isEqualTo(1L);
        assertThat(result.get(0).getCaseCode()).isEqualTo("ASDFL/2026/C/001");
        assertThat(result.get(0).getStatus()).isEqualTo("OPEN");
        assertThat(result.get(0).getColorCode()).isEqualTo("RED");
        assertThat(result.get(0).getClientNameEn()).isEqualTo("John Smith");
        assertThat(result.get(0).getCreatedByName()).isEqualTo("Manager A");
    }

    // ── getCaseDetail ─────────────────────────────────────────────────────────

    @Test
    @DisplayName("getCaseDetail returns full detail response")
    void getCaseDetail_returnsDetailResponse() {
        ClientCase clientCase = buildCase(5L, "ASDFL/2026/C/005", "OPEN", "GREEN");

        when(caseRepository.findById(5L)).thenReturn(Optional.of(clientCase));

        CaseDetailResponse response = caseService.getCaseDetail(5L);

        assertThat(response.getId()).isEqualTo(5L);
        assertThat(response.getCaseCode()).isEqualTo("ASDFL/2026/C/005");
        assertThat(response.getClientId()).isEqualTo(100L);
        assertThat(response.getCreatedById()).isEqualTo(200L);
    }

    @Test
    @DisplayName("getCaseDetail throws when case does not exist")
    void getCaseDetail_throwsWhenCaseDoesNotExist() {
        when(caseRepository.findById(99L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> caseService.getCaseDetail(99L))
                .isInstanceOf(EntityNotFoundException.class)
                .hasMessage("Case not found: 99");
    }

    // ── executeApprovedCreateCase ───────────────────────────────────────────

    @Test
    @DisplayName("executeApprovedCreateCase allows a client whose previous cases are closed or deleted")
    void executeApprovedCreateCase_allowsClientWithoutActiveCase() {
        Client client = buildClient(100L, "John Smith");
        User createdBy = buildUser(200L, "Manager A");
        CreateCaseRequest request = buildCreateCaseRequest(100L);

        when(clientRepository.findById(100L)).thenReturn(Optional.of(client));
        when(caseRepository.existsActiveCaseByClientId(100L)).thenReturn(false);
        when(caseRepository.findLatestCaseCodeByYear("2026")).thenReturn(Optional.empty());
        when(caseRepository.save(any(ClientCase.class))).thenAnswer(invocation -> {
            ClientCase saved = invocation.getArgument(0);
            saved.setId(55L);
            saved.setCreatedAt(LocalDateTime.of(2026, 6, 25, 10, 0));
            return saved;
        });
        when(jdbcTemplate.queryForList(anyString(), eq(String.class), eq(55L))).thenReturn(List.of());

        CaseDetailResponse response = caseService.executeApprovedCreateCase(request, createdBy);

        assertThat(response.getId()).isEqualTo(55L);
        assertThat(response.getClientId()).isEqualTo(100L);
        verify(caseRepository).existsActiveCaseByClientId(100L);
    }

    @Test
    @DisplayName("executeApprovedCreateCase rejects a client with an active case")
    void executeApprovedCreateCase_rejectsClientWithActiveCase() {
        Client client = buildClient(100L, "John Smith");
        CreateCaseRequest request = buildCreateCaseRequest(100L);

        when(clientRepository.findById(100L)).thenReturn(Optional.of(client));
        when(caseRepository.existsActiveCaseByClientId(100L)).thenReturn(true);

        assertThatThrownBy(() -> caseService.executeApprovedCreateCase(request, buildUser(200L, "Manager A")))
                .isInstanceOf(IllegalStateException.class)
                .hasMessage("Client already has an active case");
        verify(caseRepository, never()).save(any(ClientCase.class));
    }

    @Test
    @DisplayName("executeApprovedCreateCase writes selected primary assignee")
    void executeApprovedCreateCase_writesPrimaryAssignee() {
        Client client = buildClient(100L, "John Smith");
        User requester = buildUserWithRole(200L, "Manager A", "MANAGER");
        User socialWorker = buildUserWithRole(300L, "Social Worker A", "SOCIAL_WORKER");
        CreateCaseRequest request = buildCreateCaseRequest(100L);
        request.setSocialWorkerId(300L);

        when(clientRepository.findById(100L)).thenReturn(Optional.of(client));
        when(caseRepository.existsActiveCaseByClientId(100L)).thenReturn(false);
        when(userRepository.findByIdWithRoles(300L)).thenReturn(Optional.of(socialWorker));
        when(caseRepository.findLatestCaseCodeByYear("2026")).thenReturn(Optional.empty());
        when(caseRepository.save(any(ClientCase.class))).thenAnswer(invocation -> {
            ClientCase saved = invocation.getArgument(0);
            saved.setId(55L);
            saved.setCreatedAt(LocalDateTime.of(2026, 6, 25, 10, 0));
            return saved;
        });
        when(jdbcTemplate.queryForList(anyString(), eq(String.class), eq(55L))).thenReturn(List.of());

        caseService.executeApprovedCreateCase(request, requester);

        ArgumentCaptor<CaseAssignment> assignmentCaptor = ArgumentCaptor.forClass(CaseAssignment.class);
        verify(caseAssignmentRepository).save(assignmentCaptor.capture());
        CaseAssignment assignment = assignmentCaptor.getValue();
        assertThat(assignment.getClientCase().getId()).isEqualTo(55L);
        assertThat(assignment.getUser().getId()).isEqualTo(300L);
        assertThat(assignment.isPrimary()).isTrue();
        assertThat(assignment.getAssignmentRole()).isEqualTo("SOCIAL_WORKER");
        assertThat(assignment.getAssignedBy().getId()).isEqualTo(200L);
    }

    // ── resolveTradition ──────────────────────────────────────────────────────

    @Test
    @DisplayName("resolveTradition uses case's own tradition when present")
    void resolveTradition_usesCaseTradition_whenPresent() {
        ClientCase clientCase = buildCase(10L, "ASDFL/2026/C/010", "OPEN", null);
        clientCase.setTradition("Vajrayana");
        clientCase.getClient().setBuddhistTradition("Mahayana");

        when(caseRepository.findById(10L)).thenReturn(Optional.of(clientCase));

        CaseDetailResponse response = caseService.getCaseDetail(10L);

        assertThat(response.getTradition()).isEqualTo("Vajrayana");
    }

    @Test
    @DisplayName("resolveTradition falls back to client's buddhistTradition when case tradition is blank")
    void resolveTradition_fallsBackToClientTradition_whenCaseTraditionIsBlank() {
        ClientCase clientCase = buildCase(11L, "ASDFL/2026/C/011", "OPEN", null);
        clientCase.setTradition("  ");
        clientCase.getClient().setBuddhistTradition("Theravada");

        when(caseRepository.findById(11L)).thenReturn(Optional.of(clientCase));

        CaseDetailResponse response = caseService.getCaseDetail(11L);

        assertThat(response.getTradition()).isEqualTo("Theravada");
    }

    @Test
    @DisplayName("resolveTradition falls back to client's buddhistTradition when case tradition is null")
    void resolveTradition_fallsBackToClientTradition_whenCaseTraditionIsNull() {
        ClientCase clientCase = buildCase(12L, "ASDFL/2026/C/012", "OPEN", null);
        clientCase.setTradition(null);
        clientCase.getClient().setBuddhistTradition("Mahayana");

        when(caseRepository.findById(12L)).thenReturn(Optional.of(clientCase));

        CaseDetailResponse response = caseService.getCaseDetail(12L);

        assertThat(response.getTradition()).isEqualTo("Mahayana");
    }

    // ── getActiveCases / countActiveCases ────────────────────────────────────

    @Test
    @DisplayName("getActiveCases delegates to repository active case query and page limit")
    void getActiveCases_returnsNonClosedCases() {
        ClientCase openCase = buildCase(1L, "ASDFL/2026/C/001", "OPEN", "GREEN");
        when(caseRepository.findActiveCases(any(Pageable.class)))
                .thenReturn(List.of(openCase));

        List<ClientCase> result = caseService.getActiveCases(5);

        assertThat(result).hasSize(1);
        assertThat(result.get(0).getStatus()).isEqualTo("OPEN");
        verify(caseRepository).findActiveCases(any(Pageable.class));
    }

    @Test
    @DisplayName("countActiveCases returns repository count of active cases")
    void countActiveCases_returnsCount() {
        when(caseRepository.countActiveCases()).thenReturn(7L);

        assertThat(caseService.countActiveCases()).isEqualTo(7L);
        verify(caseRepository).countActiveCases();
    }

    // ── getUrgentCases / countUrgentCases ─────────────────────────────────────

    @Test
    @DisplayName("getUrgentCases returns active RED and ORANGE cases")
    void getUrgentCases_returnsUrgentColorCases() {
        ClientCase urgentCase = buildCase(2L, "ASDFL/2026/C/002", "OPEN", "RED");
        when(caseRepository.findUrgentActiveCases(any(), any(Pageable.class)))
                .thenReturn(List.of(urgentCase));

        List<ClientCase> result = caseService.getUrgentCases(3);

        assertThat(result).hasSize(1);
        assertThat(result.get(0).getColorCode()).isEqualTo("RED");
        verify(caseRepository).findUrgentActiveCases(any(), any(Pageable.class));
    }

    @Test
    @DisplayName("countUrgentCases returns repository count of urgent cases")
    void countUrgentCases_returnsCount() {
        when(caseRepository.countUrgentActiveCases(any())).thenReturn(2L);

        assertThat(caseService.countUrgentCases()).isEqualTo(2L);
        verify(caseRepository).countUrgentActiveCases(any());
    }

    // ── helpers ───────────────────────────────────────────────────────────────

    private ClientCase buildCase(Long id, String caseCode, String status, String colorCode) {
        Client client = buildClient(100L, "John Smith");
        User createdBy = buildUser(200L, "Manager A");

        ClientCase cc = new ClientCase();
        cc.setId(id);
        cc.setCaseCode(caseCode);
        cc.setTitle("Initial Case");
        cc.setStatus(status);
        cc.setColorCode(colorCode);
        cc.setClient(client);
        cc.setCreatedBy(createdBy);
        cc.setOpenedAt(LocalDateTime.of(2026, 5, 21, 10, 0));
        cc.setCreatedAt(LocalDateTime.of(2026, 5, 21, 10, 0));
        return cc;
    }

    private Client buildClient(Long id, String nameEn) {
        Client client = new Client();
        client.setId(id);
        client.setNameEn(nameEn);
        client.setNameChn("约翰");
        client.setBuddhistTradition("Mahayana");
        return client;
    }

    private User buildUser(Long id, String fullName) {
        User user = new User();
        user.setId(id);
        user.setFullName(fullName);
        return user;
    }

    private User buildUserWithRole(Long id, String fullName, String roleName) {
        User user = buildUser(id, fullName);
        user.setStatus("ACTIVE");
        Role role = new Role();
        role.setName(roleName);
        UserRole userRole = new UserRole();
        userRole.setUser(user);
        userRole.setRole(role);
        user.getUserRoles().add(userRole);
        return user;
    }

    private CreateCaseRequest buildCreateCaseRequest(Long clientId) {
        CreateCaseRequest request = new CreateCaseRequest();
        request.setClientId(clientId);
        request.setOpenedAt(LocalDate.of(2026, 6, 25));
        request.setStatus("OPEN");
        request.setColorCode("GREEN");
        request.setServices(List.of());
        return request;
    }
}
