package aranya.crm.controller;

import aranya.crm.dto.response.AuditHistoryEntryResponse;
import aranya.crm.entity.User;
import aranya.crm.security.CapPermissionEvaluator;
import aranya.crm.security.annotation.CurrentUser;
import aranya.crm.service.AuditHistoryService;
import aranya.crm.service.CaseService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/v1/audit-history")
@RequiredArgsConstructor
@PreAuthorize("isAuthenticated()")
public class AuditHistoryController {

    private final AuditHistoryService auditHistoryService;
    private final CaseService caseService;
    private final CapPermissionEvaluator capEval;

    @GetMapping("/cases/{caseId}")
    @PreAuthorize("@capEval.hasCap(authentication, 'cases:view')")
    public ResponseEntity<List<AuditHistoryEntryResponse>> listCaseAuditHistory(
            @PathVariable Long caseId,
            Authentication authentication,
            @CurrentUser User currentUser
    ) {
        caseService.requireCaseVisible(caseId, scopedUserId(authentication, currentUser));
        boolean canViewAll = capEval.hasCap(authentication, "cases:audit");
        return ResponseEntity.ok(auditHistoryService.listCaseAuditHistory(
                caseId,
                currentUser == null ? null : currentUser.getId(),
                canViewAll
        ));
    }

    private Long scopedUserId(Authentication authentication, User currentUser) {
        String scope = capEval.capScope(authentication, "cases:view");
        if ("NO".equals(scope)) {
            throw new AccessDeniedException("User cannot view cases");
        }
        if ("OWN".equals(scope)) {
            if (currentUser == null || currentUser.getId() == null) {
                throw new AccessDeniedException("User cannot view cases");
            }
            return currentUser.getId();
        }
        return null;
    }
}
