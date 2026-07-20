package aranya.crm.service;

import aranya.crm.dto.response.AuditHistoryEntryResponse;
import aranya.crm.entity.ApprovalRequest;
import aranya.crm.entity.Client;
import aranya.crm.entity.ClientCase;
import aranya.crm.entity.OperationAuditLog;
import aranya.crm.entity.User;
import aranya.crm.repository.ApprovalRequestRepository;
import aranya.crm.repository.CaseRepository;
import aranya.crm.repository.OperationAuditLogRepository;
import com.fasterxml.jackson.databind.node.JsonNodeFactory;
import com.fasterxml.jackson.databind.node.ObjectNode;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class AuditHistoryServiceTest {

    @Mock
    private ApprovalRequestRepository approvalRequestRepository;

    @Mock
    private CaseRepository caseRepository;

    @Mock
    private OperationAuditLogRepository operationAuditLogRepository;

    @InjectMocks
    private AuditHistoryService auditHistoryService;

    @Test
    @DisplayName("listCaseAuditHistory returns approval-backed case history newest first")
    void listCaseAuditHistory_returnsApprovalBackedCaseHistoryNewestFirst() {
        ApprovalRequest older = request(8L, "CASE_SERVICE_UPDATE", "APPROVED", "CASE", 7L);
        older.setCreatedAt(LocalDateTime.of(2026, 7, 10, 9, 0));
        older.setDecidedAt(LocalDateTime.of(2026, 7, 10, 10, 0));
        older.setDecisionComment("Approved service change");
        older.setDecidedBy(user(20L, "Manager"));

        ApprovalRequest newer = request(9L, "DELETE_CASE", "PENDING", "CASE", 7L);
        newer.setCreatedAt(LocalDateTime.of(2026, 7, 10, 11, 0));

        when(caseRepository.findById(7L)).thenReturn(Optional.of(clientCase(7L, 3L)));
        when(approvalRequestRepository.findByTargetTypeAndTargetIdOrderByCreatedAtDescIdDesc("CASE", 7L))
                .thenReturn(List.of(newer, older));
        when(approvalRequestRepository.findByTargetTypeAndTargetIdOrderByCreatedAtDescIdDesc("CLIENT", 3L))
                .thenReturn(List.of());

        List<AuditHistoryEntryResponse> result = auditHistoryService.listCaseAuditHistory(7L);

        assertThat(result).extracting(AuditHistoryEntryResponse::getId).containsExactly("approval-9", "approval-8");
        assertThat(result.get(0).getAction()).isEqualTo("DELETE_CASE");
        assertThat(result.get(0).getDecisionStatus()).isEqualTo("pending");
        assertThat(result.get(0).getLifecycleStatus()).isEqualTo("active");
        assertThat(result.get(0).isCanEdit()).isFalse();
        assertThat(result.get(0).isCanDelete()).isFalse();
        assertThat(result.get(1).getDecisionStatus()).isEqualTo("approved");
        assertThat(result.get(1).getDecidedByName()).isEqualTo("Manager");
        assertThat(result.get(1).getReason()).isEqualTo("Need support module");
        assertThat(result.get(1).getMetadata()).containsEntry("addServiceKeys", "legalAid");
        assertThat(result.get(1).getMetadata()).containsEntry("removeServiceKeys", "mealDelivery");
    }

    @Test
    @DisplayName("listCaseAuditHistory maps sensitive file archive requests to archived lifecycle")
    void listCaseAuditHistory_mapsSensitiveFileArchiveLifecycle() {
        ApprovalRequest request = request(10L, "SENSITIVE_FILE_ARCHIVE", "APPROVED", "CASE", 7L);
        request.setCreatedAt(LocalDateTime.of(2026, 7, 10, 12, 0));

        when(caseRepository.findById(7L)).thenReturn(Optional.of(clientCase(7L, 3L)));
        when(approvalRequestRepository.findByTargetTypeAndTargetIdOrderByCreatedAtDescIdDesc("CASE", 7L))
                .thenReturn(List.of(request));
        when(approvalRequestRepository.findByTargetTypeAndTargetIdOrderByCreatedAtDescIdDesc("CLIENT", 3L))
                .thenReturn(List.of());

        List<AuditHistoryEntryResponse> result = auditHistoryService.listCaseAuditHistory(7L);

        assertThat(result).hasSize(1);
        assertThat(result.get(0).getLifecycleStatus()).isEqualTo("archived");
        assertThat(result.get(0).getTargetType()).isEqualTo("CASE");
    }

    @Test
    @DisplayName("listCaseAuditHistory includes approvals for the case member")
    void listCaseAuditHistory_includesCaseMemberApprovals() {
        ApprovalRequest clientUpdate = request(11L, "CLIENT_UPDATE", "APPROVED", "CLIENT", 3L);
        clientUpdate.setCreatedAt(LocalDateTime.of(2026, 7, 10, 13, 0));

        when(caseRepository.findById(7L)).thenReturn(Optional.of(clientCase(7L, 3L)));
        when(approvalRequestRepository.findByTargetTypeAndTargetIdOrderByCreatedAtDescIdDesc("CASE", 7L))
                .thenReturn(List.of());
        when(approvalRequestRepository.findByTargetTypeAndTargetIdOrderByCreatedAtDescIdDesc("CLIENT", 3L))
                .thenReturn(List.of(clientUpdate));

        List<AuditHistoryEntryResponse> result = auditHistoryService.listCaseAuditHistory(7L);

        assertThat(result).hasSize(1);
        assertThat(result.get(0).getAction()).isEqualTo("CLIENT_UPDATE");
        assertThat(result.get(0).getTargetType()).isEqualTo("CLIENT");
        assertThat(result.get(0).getCaseId()).isEqualTo(7L);
    }

    @Test
    @DisplayName("listCaseAuditHistory combines business operations with approval history")
    void listCaseAuditHistory_combinesBusinessOperationsAndApprovals() {
        ClientCase clientCase = clientCase(7L, 3L);
        OperationAuditLog operation = new OperationAuditLog();
        operation.setId(12L);
        operation.setClientCase(clientCase);
        operation.setActorName("Case Worker");
        operation.setAction("CASE_UPDATED");
        operation.setTargetType("CASE");
        operation.setTargetId("7");
        operation.setTargetLabel("CASE-007");
        operation.setSummary("修改个案资料");
        operation.setBeforeJson("{\"status\":\"OPEN\"}");
        operation.setAfterJson("{\"status\":\"CLOSED\"}");
        operation.setOccurredAt(LocalDateTime.of(2026, 7, 10, 14, 0));

        when(caseRepository.findById(7L)).thenReturn(Optional.of(clientCase));
        when(approvalRequestRepository.findByTargetTypeAndTargetIdOrderByCreatedAtDescIdDesc("CASE", 7L)).thenReturn(List.of());
        when(approvalRequestRepository.findByTargetTypeAndTargetIdOrderByCreatedAtDescIdDesc("CLIENT", 3L)).thenReturn(List.of());
        when(operationAuditLogRepository.findByClientCaseIdOrderByOccurredAtDescIdDesc(7L)).thenReturn(List.of(operation));

        List<AuditHistoryEntryResponse> result = auditHistoryService.listCaseAuditHistory(7L);

        assertThat(result).hasSize(1);
        assertThat(result.get(0).getAction()).isEqualTo("CASE_UPDATED");
        assertThat(result.get(0).isApprovalRequired()).isFalse();
        assertThat(result.get(0).getActorName()).isEqualTo("Case Worker");
        assertThat(result.get(0).getBeforeValue()).contains("OPEN");
    }

    @Test
    @DisplayName("social worker audit history contains only operations involving that user")
    void listCaseAuditHistory_filtersToCurrentUser() {
        ClientCase clientCase = clientCase(7L, 3L);
        ApprovalRequest ownApproval = request(20L, "CASE_SERVICE_UPDATE", "PENDING", "CASE", 7L);
        ownApproval.setRequestedBy(user(10L, "Current Social Worker"));
        ApprovalRequest otherApproval = request(21L, "DELETE_CASE", "PENDING", "CASE", 7L);
        otherApproval.setRequestedBy(user(11L, "Other Social Worker"));

        OperationAuditLog ownOperation = new OperationAuditLog();
        ownOperation.setId(30L);
        ownOperation.setClientCase(clientCase);
        ownOperation.setActor(user(10L, "Current Social Worker"));
        ownOperation.setActorName("Current Social Worker");
        ownOperation.setAction("CASE_UPDATED");
        ownOperation.setTargetType("CASE");
        ownOperation.setTargetId("7");
        ownOperation.setTargetLabel("CASE-007");
        ownOperation.setSummary("Updated case");
        ownOperation.setOccurredAt(LocalDateTime.of(2026, 7, 10, 15, 0));

        when(caseRepository.findById(7L)).thenReturn(Optional.of(clientCase));
        when(approvalRequestRepository.findByTargetTypeAndTargetIdOrderByCreatedAtDescIdDesc("CASE", 7L))
                .thenReturn(List.of(otherApproval, ownApproval));
        when(approvalRequestRepository.findByTargetTypeAndTargetIdOrderByCreatedAtDescIdDesc("CLIENT", 3L))
                .thenReturn(List.of());
        when(operationAuditLogRepository.findByClientCaseIdAndActorIdOrderByOccurredAtDescIdDesc(7L, 10L))
                .thenReturn(List.of(ownOperation));

        List<AuditHistoryEntryResponse> result = auditHistoryService.listCaseAuditHistory(7L, 10L, false);

        assertThat(result).extracting(AuditHistoryEntryResponse::getId)
                .containsExactly("operation-30", "approval-20");
    }

    private ApprovalRequest request(Long id, String type, String status, String targetType, Long targetId) {
        ObjectNode payload = JsonNodeFactory.instance.objectNode();
        payload.put("caseId", targetId);
        payload.putArray("addServiceKeys").add("legalAid");
        payload.putArray("removeServiceKeys").add("mealDelivery");
        ObjectNode approval = payload.putObject("_approval");
        approval.put("reason", "Need support module");

        ApprovalRequest request = new ApprovalRequest();
        request.setId(id);
        request.setType(type);
        request.setStatus(status);
        request.setTargetType(targetType);
        request.setTargetId(targetId);
        request.setRequestedBy(user(10L, "Requester"));
        request.setPayloadJson(payload);
        request.setCreatedAt(LocalDateTime.of(2026, 7, 10, 9, 0));
        return request;
    }

    private User user(Long id, String fullName) {
        User user = new User();
        user.setId(id);
        user.setFullName(fullName);
        return user;
    }

    private ClientCase clientCase(Long caseId, Long clientId) {
        Client client = new Client();
        client.setId(clientId);
        ClientCase clientCase = new ClientCase();
        clientCase.setId(caseId);
        clientCase.setClient(client);
        return clientCase;
    }
}
