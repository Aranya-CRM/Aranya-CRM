package aranya.crm.service;

import aranya.crm.dto.response.CaseDetailResponse;
import aranya.crm.dto.response.CaseSummaryResponse;
import aranya.crm.entity.Client;
import aranya.crm.entity.ClientCase;
import aranya.crm.entity.User;
import aranya.crm.repository.CaseRepository;
import jakarta.persistence.EntityNotFoundException;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.PageRequest;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class CaseServiceTest {

    @Mock
    private CaseRepository caseRepository;

    @InjectMocks
    private CaseService caseService;

    // ── listCases ─────────────────────────────────────────────────────────────

    @Test
    @DisplayName("listCases with no filters calls findAllByOrderByOpenedAtDescIdDesc")
    void listCases_noFilters_callsFindAll() {
        when(caseRepository.findAllByOrderByOpenedAtDescIdDesc()).thenReturn(List.of());

        caseService.listCases(null, null);

        verify(caseRepository).findAllByOrderByOpenedAtDescIdDesc();
    }

    @Test
    @DisplayName("listCases with query only calls searchCases(q)")
    void listCases_queryOnly_callsSearchCasesWithQuery() {
        when(caseRepository.searchCases("nyanatiloka")).thenReturn(List.of());

        caseService.listCases("nyanatiloka", "  ");

        verify(caseRepository).searchCases("nyanatiloka");
    }

    @Test
    @DisplayName("listCases with status only calls findByStatusIgnoreCase")
    void listCases_statusOnly_callsFindByStatus() {
        when(caseRepository.findByStatusIgnoreCaseOrderByOpenedAtDescIdDesc("OPEN")).thenReturn(List.of());

        caseService.listCases(null, "OPEN");

        verify(caseRepository).findByStatusIgnoreCaseOrderByOpenedAtDescIdDesc("OPEN");
    }

    @Test
    @DisplayName("listCases with both query and status calls searchCases(q, status)")
    void listCases_bothFilters_callsSearchCasesWithBoth() {
        when(caseRepository.searchCases("tan", "OPEN")).thenReturn(List.of());

        caseService.listCases(" tan ", " OPEN ");

        verify(caseRepository).searchCases("tan", "OPEN");
    }

    @Test
    @DisplayName("listCases maps case fields to summary response correctly")
    void listCases_mapsFieldsToSummaryResponse() {
        ClientCase clientCase = buildCase(1L, "ASDFL/2026/C/001", "OPEN", "RED");

        when(caseRepository.findAllByOrderByOpenedAtDescIdDesc()).thenReturn(List.of(clientCase));

        List<CaseSummaryResponse> result = caseService.listCases(null, null);

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

    // ── helpers ───────────────────────────────────────────────────────────────

    private ClientCase buildCase(Long id, String caseCode, String status, String colorCode) {
        Client client = new Client();
        client.setId(100L);
        client.setNameEn("John Smith");
        client.setNameChn("约翰");

        User createdBy = new User();
        createdBy.setId(200L);
        createdBy.setFullName("Manager A");

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
}
