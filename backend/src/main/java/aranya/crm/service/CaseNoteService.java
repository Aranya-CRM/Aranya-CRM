package aranya.crm.service;

import aranya.crm.dto.request.CreateCaseNoteRequest;
import aranya.crm.dto.response.CaseNoteResponse;
import aranya.crm.entity.CaseNote;
import aranya.crm.entity.ClientCase;
import aranya.crm.entity.User;
import aranya.crm.repository.CaseNoteRepository;
import aranya.crm.repository.CaseRepository;
import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
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
                .filter(this::isManualNote)
                .map(this::toResponse)
                .toList();
    }

    public List<CaseNoteResponse> listOwnCaseNotes(Long caseId, User currentUser) {
        if (!caseRepository.existsById(caseId)) {
            throw new EntityNotFoundException("Case not found: " + caseId);
        }
        Long currentUserId = currentUser != null ? currentUser.getId() : null;
        if (currentUserId == null) {
            return List.of();
        }

        return caseNoteRepository.findByClientCaseIdAndCreatedByIdOrderByCreatedAtDescIdDesc(caseId, currentUserId)
                .stream()
                .filter(this::isManualNote)
                .map(this::toResponse)
                .toList();
    }

    @Transactional
    public CaseNoteResponse createCaseNote(Long caseId, CreateCaseNoteRequest request, User createdBy) {
        ClientCase clientCase = caseRepository.findById(caseId)
                .orElseThrow(() -> new EntityNotFoundException("Case not found: " + caseId));

        CaseNote note = new CaseNote();
        note.setClientCase(clientCase);
        note.setNoteType("VOLUNTEER");
        note.setVisibility("TEAM");
        note.setCreatedBy(createdBy);
        note.setContent(normalizeText(request.getContent()));
        note.setUpdatedAt(LocalDateTime.now());

        CaseNote saved = caseNoteRepository.save(note);
        return toResponse(saved, normalizeText(request.getFollowUp()));
    }

    @Transactional
    public void executeApprovedDeleteCaseNote(Long noteId, User approvedBy) {
        if (!caseNoteRepository.existsById(noteId)) {
            return;
        }
        deleteCaseNote(noteId, approvedBy, true);
    }

    @Transactional
    public void deleteOwnCaseNote(Long caseId, Long noteId, User currentUser) {
        Long currentUserId = currentUser != null ? currentUser.getId() : null;
        if (currentUserId == null) {
            throw new EntityNotFoundException("Case note not found: " + noteId);
        }

        CaseNote note = caseNoteRepository.findByIdAndClientCaseIdAndCreatedById(noteId, caseId, currentUserId)
                .orElseThrow(() -> new EntityNotFoundException("Case note not found: " + noteId));
        caseNoteRepository.delete(note);
    }

    void deleteCaseNote(Long noteId, User currentUser, boolean canDeleteAny) {
        Long currentUserId = currentUser != null ? currentUser.getId() : null;
        if (currentUserId == null && !canDeleteAny) {
            throw new EntityNotFoundException("Case note not found: " + noteId);
        }

        CaseNote note = canDeleteAny
                ? caseNoteRepository.findById(noteId)
                    .orElseThrow(() -> new EntityNotFoundException("Case note not found: " + noteId))
                : caseNoteRepository.findByIdAndCreatedById(noteId, currentUserId)
                    .orElseThrow(() -> new EntityNotFoundException("Case note not found: " + noteId));

        caseNoteRepository.delete(note);
    }

    private CaseNoteResponse toResponse(CaseNote note) {
        return toResponse(note, "");
    }

    private boolean isManualNote(CaseNote note) {
        return !"REPORT".equalsIgnoreCase(note.getNoteType());
    }

    private CaseNoteResponse toResponse(CaseNote note, String followUp) {
        User createdBy = note.getCreatedBy();
        return CaseNoteResponse.builder()
                .id(String.valueOf(note.getId()))
                .caseId(String.valueOf(note.getClientCase().getId()))
                .date(note.getCreatedAt().toLocalDate())
                .content(note.getContent())
                .followUp(followUp != null ? followUp : "")
                .recordedBy(createdBy != null ? createdBy.getFullName() : "Unknown")
                .createdAt(note.getCreatedAt())
                .build();
    }

    private String normalizeText(String value) {
        if (value == null || value.isBlank()) {
            return "";
        }
        return value.trim();
    }
}
