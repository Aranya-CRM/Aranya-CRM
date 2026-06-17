package aranya.crm.service;

import aranya.crm.dto.response.ApprovalRequestResponse;
import aranya.crm.entity.ApprovalRequest;
import aranya.crm.entity.User;
import aranya.crm.repository.ApprovalRequestRepository;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

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

    private final ApprovalRequestRepository approvalRequestRepository;
    private final ObjectMapper objectMapper;
    private final ApprovalActionRegistry approvalActionRegistry;
    private final JdbcTemplate jdbcTemplate;

    @Transactional
    public ApprovalRequestResponse createRequest(
            String type,
            String targetType,
            Long targetId,
            Object payload,
            User requestedBy
    ) {
        requireUser(requestedBy, "Requester is required");
        String normalizedType = normalizeRequired(type, "Approval type is required");
        if (!approvalActionRegistry.supports(normalizedType)) {
            throw new IllegalArgumentException("Unsupported approval type: " + normalizedType);
        }
        String normalizedTargetType = normalizeOptional(targetType);
        JsonNode payloadJson = parsePayload(payload);
        String idempotencyKey = buildIdempotencyKey(
                normalizedType,
                normalizedTargetType,
                targetId,
                payloadJson,
                requestedBy
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
        request.setRequestedBy(requestedBy);

        try {
            return toResponse(approvalRequestRepository.save(request));
        } catch (DataIntegrityViolationException ex) {
            return approvalRequestRepository
                    .findFirstByStatusAndIdempotencyKeyOrderByCreatedAtAscIdAsc(STATUS_PENDING, idempotencyKey)
                    .map(this::toResponse)
                    .orElseThrow(() -> ex);
        }
    }

    public List<ApprovalRequestResponse> listPending() {
        return approvalRequestRepository.findByStatusOrderByCreatedAtAscIdAsc(STATUS_PENDING).stream()
                .map(this::toResponse)
                .toList();
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
        ApprovalRequest request = approvalRequestRepository.findById(approvalId)
                .orElseThrow(() -> new EntityNotFoundException("Approval request not found: " + approvalId));
        requirePending(request);

        request.setStatus(decisionStatus);
        request.setDecidedBy(decidedBy);
        request.setDecisionComment(normalizeOptional(comment));
        request.setDecidedAt(LocalDateTime.now());
        if (STATUS_APPROVED.equals(decisionStatus)) {
            approvalActionRegistry.execute(request, decidedBy);
        }
        return toResponse(request);
    }

    private void requirePending(ApprovalRequest request) {
        if (!STATUS_PENDING.equals(request.getStatus())) {
            throw new IllegalStateException("Only pending approval requests can be decided");
        }
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
}
