package aranya.crm.service;

import aranya.crm.entity.ClientCase;
import aranya.crm.entity.OperationAuditLog;
import aranya.crm.entity.User;
import aranya.crm.repository.OperationAuditLogRepository;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.verify;

@ExtendWith(MockitoExtension.class)
class OperationAuditLogServiceTest {

    @Mock
    private OperationAuditLogRepository repository;

    private final ObjectMapper objectMapper = new ObjectMapper().findAndRegisterModules();

    @Test
    void recordStoresActorTargetAndStructuredChanges() {
        OperationAuditLogService service = new OperationAuditLogService(repository, objectMapper);
        ClientCase clientCase = new ClientCase();
        clientCase.setId(7L);
        User actor = new User();
        actor.setId(10L);
        actor.setFullName("Case Worker");

        service.record(clientCase, actor, "CASE_UPDATED", "CASE", 7L, "CASE-007",
                "修改个案资料", Map.of("status", "OPEN"), Map.of("status", "CLOSED"));

        ArgumentCaptor<OperationAuditLog> captor = ArgumentCaptor.forClass(OperationAuditLog.class);
        verify(repository).save(captor.capture());
        OperationAuditLog log = captor.getValue();
        assertThat(log.getClientCase()).isSameAs(clientCase);
        assertThat(log.getActorName()).isEqualTo("Case Worker");
        assertThat(log.getTargetLabel()).isEqualTo("CASE-007");
        assertThat(log.getBeforeJson()).isEqualTo("{\"status\":\"OPEN\"}");
        assertThat(log.getAfterJson()).isEqualTo("{\"status\":\"CLOSED\"}");
        assertThat(log.getResult()).isEqualTo("SUCCESS");
    }
}

