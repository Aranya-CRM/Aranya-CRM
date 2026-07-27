package aranya.crm.repository;

import aranya.crm.entity.CaseAssignment;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface CaseAssignmentRepository extends JpaRepository<CaseAssignment, Long> {

    @EntityGraph(attributePaths = {"user", "user.userRoles", "user.userRoles.role"})
    Optional<CaseAssignment> findFirstByClientCase_IdAndPrimaryTrueAndStatusIgnoreCaseOrderByAssignedAtDescIdDesc(
            Long caseId,
            String status
    );

    @Modifying
    @Query("""
            UPDATE CaseAssignment ca
            SET ca.status = 'INACTIVE',
                ca.endAt = CURRENT_TIMESTAMP
            WHERE ca.clientCase.id = :caseId
              AND ca.primary = true
              AND UPPER(ca.status) = 'ACTIVE'
            """)
    void deactivatePrimaryAssignments(@Param("caseId") Long caseId);

    @EntityGraph(attributePaths = {"user", "user.userRoles", "user.userRoles.role"})
    List<CaseAssignment> findByClientCase_IdAndPrimaryFalseAndStatusIgnoreCaseOrderByAssignedAtAscIdAsc(
            Long caseId,
            String status
    );

    @Modifying
    @Query("""
            DELETE FROM CaseAssignment ca
            WHERE ca.clientCase.id = :caseId
              AND ca.primary = false
            """)
    void deleteNonPrimaryAssignments(@Param("caseId") Long caseId);

    @Query("""
            SELECT CASE WHEN COUNT(ca) > 0 THEN true ELSE false END
            FROM CaseAssignment ca
            WHERE ca.clientCase.id = :caseId
              AND ca.user.id = :userId
              AND UPPER(ca.status) = 'ACTIVE'
            """)
    boolean existsActiveAssignment(@Param("caseId") Long caseId, @Param("userId") Long userId);

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
