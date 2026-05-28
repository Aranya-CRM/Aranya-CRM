package aranya.crm.controller;

import aranya.crm.dto.request.CreateCaseNoteRequest;
import aranya.crm.dto.response.CaseDetailResponse;
import aranya.crm.dto.response.CaseNoteResponse;
import aranya.crm.dto.response.CaseSummaryResponse;
import aranya.crm.entity.User;
import aranya.crm.security.annotation.CurrentUser;
import aranya.crm.service.CaseNoteService;
import aranya.crm.service.CaseService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/v1/cases")
@RequiredArgsConstructor
@PreAuthorize("isAuthenticated()")
public class CaseController {

    private final CaseService caseService;
    private final CaseNoteService caseNoteService;

    @GetMapping
    public ResponseEntity<List<CaseSummaryResponse>> listCases(
            @RequestParam(required = false) String q,
            @RequestParam(required = false) String status
    ) {
        return ResponseEntity.ok(caseService.listCases(q, status));
    }

    @GetMapping("/{id}")
    public ResponseEntity<CaseDetailResponse> getCaseDetail(@PathVariable Long id) {
        return ResponseEntity.ok(caseService.getCaseDetail(id));
    }

    @GetMapping("/{id}/notes")
    public ResponseEntity<List<CaseNoteResponse>> listCaseNotes(
            @PathVariable Long id,
            @RequestParam(defaultValue = "false") boolean mine,
            @CurrentUser User currentUser
    ) {
        if (mine) {
            return ResponseEntity.ok(caseNoteService.listOwnCaseNotes(id, currentUser));
        }
        return ResponseEntity.ok(caseNoteService.listCaseNotes(id));
    }

    @PostMapping("/{id}/notes")
    public ResponseEntity<CaseNoteResponse> createCaseNote(
            @PathVariable Long id,
            @Valid @RequestBody CreateCaseNoteRequest request,
            @CurrentUser User currentUser
    ) {
        return ResponseEntity.ok(caseNoteService.createCaseNote(id, request, currentUser));
    }

    @DeleteMapping("/{caseId}/notes/{noteId}")
    public ResponseEntity<Void> deleteOwnCaseNote(
            @PathVariable Long caseId,
            @PathVariable Long noteId,
            @CurrentUser User currentUser
    ) {
        caseNoteService.deleteOwnCaseNote(noteId, currentUser);
        return ResponseEntity.noContent().build();
    }
}
