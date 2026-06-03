package aranya.crm.repository;

import aranya.crm.entity.VisitReport;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface VisitReportRepository extends JpaRepository<VisitReport, Long> {

    long countByCreatedById(Long createdById);

    long countByCreatedByIdAndStatusIgnoreCase(Long createdById, String status);

    @EntityGraph(attributePaths = {"client", "clientCase", "createdBy"})
    List<VisitReport> findByCreatedByIdOrderByCreatedAtDescIdDesc(Long createdById, Pageable pageable);

    @EntityGraph(attributePaths = {"client", "clientCase", "createdBy"})
    List<VisitReport> findByCreatedByIdOrderByCreatedAtDescIdDesc(Long createdById);

    @EntityGraph(attributePaths = {"client", "clientCase", "createdBy"})
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

    @EntityGraph(attributePaths = {"client", "clientCase", "createdBy"})
    List<VisitReport> findAllByOrderByCreatedAtDescIdDesc(Pageable pageable);

    @EntityGraph(attributePaths = {"client", "clientCase", "createdBy"})
    List<VisitReport> findAllByOrderByCreatedAtDescIdDesc();

    @EntityGraph(attributePaths = {"client", "clientCase", "createdBy"})
    Optional<VisitReport> findById(Long id);
}
