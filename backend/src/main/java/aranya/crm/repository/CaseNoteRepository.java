package aranya.crm.repository;

import aranya.crm.entity.CaseNote;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface CaseNoteRepository extends JpaRepository<CaseNote, Long> {

    @EntityGraph(attributePaths = {"clientCase", "createdBy"})
    List<CaseNote> findByClientCaseIdOrderByCreatedAtDescIdDesc(Long caseId);
}
