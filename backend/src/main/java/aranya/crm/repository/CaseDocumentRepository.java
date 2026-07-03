package aranya.crm.repository;

import aranya.crm.entity.CaseDocument;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface CaseDocumentRepository extends JpaRepository<CaseDocument, Long> {

    @EntityGraph(attributePaths = {"document", "document.uploadedBy", "linkedBy"})
    List<CaseDocument> findByClientCase_IdAndStatusOrderByCategoryAscLinkedAtDescIdDesc(Long caseId, String status);

    @EntityGraph(attributePaths = {"clientCase", "document", "document.uploadedBy", "linkedBy"})
    Optional<CaseDocument> findByClientCase_IdAndDocument_IdAndStatus(Long caseId, Long documentId, String status);
}
