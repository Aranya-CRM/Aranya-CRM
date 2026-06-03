package aranya.crm.service;

import aranya.crm.dto.response.CaseDetailResponse;
import aranya.crm.dto.response.CaseSummaryResponse;
import aranya.crm.entity.ClientCase;
import aranya.crm.repository.CaseRepository;
import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class CaseService {

    private static final String CLOSED_STATUS = "CLOSED";
    private static final List<String> URGENT_COLOR_CODES = List.of("RED", "ORANGE");

    private final CaseRepository caseRepository;

    public List<CaseSummaryResponse> listCases(String q, String status) {
        String normalizedQuery = normalizeFilter(q);
        String normalizedStatus = normalizeFilter(status);

        List<ClientCase> cases;
        if (normalizedQuery == null && normalizedStatus == null) {
            cases = caseRepository.findAllByOrderByOpenedAtDescIdDesc();
        } else if (normalizedQuery == null) {
            cases = caseRepository.findByStatusIgnoreCaseOrderByOpenedAtDescIdDesc(normalizedStatus);
        } else if (normalizedStatus == null) {
            cases = caseRepository.searchCases(normalizedQuery);
        } else {
            cases = caseRepository.searchCases(normalizedQuery, normalizedStatus);
        }

        return cases.stream()
                .map(this::toCaseSummaryResponse)
                .toList();
    }

    public CaseDetailResponse getCaseDetail(Long caseId) {
        ClientCase clientCase = caseRepository.findById(caseId)
                .orElseThrow(() -> new EntityNotFoundException("Case not found: " + caseId));

        return toCaseDetailResponse(clientCase);
    }

    public List<ClientCase> getActiveCases(int limit) {
        return caseRepository.findByStatusNotOrderByOpenedAtDescIdDesc(
                CLOSED_STATUS,
                PageRequest.of(0, limit)
        );
    }

    public long countActiveCases() {
        return caseRepository.countByStatusNot(CLOSED_STATUS);
    }

    public List<ClientCase> getUrgentCases(int limit) {
        return caseRepository.findByStatusNotAndColorCodeInOrderByOpenedAtDescIdDesc(
                CLOSED_STATUS,
                URGENT_COLOR_CODES,
                PageRequest.of(0, limit)
        );
    }

    public long countUrgentCases() {
        return caseRepository.countByStatusNotAndColorCodeIn(CLOSED_STATUS, URGENT_COLOR_CODES);
    }

    private CaseSummaryResponse toCaseSummaryResponse(ClientCase clientCase) {
        return CaseSummaryResponse.builder()
                .id(clientCase.getId())
                .caseCode(clientCase.getCaseCode())
                .title(clientCase.getTitle())
                .description(clientCase.getDescription())
                .priority(clientCase.getPriority())
                .status(clientCase.getStatus())
                .colorCode(clientCase.getColorCode())
                .tradition(resolveTradition(clientCase))
                .openedAt(clientCase.getOpenedAt())
                .closedAt(clientCase.getClosedAt())
                .clientId(clientCase.getClient().getId())
                .clientNameEn(clientCase.getClient().getNameEn())
                .clientNameChn(clientCase.getClient().getNameChn())
                .createdById(clientCase.getCreatedBy().getId())
                .createdByName(clientCase.getCreatedBy().getFullName())
                .comments(clientCase.getComments())
                .remarks(clientCase.getRemarks())
                .build();
    }

    private CaseDetailResponse toCaseDetailResponse(ClientCase clientCase) {
        return CaseDetailResponse.builder()
                .id(clientCase.getId())
                .caseCode(clientCase.getCaseCode())
                .title(clientCase.getTitle())
                .description(clientCase.getDescription())
                .priority(clientCase.getPriority())
                .status(clientCase.getStatus())
                .colorCode(clientCase.getColorCode())
                .tradition(resolveTradition(clientCase))
                .openedAt(clientCase.getOpenedAt())
                .closedAt(clientCase.getClosedAt())
                .clientId(clientCase.getClient().getId())
                .clientNameEn(clientCase.getClient().getNameEn())
                .clientNameChn(clientCase.getClient().getNameChn())
                .createdById(clientCase.getCreatedBy().getId())
                .createdByName(clientCase.getCreatedBy().getFullName())
                .comments(clientCase.getComments())
                .remarks(clientCase.getRemarks())
                .build();
    }

    private String resolveTradition(ClientCase clientCase) {
        if (clientCase.getTradition() != null && !clientCase.getTradition().isBlank()) {
            return clientCase.getTradition();
        }
        return clientCase.getClient().getBuddhistTradition();
    }

    public String findLatestCaseCodeForClient(Long clientId) {
        return caseRepository.findFirstByClientIdOrderByOpenedAtDescIdDesc(clientId)
                .map(ClientCase::getCaseCode)
                .orElse(null);
    }

    private String resolveClientVenue(ClientCase clientCase) {
        if (clientCase.getClient().getViharaType() != null && !clientCase.getClient().getViharaType().isBlank()) {
            return clientCase.getClient().getViharaType();
        }
        return clientCase.getClient().getAreaDistrict();
    }

    private String normalizeFilter(String value) {
        if (value == null || value.isBlank()) {
            return null;
        }
        return value.trim();
    }
}
