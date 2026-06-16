package aranya.crm.repository;

import aranya.crm.entity.ApprovalRequest;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface ApprovalRequestRepository extends JpaRepository<ApprovalRequest, Long> {

    @EntityGraph(attributePaths = {"requestedBy", "decidedBy"})
    List<ApprovalRequest> findByStatusOrderByCreatedAtAscIdAsc(String status);

    @EntityGraph(attributePaths = {"requestedBy", "decidedBy"})
    Optional<ApprovalRequest> findFirstByStatusAndIdempotencyKeyOrderByCreatedAtAscIdAsc(String status, String idempotencyKey);
}
