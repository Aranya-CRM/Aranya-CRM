package aranya.crm.service;

import aranya.crm.entity.ClientCase;
import aranya.crm.entity.OperationAuditLog;
import aranya.crm.entity.User;
import aranya.crm.repository.OperationAuditLogRepository;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.Map;

@Service
@RequiredArgsConstructor
public class OperationAuditLogService {

    private final OperationAuditLogRepository repository;
    private final ObjectMapper objectMapper;

    public OperationAuditLog record(
            ClientCase clientCase,
            User actor,
            String action,
            String targetType,
            Object targetId,
            String targetLabel,
            String summary,
            Map<String, ?> before,
            Map<String, ?> after
    ) {
        OperationAuditLog log = new OperationAuditLog();
        log.setClientCase(clientCase);
        log.setActor(actor);
        log.setActorName(actor != null && actor.getFullName() != null ? actor.getFullName() : "SYSTEM");
        log.setAction(action);
        log.setTargetType(targetType);
        log.setTargetId(targetId == null ? null : String.valueOf(targetId));
        log.setTargetLabel(targetLabel == null || targetLabel.isBlank() ? targetType : targetLabel);
        log.setSummary(summary);
        log.setBeforeJson(toJson(before));
        log.setAfterJson(toJson(after));
        log.setSource(actor == null ? "SYSTEM" : "WEB");
        return repository.save(log);
    }

    private String toJson(Map<String, ?> value) {
        if (value == null || value.isEmpty()) return null;
        try {
            return objectMapper.writeValueAsString(value);
        } catch (JsonProcessingException ex) {
            throw new IllegalArgumentException("Operation log values must be JSON serializable", ex);
        }
    }
}

