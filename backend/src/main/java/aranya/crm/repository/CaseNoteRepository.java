package aranya.crm.repository;

import aranya.crm.entity.CaseNote;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface CaseNoteRepository extends JpaRepository<CaseNote, Long> {

    @EntityGraph(attributePaths = {"clientCase", "createdBy"})
    List<CaseNote> findByClientCaseIdOrderByCreatedAtDescIdDesc(Long caseId);

    @EntityGraph(attributePaths = {"clientCase", "createdBy"})
    List<CaseNote> findByClientCaseIdAndCreatedByIdOrderByCreatedAtDescIdDesc(Long caseId, Long createdById);

    @EntityGraph(attributePaths = {"clientCase", "createdBy"})
    Optional<CaseNote> findByIdAndCreatedById(Long id, Long createdById);

    @EntityGraph(attributePaths = {"clientCase", "createdBy"})
    Optional<CaseNote> findByIdAndClientCaseIdAndCreatedById(Long id, Long caseId, Long createdById);
}
