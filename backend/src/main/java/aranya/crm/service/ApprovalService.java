package aranya.crm.service;

import aranya.crm.dto.response.ApprovalRequestResponse;
import aranya.crm.entity.ApprovalRequest;
import aranya.crm.entity.User;
import aranya.crm.repository.ApprovalRequestRepository;
import aranya.crm.repository.UserRepository;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ObjectNode;
import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.net.URLDecoder;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.time.LocalDateTime;
import java.util.List;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class ApprovalService {

    private static final String STATUS_PENDING = "PENDING";
    private static final String STATUS_APPROVED = "APPROVED";
    private static final String STATUS_REJECTED = "REJECTED";
    private static final String STATUS_EXPIRED = "EXPIRED";
    /** 建案(转为个案/创建个案)审批必须在此天数内有结果,否则自动过期。 */
    private static final int CASE_CREATE_APPROVAL_TTL_DAYS = 30;
    private static final String CASE_CREATE_TYPE = "CASE_CREATE";
    private static final String EXPIRED_COMMENT =
            "Auto-expired: no decision within " + CASE_CREATE_APPROVAL_TTL_DAYS + " days";
    private static final String APPROVAL_META_FIELD = "_approval";
    private static final String ASSIGNED_APPROVER_ID_FIELD = "assignedApproverId";
    private static final String REASON_FIELD = "reason";

    private final ApprovalRequestRepository approvalRequestRepository;
    private final ObjectMapper objectMapper;
    private final ApprovalActionRegistry approvalActionRegistry;
    private final JdbcTemplate jdbcTemplate;
    private final UserRepository userRepository;

    @Transactional
    public ApprovalRequestResponse createRequest(
            String type,
            String targetType,
            Long targetId,
            Object payload,
            User requestedBy
    ) {
        return createRequest(type, targetType, targetId, payload, requestedBy, null);
    }

    @Transactional
    public ApprovalRequestResponse createRequest(
            String type,
            String targetType,
            Long targetId,
            Object payload,
            User requestedBy,
            Long assignedApproverId
    ) {
        return createRequest(type, targetType, targetId, payload, requestedBy, assignedApproverId, null);
    }

    @Transactional
    public ApprovalRequestResponse createRequest(
            String type,
            String targetType,
            Long targetId,
            Object payload,
            User requestedBy,
            Long assignedApproverId,
            String reason
    ) {
        requireUser(requestedBy, "Requester is required");
        User requester = loadUserWithRoles(requestedBy);
        String normalizedType = normalizeRequired(type, "Approval type is required");
        if (!approvalActionRegistry.supports(normalizedType)) {
            throw new IllegalArgumentException("Unsupported approval type: " + normalizedType);
        }
        String normalizedTargetType = normalizeOptional(targetType);
        JsonNode payloadJson = parsePayload(payload);
        String normalizedReason = decodeHeaderValue(reason);
        if (assignedApproverId != null || normalizedReason != null) {
            payloadJson = withApprovalMeta(normalizedType, payloadJson, requester, assignedApproverId, normalizedReason);
        }
        String idempotencyKey = buildIdempotencyKey(
                normalizedType,
                normalizedTargetType,
                targetId,
                payloadJson,
                requester
        );

        ApprovalRequest existing = approvalRequestRepository
                .findFirstByStatusAndIdempotencyKeyOrderByCreatedAtAscIdAsc(STATUS_PENDING, idempotencyKey)
                .orElse(null);
        if (existing != null) {
            return toResponse(existing);
        }

        ApprovalRequest request = new ApprovalRequest();
        request.setType(normalizedType);
        request.setStatus(STATUS_PENDING);
        request.setTargetType(normalizedTargetType);
        request.setTargetId(targetId);
        request.setPayloadJson(payloadJson);
        request.setIdempotencyKey(idempotencyKey);
        request.setRequestedBy(requester);
        // 建案审批设 30 天时限;超时未决由定时任务/决策前校验自动过期
        if (CASE_CREATE_TYPE.equals(normalizedType)) {
            request.setExpiresAt(LocalDateTime.now().plusDays(CASE_CREATE_APPROVAL_TTL_DAYS));
        }

        try {
            return toResponse(approvalRequestRepository.save(request));
        } catch (DataIntegrityViolationException ex) {
            return approvalRequestRepository
                    .findFirstByStatusAndIdempotencyKeyOrderByCreatedAtAscIdAsc(STATUS_PENDING, idempotencyKey)
                    .map(this::toResponse)
                    .orElseThrow(() -> ex);
        }
    }

    public List<ApprovalRequestResponse> listPending(User currentUser) {
        requireUser(currentUser, "Current user is required");
        User viewer = loadUserWithRoles(currentUser);
        return approvalRequestRepository.findByStatusOrderByCreatedAtAscIdAsc(STATUS_PENDING).stream()
                .filter((request) -> canViewPendingRequest(request, viewer))
                .map(this::toResponse)
                .toList();
    }

    public boolean hasPendingRequest(String type, String targetType, Long targetId) {
        if (type == null || targetType == null || targetId == null) return false;
        return approvalRequestRepository.existsByStatusAndTypeAndTargetTypeAndTargetId(
                STATUS_PENDING,
                normalizeRequired(type, "Approval type is required"),
                normalizeRequired(targetType, "Target type is required"),
                targetId
        );
    }

    @Transactional
    public ApprovalRequestResponse approve(Long approvalId, User decidedBy, String comment) {
        return decide(approvalId, decidedBy, STATUS_APPROVED, comment);
    }

    @Transactional
    public ApprovalRequestResponse reject(Long approvalId, User decidedBy, String comment) {
        return decide(approvalId, decidedBy, STATUS_REJECTED, comment);
    }

    private ApprovalRequestResponse decide(Long approvalId, User decidedBy, String decisionStatus, String comment) {
        requireUser(decidedBy, "Decision user is required");
        User decisionUser = loadUserWithRoles(decidedBy);
        ApprovalRequest request = approvalRequestRepository.findById(approvalId)
                .orElseThrow(() -> new EntityNotFoundException("Approval request not found: " + approvalId));
        requirePending(request);
        requireNotExpired(request);
        requireAllowedDecisionUser(request, decisionUser);

        request.setStatus(decisionStatus);
        request.setDecidedBy(decisionUser);
        request.setDecisionComment(normalizeOptional(comment));
        request.setDecidedAt(LocalDateTime.now());
        if (STATUS_APPROVED.equals(decisionStatus)) {
            approvalActionRegistry.execute(request, decisionUser);
        }
        return toResponse(request);
    }

    private User loadUserWithRoles(User user) {
        return userRepository.findByIdWithRoles(user.getId())
                .orElseThrow(() -> new AccessDeniedException("Current user not found"));
    }

    private JsonNode withApprovalMeta(
            String approvalType,
            JsonNode payloadJson,
            User requestedBy,
            Long assignedApproverId,
            String reason
    ) {
        ObjectNode objectPayload;
        if (payloadJson == null || payloadJson.isNull()) {
            objectPayload = objectMapper.createObjectNode();
        } else if (payloadJson.isObject()) {
            objectPayload = payloadJson.deepCopy();
        } else {
            throw new IllegalArgumentException("Approval payload must be a JSON object");
        }

        ObjectNode meta = objectPayload.path(APPROVAL_META_FIELD).isObject()
                ? (ObjectNode) objectPayload.path(APPROVAL_META_FIELD).deepCopy()
                : objectMapper.createObjectNode();
        if (assignedApproverId != null) {
            User assignedApprover = userRepository.findByIdWithRoles(assignedApproverId)
                    .orElseThrow(() -> new EntityNotFoundException("Assigned approver not found: " + assignedApproverId));
            requireValidAssignedApprover(approvalType, objectPayload, requestedBy, assignedApprover);
            meta.put(ASSIGNED_APPROVER_ID_FIELD, assignedApprover.getId());
        }
        if (reason != null) {
            meta.put(REASON_FIELD, reason);
        }
        objectPayload.set(APPROVAL_META_FIELD, meta);
        return objectPayload;
    }

    private void requireValidAssignedApprover(
            String approvalType,
            JsonNode payloadJson,
            User requestedBy,
            User assignedApprover
    ) {
        boolean assignedToSelf = assignedApprover.getId().equals(requestedBy.getId());
        if (assignedToSelf && !canManagerSelfApprove(approvalType, payloadJson, requestedBy)) {
            throw new AccessDeniedException("Requester cannot approve their own request");
        }
        if (!"ACTIVE".equals(assignedApprover.getStatus())) {
            throw new AccessDeniedException("Assigned approver must be active");
        }

        boolean requesterIsManager = isApprovalManager(requestedBy);
        boolean requesterIsSocialWorker = hasRole(requestedBy, "SOCIAL_WORKER");
        boolean approverIsManager = isApprovalManager(assignedApprover);

        if ("CASE_SERVICE_UPDATE".equals(approvalType)
                && requesterIsSocialWorker
                && hasRole(assignedApprover, "SOCIAL_WORKER")
                && isCasePrimaryApprover(payloadJson, assignedApprover)) {
            return;
        }
        if (requesterIsManager && !approverIsManager) {
            throw new AccessDeniedException("Managers can only assign approvals to another manager");
        }
        if (!requesterIsManager && requesterIsSocialWorker && !approverIsManager) {
            throw new AccessDeniedException("Social workers can only assign approvals to a manager");
        }
        if (!requesterIsManager && !requesterIsSocialWorker) {
            throw new AccessDeniedException("Requester role cannot assign approval");
        }
    }

    private void requireAllowedDecisionUser(ApprovalRequest request, User decidedBy) {
        User requestedBy = request.getRequestedBy();
        Long assignedApproverId = readAssignedApproverId(request);
        if (requestedBy != null && requestedBy.getId() != null && requestedBy.getId().equals(decidedBy.getId())) {
            if (!decidedBy.getId().equals(assignedApproverId)
                    || !canManagerSelfApprove(request.getType(), request.getPayloadJson(), decidedBy)) {
                throw new AccessDeniedException("Requester cannot approve their own request");
            }
        }

        if (assignedApproverId != null && !assignedApproverId.equals(decidedBy.getId())) {
            throw new AccessDeniedException("Only the assigned approver can decide this request");
        }
    }

    private boolean canViewPendingRequest(ApprovalRequest request, User currentUser) {
        User requestedBy = request.getRequestedBy();
        if (requestedBy != null && requestedBy.getId() != null && requestedBy.getId().equals(currentUser.getId())) {
            return true;
        }

        Long assignedApproverId = readAssignedApproverId(request);
        if (assignedApproverId != null && assignedApproverId.equals(currentUser.getId())) {
            return true;
        }

        if (canViewPendingTarget(request, currentUser)) {
            return true;
        }

        return isApprovalManager(currentUser) && assignedApproverId == null;
    }

    private boolean canViewPendingTarget(ApprovalRequest request, User currentUser) {
        String type = request.getType();
        if ("CLIENT_CREATE".equals(type) || "CLIENT_UPDATE".equals(type) || "DELETE_CLIENT".equals(type) || "RESTORE_CLIENT".equals(type)) {
            return canViewClients(currentUser);
        }
        if ("CASE_CREATE".equals(type)) {
            return canViewCases(currentUser) || canViewClients(currentUser);
        }
        if ("DELETE_CASE".equals(type) || "RESTORE_CASE".equals(type) || "CASE_SERVICE_UPDATE".equals(type)) {
            return canViewCases(currentUser);
        }
        return false;
    }

    private boolean canViewClients(User user) {
        return hasAnyRole(user, "MANAGER", "ADMIN", "FULL_MANAGER", "TEAM_LEAD", "VIEW_MANAGER", "SOCIAL_WORKER");
    }

    private boolean canViewCases(User user) {
        return hasAnyRole(user, "MANAGER", "ADMIN", "FULL_MANAGER", "TEAM_LEAD", "VIEW_MANAGER", "SOCIAL_WORKER");
    }

    private boolean isCasePrimaryApprover(JsonNode payloadJson, User assignedApprover) {
        if (payloadJson == null || assignedApprover == null || assignedApprover.getId() == null) {
            return false;
        }
        JsonNode caseIdNode = payloadJson.path("caseId");
        if (!caseIdNode.canConvertToLong()) {
            return false;
        }
        Long caseId = caseIdNode.asLong();
        Integer activePrimaryCount = jdbcTemplate.queryForObject("""
                SELECT COUNT(*)
                FROM case_assignment
                WHERE case_id = ?
                  AND user_id = ?
                  AND is_primary = true
                  AND UPPER(status) = 'ACTIVE'
                """, Integer.class, caseId, assignedApprover.getId());
        if (activePrimaryCount != null && activePrimaryCount > 0) {
            return true;
        }
        Integer fallbackCreatedByCount = jdbcTemplate.queryForObject("""
                SELECT COUNT(*)
                FROM "case" c
                WHERE c.id = ?
                  AND c.created_by = ?
                  AND NOT EXISTS (
                      SELECT 1
                      FROM case_assignment ca
                      WHERE ca.case_id = c.id
                        AND ca.is_primary = true
                        AND UPPER(ca.status) = 'ACTIVE'
                  )
                """, Integer.class, caseId, assignedApprover.getId());
        return fallbackCreatedByCount != null && fallbackCreatedByCount > 0;
    }

    private boolean hasAnyRole(User user, String... roleNames) {
        for (String roleName : roleNames) {
            if (hasRole(user, roleName)) {
                return true;
            }
        }
        return false;
    }

    private Long readAssignedApproverId(ApprovalRequest request) {
        JsonNode payloadJson = request.getPayloadJson();
        if (payloadJson == null) {
            return null;
        }
        JsonNode approverNode = payloadJson.path(APPROVAL_META_FIELD).path(ASSIGNED_APPROVER_ID_FIELD);
        if (!approverNode.canConvertToLong()) {
            return null;
        }
        return approverNode.asLong();
    }

    private boolean hasRole(User user, String roleName) {
        if (user == null || user.getUserRoles() == null) {
            return false;
        }
        return user.getUserRoles().stream()
                .anyMatch((userRole) -> userRole.getRole() != null && roleName.equals(userRole.getRole().getName()));
    }

    private boolean isApprovalManager(User user) {
        return hasRole(user, "MANAGER") || hasRole(user, "ADMIN") || hasRole(user, "FULL_MANAGER") || hasRole(user, "TEAM_LEAD");
    }

    private boolean canManagerSelfApprove(String approvalType, JsonNode payloadJson, User user) {
        if (!isApprovalManager(user)) {
            return false;
        }
        if ("CASE_CREATE".equals(approvalType)
                || "CLIENT_CREATE".equals(approvalType)
                || "RESTORE_CASE".equals(approvalType)
                || "RESTORE_CLIENT".equals(approvalType)) {
            return true;
        }
        if (!"CASE_SERVICE_UPDATE".equals(approvalType)) {
            return false;
        }
        JsonNode addServiceKeys = payloadJson == null ? null : payloadJson.path("addServiceKeys");
        JsonNode removeServiceKeys = payloadJson == null ? null : payloadJson.path("removeServiceKeys");
        return addServiceKeys != null
                && addServiceKeys.isArray()
                && addServiceKeys.size() > 0
                && (removeServiceKeys == null || !removeServiceKeys.isArray() || removeServiceKeys.size() == 0);
    }

    private void requirePending(ApprovalRequest request) {
        if (!STATUS_PENDING.equals(request.getStatus())) {
            throw new IllegalStateException("Only pending approval requests can be decided");
        }
    }

    /** 决策前兜底:若已过时限则立即置为 EXPIRED 并拒绝本次决策(避免定时任务的空窗期内被批准)。 */
    private void requireNotExpired(ApprovalRequest request) {
        LocalDateTime expiresAt = request.getExpiresAt();
        if (expiresAt != null && LocalDateTime.now().isAfter(expiresAt)) {
            request.setStatus(STATUS_EXPIRED);
            request.setDecidedAt(LocalDateTime.now());
            request.setDecisionComment(EXPIRED_COMMENT);
            approvalRequestRepository.save(request);
            throw new IllegalStateException("Approval request has expired and can no longer be decided");
        }
    }

    /**
     * 批量过期:把所有已过时限仍处于 PENDING 的申请置为 EXPIRED。
     * 由定时任务(ApprovalExpiryScheduler)周期性调用。
     * @return 本次过期的申请数量
     */
    @Transactional
    public int expireOverdue() {
        return jdbcTemplate.update(
                "UPDATE approval_request SET status = ?, decided_at = CURRENT_TIMESTAMP, decision_comment = ? "
                        + "WHERE status = ? AND expires_at IS NOT NULL AND expires_at < CURRENT_TIMESTAMP",
                STATUS_EXPIRED, EXPIRED_COMMENT, STATUS_PENDING);
    }

    private void requireUser(User user, String message) {
        if (user == null || user.getId() == null) {
            throw new AccessDeniedException(message);
        }
    }

    private JsonNode parsePayload(Object payload) {
        if (payload == null) {
            return objectMapper.createObjectNode();
        }
        if (payload instanceof String rawPayload) {
            String normalized = normalizeOptional(rawPayload);
            if (normalized == null) {
                return objectMapper.createObjectNode();
            }
            return readJson(normalized);
        }
        try {
            return objectMapper.valueToTree(payload);
        } catch (IllegalArgumentException ex) {
            throw new IllegalArgumentException("Approval payload must be valid JSON", ex);
        }
    }

    private JsonNode readJson(String json) {
        try {
            return objectMapper.readTree(json);
        } catch (JsonProcessingException ex) {
            throw new IllegalArgumentException("Approval payload must be valid JSON", ex);
        }
    }

    private String normalizeRequired(String value, String message) {
        String normalized = normalizeOptional(value);
        if (normalized == null) {
            throw new IllegalArgumentException(message);
        }
        return normalized;
    }

    private String normalizeOptional(String value) {
        return value == null || value.isBlank() ? null : value.trim();
    }

    private String decodeHeaderValue(String value) {
        String normalized = normalizeOptional(value);
        if (normalized == null) {
            return null;
        }
        try {
            return normalizeOptional(URLDecoder.decode(normalized, StandardCharsets.UTF_8));
        } catch (IllegalArgumentException ex) {
            return normalized;
        }
    }

    private String buildIdempotencyKey(
            String type,
            String targetType,
            Long targetId,
            JsonNode payloadJson,
            User requestedBy
    ) {
        String seed = type
                + "|"
                + (targetType == null ? "" : targetType)
                + "|"
                + (targetId == null ? "" : targetId)
                + "|"
                + requestedBy.getId()
                + "|"
                + payloadJson.toString();
        return sha256(seed);
    }

    private String sha256(String value) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            byte[] hash = digest.digest(value.getBytes(StandardCharsets.UTF_8));
            StringBuilder hex = new StringBuilder(hash.length * 2);
            for (byte b : hash) {
                hex.append(String.format("%02x", b));
            }
            return hex.toString();
        } catch (NoSuchAlgorithmException ex) {
            throw new IllegalStateException("SHA-256 is not available", ex);
        }
    }

    private ApprovalRequestResponse toResponse(ApprovalRequest request) {
        User requestedBy = request.getRequestedBy();
        User decidedBy = request.getDecidedBy();
        Long assignedApproverId = readAssignedApproverId(request);
        return ApprovalRequestResponse.builder()
                .id(request.getId())
                .type(request.getType())
                .status(request.getStatus())
                .targetType(request.getTargetType())
                .targetId(request.getTargetId())
                .targetLabel(resolveTargetLabel(request))
                .payloadJson(request.getPayloadJson() != null ? request.getPayloadJson().toString() : "{}")
                .requestedById(requestedBy != null ? requestedBy.getId() : null)
                .requestedByName(requestedBy != null ? requestedBy.getFullName() : null)
                .assignedApproverId(assignedApproverId)
                .assignedApproverName(resolveUserName(assignedApproverId))
                .decidedById(decidedBy != null ? decidedBy.getId() : null)
                .decidedByName(decidedBy != null ? decidedBy.getFullName() : null)
                .decisionComment(request.getDecisionComment())
                .createdAt(request.getCreatedAt())
                .decidedAt(request.getDecidedAt())
                .build();
    }

    private String resolveTargetLabel(ApprovalRequest request) {
        String targetType = request.getTargetType();
        Long targetId = request.getTargetId();
        if (targetType == null || targetId == null) {
            return null;
        }

        if ("CASE".equals(targetType)) {
            return queryLabel("SELECT case_code FROM \"case\" WHERE id = ?", targetId);
        }
        if ("CLIENT".equals(targetType)) {
            String label = queryLabel("SELECT CONCAT(COALESCE(NULLIF(abbr, ''), name_en), ' · ', name_en) FROM client WHERE id = ?", targetId);
            return label != null ? label : readPayloadText(request, "clientName");
        }
        if ("REPORT".equals(targetType)) {
            return "RPT-" + targetId;
        }
        if ("USER".equals(targetType)) {
            return queryLabel("SELECT full_name FROM users WHERE id = ?", targetId);
        }
        return targetType + " #" + targetId;
    }

    private String queryLabel(String sql, Long id) {
        List<String> labels = jdbcTemplate.queryForList(sql, String.class, id);
        return labels.isEmpty() || labels.get(0) == null || labels.get(0).isBlank() ? null : labels.get(0);
    }

    private String readPayloadText(ApprovalRequest request, String fieldName) {
        JsonNode payloadJson = request.getPayloadJson();
        if (payloadJson == null || !payloadJson.hasNonNull(fieldName)) {
            return null;
        }
        String value = payloadJson.get(fieldName).asText();
        return value == null || value.isBlank() ? null : value;
    }

    private String resolveUserName(Long userId) {
        if (userId == null) {
            return null;
        }
        return queryLabel("SELECT full_name FROM users WHERE id = ?", userId);
    }
}
