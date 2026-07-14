package aranya.crm.controller;

import aranya.crm.dto.request.CreateCaseRequest;
import aranya.crm.dto.request.CreateServiceEventRequest;
import aranya.crm.dto.request.UpdateCaseRequest;
import aranya.crm.dto.response.ApprovalRequestResponse;
import aranya.crm.dto.response.CalendarEventResponse;
import aranya.crm.dto.response.CaseDetailResponse;
import aranya.crm.dto.response.CaseSummaryResponse;
import aranya.crm.dto.response.ServiceEventResponse;
import aranya.crm.entity.User;
import aranya.crm.security.CapPermissionEvaluator;
import aranya.crm.security.annotation.CurrentUser;
import aranya.crm.service.CaseService;
import aranya.crm.service.ApprovalService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.format.annotation.DateTimeFormat;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/cases")
@RequiredArgsConstructor
@PreAuthorize("isAuthenticated()")
public class CaseController {
    private static final String APPROVER_HEADER = "X-Approver-Id";
    private static final String APPROVAL_REASON_HEADER = "X-Approval-Reason";

    private final CaseService caseService;
    private final ApprovalService approvalService;
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
    public ResponseEntity<ApprovalRequestResponse> createCase(
            @Valid @RequestBody CreateCaseRequest request,
            @CurrentUser User currentUser,
            @RequestHeader(name = APPROVER_HEADER, required = false) Long approverId,
            @RequestHeader(name = APPROVAL_REASON_HEADER, required = false) String approvalReason
    ) {
        if (approvalService.hasPendingRequest("CASE_CREATE", "CLIENT", request.getClientId())) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Client already has a pending case creation approval");
        }
        ApprovalRequestResponse approval = approvalService.createRequest(
                "CASE_CREATE",
                "CLIENT",
                request.getClientId(),
                request,
                currentUser,
                approverId,
                approvalReason
        );
        return ResponseEntity.status(HttpStatus.ACCEPTED).body(approval);
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
    @PreAuthorize("@capEval.hasCap(authentication, 'cases:services.create')")
    public ResponseEntity<ApprovalRequestResponse> updateCaseServices(
            @PathVariable Long id,
            @RequestBody List<String> serviceKeys,
            @CurrentUser User currentUser,
            @RequestHeader(name = APPROVER_HEADER, required = false) Long approverId,
            @RequestHeader(name = APPROVAL_REASON_HEADER, required = false) String approvalReason
    ) {
        List<String> requestedServiceKeys = serviceKeys == null ? List.of() : serviceKeys;
        List<String> currentServiceKeys = caseService.listSelectedServiceKeys(id);
        List<String> addServiceKeys = requestedServiceKeys.stream()
                .filter(key -> !currentServiceKeys.contains(key))
                .toList();
        List<String> removeServiceKeys = currentServiceKeys.stream()
                .filter(key -> !requestedServiceKeys.contains(key))
                .toList();
        ApprovalRequestResponse approval = approvalService.createRequest(
                "CASE_SERVICE_UPDATE",
                "CASE",
                id,
                Map.of(
                        "caseId", id,
                        "operation", "update",
                        "serviceKeys", requestedServiceKeys,
                        "addServiceKeys", addServiceKeys,
                        "removeServiceKeys", removeServiceKeys
                ),
                currentUser,
                approverId,
                approvalReason
        );
        return ResponseEntity.status(HttpStatus.ACCEPTED).body(approval);
    }

    @GetMapping("/{id}/service-events")
    public ResponseEntity<List<ServiceEventResponse>> listServiceEvents(@PathVariable Long id) {
        return ResponseEntity.ok(caseService.listServiceEvents(id));
    }

    /** 读取 Google 共享日历在 [from, to] 区间内的事件(排除本 case 自己的,作为日历背景上下文)。 */
    @GetMapping("/{id}/calendar-events")
    public ResponseEntity<List<CalendarEventResponse>> listSharedCalendarEvents(
            @PathVariable Long id,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime from,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime to,
            Authentication authentication
    ) {
        if (!"ALL".equals(capEval.capScope(authentication, "reports:view"))) {
            return ResponseEntity.ok(List.of());
        }
        return ResponseEntity.ok(caseService.listSharedCalendarEvents(id, from, to));
    }

    @PostMapping("/{id}/service-events")
    @PreAuthorize("@capEval.hasCap(authentication, 'cases:services.create')")
    public ResponseEntity<ServiceEventResponse> createServiceEvent(
            @PathVariable Long id,
            @Valid @RequestBody CreateServiceEventRequest request,
            @CurrentUser User currentUser
    ) {
        return ResponseEntity.ok(caseService.createServiceEvent(id, request, currentUser));
    }

    @PatchMapping("/{id}/service-events/{eventId}")
    @PreAuthorize("@capEval.hasCap(authentication, 'cases:services.create')")
    public ResponseEntity<ServiceEventResponse> updateServiceEvent(
            @PathVariable Long id,
            @PathVariable Long eventId,
            @Valid @RequestBody CreateServiceEventRequest request,
            @CurrentUser User currentUser
    ) {
        return ResponseEntity.ok(caseService.updateServiceEvent(id, eventId, request, currentUser));
    }

    /** 手动重试将本地事件同步到 Google 共享日历(上次镜像失败时使用)。 */
    @PostMapping("/{id}/service-events/{eventId}/sync")
    @PreAuthorize("@capEval.hasCap(authentication, 'cases:services.create')")
    public ResponseEntity<ServiceEventResponse> syncServiceEvent(
            @PathVariable Long id,
            @PathVariable Long eventId
    ) {
        return ResponseEntity.ok(caseService.syncServiceEvent(id, eventId));
    }

    @DeleteMapping("/{id}/service-events/{eventId}")
    @PreAuthorize("@capEval.hasCap(authentication, 'cases:services.create')")
    public ResponseEntity<Void> deleteServiceEvent(
            @PathVariable Long id,
            @PathVariable Long eventId
    ) {
        caseService.deleteServiceEvent(id, eventId);
        return ResponseEntity.noContent().build();
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("@capEval.hasCap(authentication, 'cases:delete')")
    public ResponseEntity<ApprovalRequestResponse> deleteCase(
            @PathVariable Long id,
            @CurrentUser User currentUser,
            @RequestHeader(name = APPROVER_HEADER, required = false) Long approverId,
            @RequestHeader(name = APPROVAL_REASON_HEADER, required = false) String approvalReason
    ) {
        ApprovalRequestResponse approval = approvalService.createRequest(
                "DELETE_CASE",
                "CASE",
                id,
                null,
                currentUser,
                approverId,
                approvalReason
        );
        return ResponseEntity.status(HttpStatus.ACCEPTED).body(approval);
    }

}
