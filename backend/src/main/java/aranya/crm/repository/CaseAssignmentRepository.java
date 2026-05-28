package aranya.crm.repository;

import aranya.crm.entity.CaseAssignment;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface CaseAssignmentRepository extends JpaRepository<CaseAssignment, Long> {

    @EntityGraph(attributePaths = {"clientCase", "clientCase.client", "user"})
    @Query("""
            SELECT ca FROM CaseAssignment ca
            WHERE ca.user.id = :userId
              AND UPPER(ca.assignmentRole) = 'VOLUNTEER'
              AND UPPER(ca.status) = 'ACTIVE'
            ORDER BY ca.assignedAt DESC, ca.id DESC
            """)
    List<CaseAssignment> findVolunteerAssignments(@Param("userId") Long userId, Pageable pageable);

    @Query("""
            SELECT COUNT(ca) FROM CaseAssignment ca
            WHERE ca.user.id = :userId
              AND UPPER(ca.assignmentRole) = 'VOLUNTEER'
              AND UPPER(ca.status) = 'ACTIVE'
            """)
    long countVolunteerAssignments(@Param("userId") Long userId);
}
