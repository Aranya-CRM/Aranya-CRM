package aranya.crm.repository;

import aranya.crm.entity.OperationAuditLog;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface OperationAuditLogRepository extends JpaRepository<OperationAuditLog, Long> {

    @EntityGraph(attributePaths = {"actor"})
    List<OperationAuditLog> findByClientCaseIdOrderByOccurredAtDescIdDesc(Long caseId);

    @EntityGraph(attributePaths = {"actor"})
    List<OperationAuditLog> findByClientCaseIdAndActorIdOrderByOccurredAtDescIdDesc(Long caseId, Long actorId);
}
