package aranya.crm.controller;

import aranya.crm.dto.request.CreateClientRequest;
import aranya.crm.dto.request.UpdateClientRequest;
import aranya.crm.dto.response.ApprovalRequestResponse;
import aranya.crm.dto.response.ClientDetailResponse;
import aranya.crm.dto.response.ClientSummaryResponse;
import aranya.crm.entity.User;
import aranya.crm.security.annotation.CurrentUser;
import aranya.crm.service.ApprovalService;
import aranya.crm.service.ClientService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import java.util.List;

@RestController
@RequestMapping("/api/v1/clients")
@RequiredArgsConstructor
@PreAuthorize("isAuthenticated()")
public class ClientController {
    private static final String APPROVER_HEADER = "X-Approver-Id";
    private static final String APPROVAL_REASON_HEADER = "X-Approval-Reason";

    private final ClientService clientService;
    private final ApprovalService approvalService;

    @GetMapping
    public ResponseEntity<List<ClientSummaryResponse>> listClients(
            @RequestParam(required = false) String q,
            @RequestParam(required = false) String membershipStatus
    ) {
        return ResponseEntity.ok(clientService.listClients(q, membershipStatus));
    }

    @GetMapping("/without-case")
    public ResponseEntity<List<ClientSummaryResponse>> listClientsWithoutCase() {
        return ResponseEntity.ok(clientService.listClientsWithoutCase());
    }

    @GetMapping("/{id}")
    public ResponseEntity<ClientDetailResponse> getClientDetail(@PathVariable Long id) {
        return ResponseEntity.ok(clientService.getClientDetail(id));
    }

    @PostMapping
    @PreAuthorize("@capEval.hasCap(authentication, 'clients:create')")
    public ResponseEntity<ApprovalRequestResponse> createClient(
            @Valid @RequestBody CreateClientRequest req,
            @CurrentUser User currentUser,
            @RequestHeader(name = APPROVER_HEADER, required = false) Long approverId,
            @RequestHeader(name = APPROVAL_REASON_HEADER, required = false) String approvalReason
    ) {
        ApprovalRequestResponse approval = approvalService.createRequest(
                "CLIENT_CREATE",
                "CLIENT",
                null,
                req,
                currentUser,
                approverId,
                approvalReason
        );
        return ResponseEntity.status(HttpStatus.ACCEPTED).body(approval);
    }

    @PatchMapping("/{id}")
    @PreAuthorize("@capEval.hasCap(authentication, 'clients:update')")
    public ResponseEntity<ApprovalRequestResponse> updateClient(
            @PathVariable Long id,
            @Valid @RequestBody UpdateClientRequest req,
            @CurrentUser User currentUser,
            @RequestHeader(name = APPROVER_HEADER, required = false) Long approverId,
            @RequestHeader(name = APPROVAL_REASON_HEADER, required = false) String approvalReason
    ) {
        ApprovalRequestResponse approval = approvalService.createRequest(
                "CLIENT_UPDATE",
                "CLIENT",
                id,
                req,
                currentUser,
                approverId,
                approvalReason
        );
        return ResponseEntity.status(HttpStatus.ACCEPTED).body(approval);
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("@capEval.hasCap(authentication, 'clients:delete')")
    public ResponseEntity<ApprovalRequestResponse> deleteClient(
            @PathVariable Long id,
            @CurrentUser User currentUser,
            @RequestHeader(name = APPROVER_HEADER, required = false) Long approverId,
            @RequestHeader(name = APPROVAL_REASON_HEADER, required = false) String approvalReason
    ) {
        ApprovalRequestResponse approval = approvalService.createRequest(
                "DELETE_CLIENT",
                "CLIENT",
                id,
                null,
                currentUser,
                approverId,
                approvalReason
        );
        return ResponseEntity.status(HttpStatus.ACCEPTED).body(approval);
    }
}
