package aranya.crm.repository;


import aranya.crm.entity.ClientCase;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Collection;
import java.util.List;
import java.util.Optional;

public interface CaseRepository extends JpaRepository<ClientCase, Long> {

    @EntityGraph(attributePaths = "client")
    @Query("""
            SELECT cc FROM ClientCase cc
            WHERE LOWER(cc.status) NOT IN ('closed', 'deleted')
            ORDER BY cc.openedAt DESC, cc.id DESC
            """)
    List<ClientCase> findActiveCases(Pageable pageable);

    @EntityGraph(attributePaths = {"client", "createdBy"})
    List<ClientCase> findAllByOrderByOpenedAtDescIdDesc();

    @EntityGraph(attributePaths = {"client", "createdBy"})
    Optional<ClientCase> findFirstByClientIdOrderByOpenedAtDescIdDesc(Long clientId);

    @Query("""
            SELECT CASE WHEN COUNT(cc) > 0 THEN true ELSE false END FROM ClientCase cc
            WHERE cc.client.id = :clientId
            AND LOWER(cc.status) NOT IN ('closed', 'deleted')
            """)
    boolean existsActiveCaseByClientId(@Param("clientId") Long clientId);

    @EntityGraph(attributePaths = {"client", "createdBy"})
    @Query("""
            SELECT cc FROM ClientCase cc
            WHERE cc.client.id = :clientId
            AND LOWER(cc.status) NOT IN ('closed', 'deleted')
            """)
    List<ClientCase> findActiveCasesByClientId(@Param("clientId") Long clientId);

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

    @Query("""
            SELECT COUNT(cc) FROM ClientCase cc
            WHERE LOWER(cc.status) NOT IN ('closed', 'deleted')
            """)
    long countActiveCases();

    @EntityGraph(attributePaths = "client")
    @Query("""
            SELECT cc FROM ClientCase cc
            WHERE LOWER(cc.status) NOT IN ('closed', 'deleted')
            AND cc.colorCode IN :colorCodes
            ORDER BY cc.openedAt DESC, cc.id DESC
            """)
    List<ClientCase> findUrgentActiveCases(
            @Param("colorCodes") Collection<String> colorCodes,
            Pageable pageable
    );

    @Query("""
            SELECT COUNT(cc) FROM ClientCase cc
            WHERE LOWER(cc.status) NOT IN ('closed', 'deleted')
            AND cc.colorCode IN :colorCodes
            """)
    long countUrgentActiveCases(@Param("colorCodes") Collection<String> colorCodes);

    @EntityGraph(attributePaths = "client")
    @Query("""
            SELECT cc FROM ClientCase cc
            WHERE cc.createdBy.id = :createdById
            AND LOWER(cc.status) NOT IN ('closed', 'deleted')
            ORDER BY cc.openedAt DESC, cc.id DESC
            """)
    List<ClientCase> findActiveCasesByCreatedById(@Param("createdById") Long createdById, Pageable pageable);

    @Query("""
            SELECT COUNT(cc) FROM ClientCase cc
            WHERE cc.createdBy.id = :createdById
            AND LOWER(cc.status) NOT IN ('closed', 'deleted')
            """)
    long countActiveCasesByCreatedById(@Param("createdById") Long createdById);

    @Query("""
            SELECT COUNT(cc) FROM ClientCase cc
            WHERE cc.createdBy.id = :createdById
            AND LOWER(cc.status) NOT IN ('closed', 'deleted')
            AND cc.colorCode IN :colorCodes
            """)
    long countUrgentActiveCasesByCreatedById(
            @Param("createdById") Long createdById,
            @Param("colorCodes") Collection<String> colorCodes);

    @Query("SELECT COUNT(DISTINCT cc.client.id) FROM ClientCase cc " +
           "WHERE cc.createdBy.id = :createdById AND LOWER(cc.status) NOT IN ('closed', 'deleted')")
    long countDistinctActiveClientsByCreatedById(@Param("createdById") Long createdById);

    @EntityGraph(attributePaths = {"client", "createdBy"})
    List<ClientCase> findByCreatedByIdOrderByOpenedAtDescIdDesc(Long createdById);

    @EntityGraph(attributePaths = {"client", "createdBy"})
    List<ClientCase> findByCreatedByIdAndStatusIgnoreCaseOrderByOpenedAtDescIdDesc(Long createdById, String status);

    @EntityGraph(attributePaths = {"client", "createdBy"})
    @Query("""
            SELECT DISTINCT cc FROM ClientCase cc
            LEFT JOIN CaseAssignment ca
              ON ca.clientCase = cc
             AND UPPER(ca.status) = 'ACTIVE'
            WHERE (
                ca.user.id = :assignedUserId
                OR (ca.id IS NULL AND cc.createdBy.id = :assignedUserId)
            )
            ORDER BY cc.openedAt DESC, cc.id DESC
            """)
    List<ClientCase> findAssignedCasesByUserIdOrderByOpenedAtDescIdDesc(@Param("assignedUserId") Long assignedUserId);

    @EntityGraph(attributePaths = {"client", "createdBy"})
    @Query("""
            SELECT DISTINCT cc FROM ClientCase cc
            LEFT JOIN CaseAssignment ca
              ON ca.clientCase = cc
             AND UPPER(ca.status) = 'ACTIVE'
            WHERE (
                ca.user.id = :assignedUserId
                OR (ca.id IS NULL AND cc.createdBy.id = :assignedUserId)
            )
            AND LOWER(cc.status) = LOWER(:status)
            ORDER BY cc.openedAt DESC, cc.id DESC
            """)
    List<ClientCase> findAssignedCasesByUserIdAndStatusIgnoreCaseOrderByOpenedAtDescIdDesc(
            @Param("assignedUserId") Long assignedUserId,
            @Param("status") String status);

    @EntityGraph(attributePaths = {"client", "createdBy"})
    @Query("""
            SELECT DISTINCT cc FROM ClientCase cc
            JOIN cc.client c
            LEFT JOIN CaseAssignment ca
              ON ca.clientCase = cc
             AND UPPER(ca.status) = 'ACTIVE'
            WHERE (
                ca.user.id = :assignedUserId
                OR (ca.id IS NULL AND cc.createdBy.id = :assignedUserId)
            )
            AND (
                LOWER(cc.caseCode) LIKE LOWER(CONCAT('%', :q, '%'))
                OR LOWER(cc.title) LIKE LOWER(CONCAT('%', :q, '%'))
                OR LOWER(c.nameEn) LIKE LOWER(CONCAT('%', :q, '%'))
                OR LOWER(c.nameChn) LIKE LOWER(CONCAT('%', :q, '%'))
            )
            ORDER BY cc.openedAt DESC, cc.id DESC
            """)
    List<ClientCase> searchAssignedCasesByUserId(@Param("assignedUserId") Long assignedUserId, @Param("q") String q);

    @EntityGraph(attributePaths = {"client", "createdBy"})
    @Query("""
            SELECT DISTINCT cc FROM ClientCase cc
            JOIN cc.client c
            LEFT JOIN CaseAssignment ca
              ON ca.clientCase = cc
             AND UPPER(ca.status) = 'ACTIVE'
            WHERE (
                ca.user.id = :assignedUserId
                OR (ca.id IS NULL AND cc.createdBy.id = :assignedUserId)
            )
            AND LOWER(cc.status) = LOWER(:status)
            AND (
                LOWER(cc.caseCode) LIKE LOWER(CONCAT('%', :q, '%'))
                OR LOWER(cc.title) LIKE LOWER(CONCAT('%', :q, '%'))
                OR LOWER(c.nameEn) LIKE LOWER(CONCAT('%', :q, '%'))
                OR LOWER(c.nameChn) LIKE LOWER(CONCAT('%', :q, '%'))
            )
            ORDER BY cc.openedAt DESC, cc.id DESC
            """)
    List<ClientCase> searchAssignedCasesByUserId(
            @Param("assignedUserId") Long assignedUserId,
            @Param("q") String q,
            @Param("status") String status);

    @Query("""
            SELECT CASE WHEN COUNT(DISTINCT cc) > 0 THEN true ELSE false END
            FROM ClientCase cc
            LEFT JOIN CaseAssignment ca
              ON ca.clientCase = cc
             AND UPPER(ca.status) = 'ACTIVE'
            WHERE cc.id = :caseId
            AND LOWER(cc.status) <> 'deleted'
            AND (
                ca.user.id = :assignedUserId
                OR (ca.id IS NULL AND cc.createdBy.id = :assignedUserId)
            )
            """)
    boolean existsVisibleCaseForAssignedUser(@Param("caseId") Long caseId, @Param("assignedUserId") Long assignedUserId);

    @EntityGraph(attributePaths = "client")
    @Query("""
            SELECT DISTINCT cc FROM ClientCase cc
            LEFT JOIN CaseAssignment ca
              ON ca.clientCase = cc
             AND UPPER(ca.status) = 'ACTIVE'
            WHERE (
                ca.user.id = :assignedUserId
                OR (ca.id IS NULL AND cc.createdBy.id = :assignedUserId)
            )
            AND LOWER(cc.status) NOT IN ('closed', 'deleted')
            ORDER BY cc.openedAt DESC, cc.id DESC
            """)
    List<ClientCase> findActiveAssignedCasesByUserId(@Param("assignedUserId") Long assignedUserId, Pageable pageable);

    @Query("""
            SELECT COUNT(DISTINCT cc) FROM ClientCase cc
            LEFT JOIN CaseAssignment ca
              ON ca.clientCase = cc
             AND UPPER(ca.status) = 'ACTIVE'
            WHERE (
                ca.user.id = :assignedUserId
                OR (ca.id IS NULL AND cc.createdBy.id = :assignedUserId)
            )
            AND LOWER(cc.status) NOT IN ('closed', 'deleted')
            """)
    long countActiveAssignedCasesByUserId(@Param("assignedUserId") Long assignedUserId);

    @Query("""
            SELECT COUNT(DISTINCT cc) FROM ClientCase cc
            LEFT JOIN CaseAssignment ca
              ON ca.clientCase = cc
             AND UPPER(ca.status) = 'ACTIVE'
            WHERE (
                ca.user.id = :assignedUserId
                OR (ca.id IS NULL AND cc.createdBy.id = :assignedUserId)
            )
            AND LOWER(cc.status) NOT IN ('closed', 'deleted')
            AND cc.colorCode IN :colorCodes
            """)
    long countUrgentActiveAssignedCasesByUserId(
            @Param("assignedUserId") Long assignedUserId,
            @Param("colorCodes") Collection<String> colorCodes);

    @Query("""
            SELECT COUNT(DISTINCT cc.client.id) FROM ClientCase cc
            LEFT JOIN CaseAssignment ca
              ON ca.clientCase = cc
             AND UPPER(ca.status) = 'ACTIVE'
            WHERE (
                ca.user.id = :assignedUserId
                OR (ca.id IS NULL AND cc.createdBy.id = :assignedUserId)
            )
            AND LOWER(cc.status) NOT IN ('closed', 'deleted')
            """)
    long countDistinctActiveClientsByAssignedUserId(@Param("assignedUserId") Long assignedUserId);

    @EntityGraph(attributePaths = {"client", "createdBy"})
    @Query("""
            SELECT cc FROM ClientCase cc
            JOIN cc.client c
            WHERE cc.createdBy.id = :createdById
            AND (
                LOWER(cc.caseCode) LIKE LOWER(CONCAT('%', :q, '%'))
                OR LOWER(cc.title) LIKE LOWER(CONCAT('%', :q, '%'))
                OR LOWER(c.nameEn) LIKE LOWER(CONCAT('%', :q, '%'))
                OR LOWER(c.nameChn) LIKE LOWER(CONCAT('%', :q, '%'))
            )
            ORDER BY cc.openedAt DESC, cc.id DESC
            """)
    List<ClientCase> searchCasesByCreatedBy(@Param("createdById") Long createdById, @Param("q") String q);

    @EntityGraph(attributePaths = {"client", "createdBy"})
    @Query("""
            SELECT cc FROM ClientCase cc
            JOIN cc.client c
            WHERE cc.createdBy.id = :createdById
            AND LOWER(cc.status) = LOWER(:status)
            AND (
                LOWER(cc.caseCode) LIKE LOWER(CONCAT('%', :q, '%'))
                OR LOWER(cc.title) LIKE LOWER(CONCAT('%', :q, '%'))
                OR LOWER(c.nameEn) LIKE LOWER(CONCAT('%', :q, '%'))
                OR LOWER(c.nameChn) LIKE LOWER(CONCAT('%', :q, '%'))
            )
            ORDER BY cc.openedAt DESC, cc.id DESC
            """)
    List<ClientCase> searchCasesByCreatedBy(@Param("createdById") Long createdById, @Param("q") String q, @Param("status") String status);

    @Query("SELECT cc.caseCode FROM ClientCase cc " +
           "WHERE cc.caseCode LIKE CONCAT('ASDFL/', :year, '/C/%') " +
           "ORDER BY cc.id DESC LIMIT 1")
    Optional<String> findLatestCaseCodeByYear(@Param("year") String year);
}
