package aranya.crm.repository;

import aranya.crm.entity.VisitReport;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface VisitReportRepository extends JpaRepository<VisitReport, Long> {

    long countByCreatedById(Long createdById);

    @EntityGraph(attributePaths = {"client", "createdBy"})
    List<VisitReport> findByCreatedByIdOrderByCreatedAtDescIdDesc(Long createdById, Pageable pageable);

    @EntityGraph(attributePaths = {"client", "createdBy"})
    List<VisitReport> findAllByOrderByCreatedAtDescIdDesc(Pageable pageable);

    @EntityGraph(attributePaths = {"client", "createdBy"})
    List<VisitReport> findAllByOrderByCreatedAtDescIdDesc();

    @EntityGraph(attributePaths = {"client", "createdBy"})
    Optional<VisitReport> findById(Long id);
}
