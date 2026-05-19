package aranya.crm.repository;


import aranya.crm.entity.ClientCase;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Collection;
import java.util.List;

public interface CaseRepository extends JpaRepository<ClientCase, Long> {

    @EntityGraph(attributePaths = "client")
    List<ClientCase> findByStatusNotOrderByOpenedAtDescIdDesc(String status, Pageable pageable);

    @EntityGraph(attributePaths = {"client", "createdBy"})
    List<ClientCase> findAllByOrderByOpenedAtDescIdDesc();

    @EntityGraph(attributePaths = {"client", "createdBy"})
    List<ClientCase> findByStatusIgnoreCaseOrderByOpenedAtDescIdDesc(String status);

    @EntityGraph(attributePaths = {"client", "createdBy"})
    @Query("""
            SELECT cc FROM ClientCase cc
            JOIN cc.client c
            WHERE LOWER(cc.caseCode) LIKE LOWER(CONCAT('%', :q, '%'))
                OR LOWER(cc.title) LIKE LOWER(CONCAT('%', :q, '%'))
                OR LOWER(c.nameEn) LIKE LOWER(CONCAT('%', :q, '%'))
                OR LOWER(c.nameChn) LIKE LOWER(CONCAT('%', :q, '%'))
            ORDER BY cc.openedAt DESC, cc.id DESC
            """)
    List<ClientCase> searchCases(@Param("q") String q);

    @EntityGraph(attributePaths = {"client", "createdBy"})
    @Query("""
            SELECT cc FROM ClientCase cc
            JOIN cc.client c
            WHERE LOWER(cc.status) = LOWER(:status)
            AND (
                LOWER(cc.caseCode) LIKE LOWER(CONCAT('%', :q, '%'))
                OR LOWER(cc.title) LIKE LOWER(CONCAT('%', :q, '%'))
                OR LOWER(c.nameEn) LIKE LOWER(CONCAT('%', :q, '%'))
                OR LOWER(c.nameChn) LIKE LOWER(CONCAT('%', :q, '%'))
            )
            ORDER BY cc.openedAt DESC, cc.id DESC
            """)
    List<ClientCase> searchCases(@Param("q") String q, @Param("status") String status);

    long countByStatusNot(String status);

    @EntityGraph(attributePaths = "client")
    List<ClientCase> findByStatusNotAndColorCodeInOrderByOpenedAtDescIdDesc(
            String status,
            Collection<String> colorCodes,
            Pageable pageable
    );

    long countByStatusNotAndColorCodeIn(String status, Collection<String> colorCodes);
}
