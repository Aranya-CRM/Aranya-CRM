package aranya.crm.service;

import aranya.crm.dto.response.AuditHistoryEntryResponse;
import aranya.crm.entity.ApprovalRequest;
import aranya.crm.entity.ClientCase;
import aranya.crm.entity.OperationAuditLog;
import aranya.crm.entity.User;
import aranya.crm.repository.ApprovalRequestRepository;
import aranya.crm.repository.CaseRepository;
import aranya.crm.repository.OperationAuditLogRepository;
import com.fasterxml.jackson.databind.JsonNode;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.LinkedHashMap;
import java.util.Comparator;
import java.util.List;
import java.util.Locale;
import java.util.Map;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class AuditHistoryService {

    private static final String CASE_TARGET = "CASE";
    private static final String CLIENT_TARGET = "CLIENT";

    private final ApprovalRequestRepository approvalRequestRepository;
    private final CaseRepository caseRepository;
    private final OperationAuditLogRepository operationAuditLogRepository;

    public List<AuditHistoryEntryResponse> listCaseAuditHistory(Long caseId) {
        ClientCase clientCase = caseRepository.findById(caseId)
                .orElseThrow(() -> new jakarta.persistence.EntityNotFoundException("Case not found: " + caseId));
        Long clientId = clientCase.getClient() != null ? clientCase.getClient().getId() : null;

        List<ApprovalRequest> caseApprovals = approvalRequestRepository.findByTargetTypeAndTargetIdOrderByCreatedAtDescIdDesc(CASE_TARGET, caseId);
        List<ApprovalRequest> clientApprovals = clientId == null
                ? List.of()
                : approvalRequestRepository.findByTargetTypeAndTargetIdOrderByCreatedAtDescIdDesc(CLIENT_TARGET, clientId);

        List<AuditHistoryEntryResponse> approvalEntries = java.util.stream.Stream.concat(caseApprovals.stream(), clientApprovals.stream())
                .sorted(Comparator
                        .comparing((ApprovalRequest request) -> request.getCreatedAt() == null ? LocalDateTime.MIN : request.getCreatedAt())
                        .reversed()
                        .thenComparing(ApprovalRequest::getId, Comparator.nullsLast(Comparator.reverseOrder())))
                .map(request -> toResponse(request, caseId))
                .toList();
        List<AuditHistoryEntryResponse> operationEntries = operationAuditLogRepository
                .findByClientCaseIdOrderByOccurredAtDescIdDesc(caseId).stream()
                .map(this::toResponse)
                .toList();

        return java.util.stream.Stream.concat(operationEntries.stream(), approvalEntries.stream())
                .sorted(Comparator
                        .comparing((AuditHistoryEntryResponse entry) -> entry.getOccurredAt() == null ? LocalDateTime.MIN : entry.getOccurredAt())
                        .reversed()
                        .thenComparing(AuditHistoryEntryResponse::getId))
                .toList();
    }

    private AuditHistoryEntryResponse toResponse(OperationAuditLog log) {
        return AuditHistoryEntryResponse.builder()
                .id("operation-" + log.getId())
                .action(log.getAction())
                .targetType(log.getTargetType())
                .targetId(parseLong(log.getTargetId()))
                .caseId(log.getClientCase().getId())
                .targetLabel(log.getTargetLabel())
                .actorName(log.getActorName())
                .occurredAt(log.getOccurredAt())
                .approvalRequired(false)
                .lifecycleStatus("active")
                .decisionStatus("not_required")
                .summary(log.getSummary())
                .reason(log.getReason())
                .approvalRequestId(log.getApprovalRequestId() == null ? null : String.valueOf(log.getApprovalRequestId()))
                .beforeValue(log.getBeforeJson())
                .afterValue(log.getAfterJson())
                .result(log.getResult())
                .source(log.getSource())
                .metadata(Map.of())
                .canEdit(false)
                .canDelete(false)
                .build();
    }

    private AuditHistoryEntryResponse toResponse(ApprovalRequest request, Long caseId) {
        User requestedBy = request.getRequestedBy();
        User decidedBy = request.getDecidedBy();
        String decisionStatus = normalizeStatus(request.getStatus());
        String lifecycleStatus = lifecycleStatus(request);
        LocalDateTime occurredAt = request.getDecidedAt() != null ? request.getDecidedAt() : request.getCreatedAt();
        String actorName = decidedBy != null ? decidedBy.getFullName() : requestedBy != null ? requestedBy.getFullName() : "-";

        return AuditHistoryEntryResponse.builder()
                .id("approval-" + request.getId())
                .action(request.getType())
                .targetType(request.getTargetType())
                .targetId(request.getTargetId())
                .caseId(caseId)
                .targetLabel(targetLabel(request))
                .actorName(actorName)
                .occurredAt(occurredAt)
                .approvalRequired(true)
                .lifecycleStatus(lifecycleStatus)
                .decisionStatus(decisionStatus)
                .summary(summary(request, decisionStatus, lifecycleStatus))
                .reason(approvalReason(request.getPayloadJson()))
                .requestedByName(requestedBy != null ? requestedBy.getFullName() : null)
                .requestedAt(request.getCreatedAt())
                .decidedByName(decidedBy != null ? decidedBy.getFullName() : null)
                .decidedAt(request.getDecidedAt())
                .approvalRequestId(String.valueOf(request.getId()))
                .version(readInteger(request.getPayloadJson(), "version"))
                .previousVersionId(readText(request.getPayloadJson(), "previousVersionId"))
                .metadata(metadata(request))
                .result("SUCCESS")
                .source("WEB")
                .canEdit(false)
                .canDelete(false)
                .build();
    }

    private Long parseLong(String value) {
        if (value == null) return null;
        try {
            return Long.valueOf(value);
        } catch (NumberFormatException ignored) {
            return null;
        }
    }

    private String lifecycleStatus(ApprovalRequest request) {
        String type = normalizeType(request.getType());
        if (type.contains("SUPERSEDE")) return "superseded";
        if (type.contains("RESTORE")) return "restored";
        if (type.contains("ARCHIVE") || type.startsWith("DELETE_")) return "archived";
        return "active";
    }

    private String summary(ApprovalRequest request, String decisionStatus, String lifecycleStatus) {
        return switch (normalizeType(request.getType())) {
            case "CASE_SERVICE_UPDATE" -> "服务模块变更审批" + decisionText(decisionStatus);
            case "DELETE_CASE" -> "个案归档审批" + decisionText(decisionStatus);
            case "RESTORE_CASE" -> "个案恢复审批" + decisionText(decisionStatus);
            case "DELETE_CLIENT" -> "会员档案归档审批" + decisionText(decisionStatus);
            case "RESTORE_CLIENT" -> "会员档案恢复审批" + decisionText(decisionStatus);
            case "DELETE_REPORT" -> "报告作废审批" + decisionText(decisionStatus);
            case "CASE_CREATE" -> "创建个案审批" + decisionText(decisionStatus);
            case "CLIENT_CREATE" -> "创建会员档案审批" + decisionText(decisionStatus);
            case "CLIENT_UPDATE" -> "会员档案变更审批" + decisionText(decisionStatus);
            case "SENSITIVE_FILE_ARCHIVE" -> "敏感文件归档审批" + decisionText(decisionStatus);
            case "SENSITIVE_FILE_RESTORE" -> "敏感文件恢复审批" + decisionText(decisionStatus);
            case "SENSITIVE_FILE_SUPERSEDE" -> "敏感文件版本替代审批" + decisionText(decisionStatus);
            case "SENSITIVE_FILE_VERSION_CREATE" -> "敏感文件新版本审批" + decisionText(decisionStatus);
            default -> request.getType() + " 审批" + decisionText(decisionStatus);
        };
    }

    private String decisionText(String decisionStatus) {
        return switch (decisionStatus) {
            case "pending" -> "待处理";
            case "approved" -> "已批准";
            case "rejected" -> "已拒绝";
            case "expired" -> "已过期";
            default -> "";
        };
    }

    private String targetLabel(ApprovalRequest request) {
        String label = readText(request.getPayloadJson(), "targetLabel");
        if (label != null && !label.isBlank()) return label;
        return (request.getTargetType() == null ? "TARGET" : request.getTargetType()) + " #" + request.getTargetId();
    }

    private Map<String, String> metadata(ApprovalRequest request) {
        Map<String, String> result = new LinkedHashMap<>();
        String type = normalizeType(request.getType());
        copyArrayMetadata(request.getPayloadJson(), result, "addServiceKeys");
        copyArrayMetadata(request.getPayloadJson(), result, "removeServiceKeys");
        copyArrayMetadata(request.getPayloadJson(), result, "serviceKeys");
        copyTextMetadata(request.getPayloadJson(), result, "fileName");
        copyTextMetadata(request.getPayloadJson(), result, "documentName");
        copyTextMetadata(request.getPayloadJson(), result, "targetLabel");
        if (type.startsWith("SENSITIVE_FILE_")) {
            result.put("storagePolicy", type.contains("SUPERSEDE") ? "version_controlled" : "retain_object");
            result.put("bucketAction", "none");
        }
        String decisionComment = request.getDecisionComment();
        if (decisionComment != null && !decisionComment.isBlank()) {
            result.put("decisionComment", decisionComment.trim());
        }
        return result;
    }

    private void copyTextMetadata(JsonNode payload, Map<String, String> result, String fieldName) {
        String value = readText(payload, fieldName);
        if (value != null && !value.isBlank()) {
            result.put(fieldName, value);
        }
    }

    private void copyArrayMetadata(JsonNode payload, Map<String, String> result, String fieldName) {
        JsonNode value = payload == null ? null : payload.path(fieldName);
        if (value == null || !value.isArray() || value.isEmpty()) return;
        StringBuilder joined = new StringBuilder();
        value.forEach(item -> {
            if (!item.isTextual()) return;
            String text = item.asText().trim();
            if (text.isBlank()) return;
            if (joined.length() > 0) joined.append(',');
            joined.append(text);
        });
        if (joined.length() > 0) {
            result.put(fieldName, joined.toString());
        }
    }

    private String approvalReason(JsonNode payload) {
        JsonNode reason = payload == null ? null : payload.path("_approval").path("reason");
        if (reason == null || !reason.isTextual()) return null;
        String value = reason.asText().trim();
        return value.isBlank() ? null : value;
    }

    private Integer readInteger(JsonNode payload, String fieldName) {
        JsonNode value = payload == null ? null : payload.path(fieldName);
        return value != null && value.isInt() ? value.asInt() : null;
    }

    private String readText(JsonNode payload, String fieldName) {
        JsonNode value = payload == null ? null : payload.path(fieldName);
        if (value == null || !value.isTextual()) return null;
        String text = value.asText().trim();
        return text.isBlank() ? null : text;
    }

    private String normalizeStatus(String status) {
        if (status == null || status.isBlank()) return "pending";
        return status.trim().toLowerCase(Locale.ROOT);
    }

    private String normalizeType(String type) {
        return type == null ? "" : type.trim().toUpperCase(Locale.ROOT);
    }
}
