package aranya.crm.controller;

import aranya.crm.dto.request.DecideApprovalRequest;
import aranya.crm.dto.response.ApprovalRequestResponse;
import aranya.crm.entity.User;
import aranya.crm.security.annotation.CurrentUser;
import aranya.crm.service.ApprovalService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/v1/approvals")
@RequiredArgsConstructor
@PreAuthorize("isAuthenticated()")
public class ApprovalController {

    private final ApprovalService approvalService;

    @GetMapping
    @PreAuthorize("@capEval.hasCap(authentication, 'approvals:view')")
    public ResponseEntity<List<ApprovalRequestResponse>> listPending() {
        return ResponseEntity.ok(approvalService.listPending());
    }

    @PostMapping("/{id}/approve")
    @PreAuthorize("@capEval.hasCap(authentication, 'approvals:decide')")
    public ResponseEntity<ApprovalRequestResponse> approve(
            @PathVariable Long id,
            @Valid @RequestBody(required = false) DecideApprovalRequest request,
            @CurrentUser User currentUser
    ) {
        String comment = request != null ? request.getComment() : null;
        return ResponseEntity.ok(approvalService.approve(id, currentUser, comment));
    }

    @PostMapping("/{id}/reject")
    @PreAuthorize("@capEval.hasCap(authentication, 'approvals:decide')")
    public ResponseEntity<ApprovalRequestResponse> reject(
            @PathVariable Long id,
            @Valid @RequestBody(required = false) DecideApprovalRequest request,
            @CurrentUser User currentUser
    ) {
        String comment = request != null ? request.getComment() : null;
        return ResponseEntity.ok(approvalService.reject(id, currentUser, comment));
    }
}
