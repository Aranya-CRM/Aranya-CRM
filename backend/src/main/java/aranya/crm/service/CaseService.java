package aranya.crm.service;

import aranya.crm.entity.ClientCase;
import aranya.crm.repository.CaseRepository;
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

}
