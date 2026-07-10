package aranya.crm.controller;

import aranya.crm.dto.response.AuditHistoryEntryResponse;
import aranya.crm.service.AuditHistoryService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
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

    @GetMapping("/cases/{caseId}")
    @PreAuthorize("@capEval.hasCap(authentication, 'cases:view')")
    public ResponseEntity<List<AuditHistoryEntryResponse>> listCaseAuditHistory(@PathVariable Long caseId) {
        return ResponseEntity.ok(auditHistoryService.listCaseAuditHistory(caseId));
    }
}
