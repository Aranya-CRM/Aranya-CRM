package aranya.crm.controller;

import aranya.crm.dto.request.CreateReportRequest;
import aranya.crm.dto.response.ApprovalRequestResponse;
import aranya.crm.dto.response.ReportDetailResponse;
import aranya.crm.dto.response.ReportSummaryResponse;
import aranya.crm.entity.User;
import aranya.crm.security.CapPermissionEvaluator;
import aranya.crm.security.annotation.CurrentUser;
import aranya.crm.service.ApprovalService;
import aranya.crm.service.ReportService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/v1/reports")
@RequiredArgsConstructor
@PreAuthorize("isAuthenticated()")
public class ReportController {
    private static final String APPROVER_HEADER = "X-Approver-Id";
    private static final String APPROVAL_REASON_HEADER = "X-Approval-Reason";

    private final ReportService reportService;
    private final ApprovalService approvalService;
    private final CapPermissionEvaluator capEval;

    @GetMapping
    public ResponseEntity<List<ReportSummaryResponse>> listReports(
            @CurrentUser User currentUser,
            Authentication authentication,
            @RequestParam(defaultValue = "false") boolean mine,
            @RequestParam(required = false) Long caseId,
            @RequestParam(required = false) Long appointmentId
    ) {
        denyAdminEventModule(authentication);
        if (mine) {
            return ResponseEntity.ok(reportService.listOwnReports(currentUser, caseId, appointmentId));
        }
        // MOCK: Social Workers only see reports submitted by volunteers (eventually scoped
        // to the tasks they are responsible for). Other reviewers (e.g. Manager) see all.
        boolean volunteerAuthorsOnly = hasRole(authentication, "SOCIAL_WORKER");
        return ResponseEntity.ok(reportService.listReviewableReports(currentUser, volunteerAuthorsOnly));
    }

    private boolean hasRole(Authentication authentication, String role) {
        if (authentication == null) {
            return false;
        }
        String authority = "ROLE_" + role;
        return authentication.getAuthorities().stream()
                .anyMatch(granted -> authority.equals(granted.getAuthority()));
    }

    @GetMapping("/{id}")
    public ResponseEntity<ReportDetailResponse> getReportDetail(Authentication authentication, @PathVariable Long id) {
        denyAdminEventModule(authentication);
        return ResponseEntity.ok(reportService.getReportDetail(id));
    }

    @PostMapping
    public ResponseEntity<ReportDetailResponse> createReport(
            @CurrentUser User currentUser,
            Authentication authentication,
            @Valid @RequestBody CreateReportRequest request
    ) {
        denyAdminEventModule(authentication);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(reportService.createReport(request, currentUser));
    }

    @PutMapping("/{id}")
    public ResponseEntity<ReportDetailResponse> updateReport(
            @CurrentUser User currentUser,
            Authentication authentication,
            @PathVariable Long id,
            @Valid @RequestBody CreateReportRequest request
    ) {
        denyAdminEventModule(authentication);
        return ResponseEntity.ok(reportService.updateReport(id, request, currentUser));
    }

    @PostMapping("/{id}/submit")
    public ResponseEntity<ReportDetailResponse> submitReport(
            @CurrentUser User currentUser,
            Authentication authentication,
            @PathVariable Long id
    ) {
        denyAdminEventModule(authentication);
        return ResponseEntity.ok(reportService.submitReport(id, currentUser));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<?> deleteReport(
            @CurrentUser User currentUser,
            @PathVariable Long id,
            Authentication authentication,
            @RequestHeader(name = APPROVER_HEADER, required = false) Long approverId,
            @RequestHeader(name = APPROVAL_REASON_HEADER, required = false) String approvalReason
    ) {
        denyAdminEventModule(authentication);
        boolean canDeleteAny = capEval.hasCap(authentication, "reports:delete");
        if (canDeleteAny) {
            ApprovalRequestResponse approval = approvalService.createRequest(
                    "DELETE_REPORT",
                    "REPORT",
                    id,
                    null,
                    currentUser,
                    approverId,
                    approvalReason
            );
            return ResponseEntity.status(HttpStatus.ACCEPTED).body(approval);
        }
        if (!reportService.isOwnDraft(id, currentUser)) {
            throw new org.springframework.security.access.AccessDeniedException("Only draft reports can be deleted directly");
        }
        reportService.deleteOwnDraftReport(id, currentUser);
        return ResponseEntity.noContent().build();
    }

    private void denyAdminEventModule(Authentication authentication) {
        if (hasRole(authentication, "ADMIN")) {
            throw new org.springframework.security.access.AccessDeniedException("Admin does not use event module");
        }
    }
}
