package aranya.crm.controller;

import aranya.crm.dto.request.CreateCaseRequest;
import aranya.crm.dto.request.CreateCaseNoteRequest;
import aranya.crm.dto.request.CreateServiceEventRequest;
import aranya.crm.dto.request.UpdateCaseRequest;
import aranya.crm.dto.response.CaseDetailResponse;
import aranya.crm.dto.response.CaseNoteResponse;
import aranya.crm.dto.response.CaseSummaryResponse;
import aranya.crm.dto.response.ServiceEventResponse;
import aranya.crm.entity.User;
import aranya.crm.security.CapPermissionEvaluator;
import aranya.crm.security.annotation.CurrentUser;
import aranya.crm.service.CaseNoteService;
import aranya.crm.service.CaseService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
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
    private final CapPermissionEvaluator capEval;

    @GetMapping
    public ResponseEntity<List<CaseSummaryResponse>> listCases(
            @RequestParam(required = false) String q,
            @RequestParam(required = false) String status,
            Authentication authentication,
            @CurrentUser User currentUser
    ) {
        String scope = capEval.capScope(authentication, "cases:view");
        Long scopedUserId = "OWN".equals(scope) && currentUser != null ? currentUser.getId() : null;
        return ResponseEntity.ok(caseService.listCases(q, status, scopedUserId));
    }

    @GetMapping("/{id}")
    public ResponseEntity<CaseDetailResponse> getCaseDetail(@PathVariable Long id) {
        return ResponseEntity.ok(caseService.getCaseDetail(id));
    }

    @PostMapping
    @PreAuthorize("@capEval.hasCap(authentication, 'cases:create')")
    public ResponseEntity<CaseDetailResponse> createCase(
            @Valid @RequestBody CreateCaseRequest request,
            @CurrentUser User currentUser
    ) {
        return ResponseEntity.ok(caseService.createCase(request, currentUser));
    }

    @PatchMapping("/{id}")
    @PreAuthorize("@capEval.hasCap(authentication, 'cases:assign') or @capEval.hasCap(authentication, 'cases:status.close')")
    public ResponseEntity<CaseDetailResponse> updateCase(
            @PathVariable Long id,
            @Valid @RequestBody UpdateCaseRequest request
    ) {
        return ResponseEntity.ok(caseService.updateCase(id, request));
    }

    @PatchMapping("/{id}/services")
    @PreAuthorize("@capEval.hasCap(authentication, 'cases:assign') or @capEval.hasCap(authentication, 'cases:reassign')")
    public ResponseEntity<CaseDetailResponse> updateCaseServices(
            @PathVariable Long id,
            @RequestBody List<String> serviceKeys
    ) {
        return ResponseEntity.ok(caseService.updateCaseServices(id, serviceKeys));
    }

    @GetMapping("/{id}/service-events")
    public ResponseEntity<List<ServiceEventResponse>> listServiceEvents(@PathVariable Long id) {
        return ResponseEntity.ok(caseService.listServiceEvents(id));
    }

    @PostMapping("/{id}/service-events")
    @PreAuthorize("@capEval.hasCap(authentication, 'cases:assign') or @capEval.hasCap(authentication, 'cases:reassign')")
    public ResponseEntity<ServiceEventResponse> createServiceEvent(
            @PathVariable Long id,
            @Valid @RequestBody CreateServiceEventRequest request,
            @CurrentUser User currentUser
    ) {
        return ResponseEntity.ok(caseService.createServiceEvent(id, request, currentUser));
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
            @CurrentUser User currentUser,
            Authentication authentication
    ) {
        boolean canDeleteAny = capEval.hasCap(authentication, "cases:notes.delete");
        caseNoteService.deleteCaseNote(noteId, currentUser, canDeleteAny);
        return ResponseEntity.noContent().build();
    }
}
