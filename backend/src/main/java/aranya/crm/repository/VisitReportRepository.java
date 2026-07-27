package aranya.crm.repository;

import aranya.crm.entity.VisitReport;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Collection;
import java.util.List;
import java.util.Optional;

public interface VisitReportRepository extends JpaRepository<VisitReport, Long> {

    long countByCreatedById(Long createdById);

    long countByStatusIgnoreCase(String status);

    long countByCreatedByIdAndStatusIgnoreCase(Long createdById, String status);

    @EntityGraph(attributePaths = {"client", "clientCase", "createdBy", "serviceAppointment", "serviceAppointment.serviceType", "serviceAppointment.clientCase", "serviceAppointment.clientCase.client", "serviceAppointment.assignedUser"})
    List<VisitReport> findByCreatedByIdOrderByCreatedAtDescIdDesc(Long createdById, Pageable pageable);

    @EntityGraph(attributePaths = {"client", "clientCase", "createdBy", "serviceAppointment", "serviceAppointment.serviceType", "serviceAppointment.clientCase", "serviceAppointment.clientCase.client", "serviceAppointment.assignedUser"})
    List<VisitReport> findByCreatedByIdOrderByCreatedAtDescIdDesc(Long createdById);

    @EntityGraph(attributePaths = {"client", "clientCase", "createdBy", "serviceAppointment", "serviceAppointment.serviceType", "serviceAppointment.clientCase", "serviceAppointment.clientCase.client", "serviceAppointment.assignedUser"})
    @Query("""
            SELECT vr
            FROM VisitReport vr
            WHERE vr.createdBy.id = :createdById
              AND (
                vr.clientCase.id = :caseId
                OR (
                  vr.clientCase IS NULL
                  AND vr.client.id = (
                    SELECT cc.client.id
                    FROM ClientCase cc
                    WHERE cc.id = :caseId
                  )
                )
              )
            ORDER BY vr.createdAt DESC, vr.id DESC
            """)
    List<VisitReport> findOwnReportsForCase(
            @Param("createdById") Long createdById,
            @Param("caseId") Long caseId
    );

    @EntityGraph(attributePaths = {"client", "clientCase", "createdBy", "serviceAppointment", "serviceAppointment.serviceType", "serviceAppointment.clientCase", "serviceAppointment.clientCase.client", "serviceAppointment.assignedUser"})
    List<VisitReport> findByCreatedByIdAndServiceAppointmentIdOrderByCreatedAtDescIdDesc(
            Long createdById,
            Long serviceAppointmentId
    );

    @EntityGraph(attributePaths = {"client", "clientCase", "createdBy", "serviceAppointment", "serviceAppointment.serviceType", "serviceAppointment.clientCase", "serviceAppointment.clientCase.client", "serviceAppointment.assignedUser"})
    @Query("""
            SELECT vr FROM VisitReport vr
            WHERE vr.serviceAppointment.id = :serviceAppointmentId
              AND (
                vr.createdBy.id = :userId
                OR UPPER(vr.status) = 'SUBMITTED'
              )
            ORDER BY vr.createdAt DESC, vr.id DESC
            """)
    List<VisitReport> findVisibleReportsForAssignedAppointment(
            @Param("userId") Long userId,
            @Param("serviceAppointmentId") Long serviceAppointmentId
    );

    boolean existsByServiceAppointmentIdAndStatusIgnoreCase(Long serviceAppointmentId, String status);

    @EntityGraph(attributePaths = {"client", "clientCase", "createdBy", "serviceAppointment", "serviceAppointment.serviceType", "serviceAppointment.clientCase", "serviceAppointment.clientCase.client", "serviceAppointment.assignedUser"})
    List<VisitReport> findAllByOrderByCreatedAtDescIdDesc(Pageable pageable);

    @EntityGraph(attributePaths = {"client", "clientCase", "createdBy", "serviceAppointment", "serviceAppointment.serviceType", "serviceAppointment.clientCase", "serviceAppointment.clientCase.client", "serviceAppointment.assignedUser"})
    List<VisitReport> findAllByOrderByCreatedAtDescIdDesc();

    /**
     * Reports authored by someone other than the given user, limited to statuses
     * that are visible to reviewers. Drafts stay private to their author and are
     * therefore excluded.
     */
    @EntityGraph(attributePaths = {"client", "clientCase", "createdBy", "serviceAppointment", "serviceAppointment.serviceType", "serviceAppointment.clientCase", "serviceAppointment.clientCase.client", "serviceAppointment.assignedUser"})
    List<VisitReport> findByCreatedByIdNotAndStatusInOrderByCreatedAtDescIdDesc(
            Long createdById, Collection<String> statuses);

    /**
     * Reviewable reports (see above) further restricted to authors holding a given role.
     * MOCK: Social Workers should ultimately only see volunteer reports filed under the
     * tasks they are responsible for; for now we simply restrict to all volunteer authors.
     */
    @EntityGraph(attributePaths = {"client", "clientCase", "createdBy", "serviceAppointment", "serviceAppointment.serviceType", "serviceAppointment.clientCase", "serviceAppointment.clientCase.client", "serviceAppointment.assignedUser"})
    @Query("""
            SELECT vr FROM VisitReport vr
            WHERE vr.createdBy.id <> :userId
              AND vr.status IN :statuses
              AND EXISTS (
                  SELECT 1 FROM UserRole ur
                  WHERE ur.user = vr.createdBy
                    AND ur.role.name = :roleName
              )
            ORDER BY vr.createdAt DESC, vr.id DESC
            """)
    List<VisitReport> findReviewableByAuthorRole(
            @Param("userId") Long userId,
            @Param("statuses") Collection<String> statuses,
            @Param("roleName") String roleName);

    @EntityGraph(attributePaths = {"client", "clientCase", "createdBy", "serviceAppointment", "serviceAppointment.serviceType"})
    Optional<VisitReport> findById(Long id);
}
