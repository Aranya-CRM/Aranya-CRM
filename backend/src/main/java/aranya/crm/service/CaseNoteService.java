package aranya.crm.service;

import aranya.crm.dto.response.CaseNoteResponse;
import aranya.crm.entity.CaseNote;
import aranya.crm.entity.User;
import aranya.crm.repository.CaseNoteRepository;
import aranya.crm.repository.CaseRepository;
import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class CaseNoteService {

    private final CaseRepository caseRepository;
    private final CaseNoteRepository caseNoteRepository;

    public List<CaseNoteResponse> listCaseNotes(Long caseId) {
        if (!caseRepository.existsById(caseId)) {
            throw new EntityNotFoundException("Case not found: " + caseId);
        }

        return caseNoteRepository.findByClientCaseIdOrderByCreatedAtDescIdDesc(caseId).stream()
                .map(this::toResponse)
                .toList();
    }

    private CaseNoteResponse toResponse(CaseNote note) {
        User createdBy = note.getCreatedBy();
        return CaseNoteResponse.builder()
                .id(String.valueOf(note.getId()))
                .caseId(String.valueOf(note.getClientCase().getId()))
                .date(note.getCreatedAt().toLocalDate())
                .content(note.getContent())
                .followUp("")
                .recordedBy(createdBy != null ? createdBy.getFullName() : "Unknown")
                .createdAt(note.getCreatedAt())
                .build();
    }
}
