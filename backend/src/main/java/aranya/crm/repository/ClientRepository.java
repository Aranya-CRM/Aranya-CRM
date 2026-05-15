package aranya.crm.repository;

import aranya.crm.entity.Client;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface ClientRepository extends JpaRepository<Client, Long> {

    Optional<Client> findByAbbr(String abbr);

    boolean existsByAbbr(String abbr);

    List<Client> findAllByOrderByCreatedAtDesc();

    List<Client> findByMembershipStatusIgnoreCaseOrderByCreatedAtDesc(String membershipStatus);

    long countByMembershipStatusIgnoreCase(String membershipStatus);

    @Query("""
            SELECT c FROM Client c
            WHERE (LOWER(c.abbr) LIKE LOWER(CONCAT('%', :q, '%'))
                OR LOWER(c.nameEn) LIKE LOWER(CONCAT('%', :q, '%'))
                OR LOWER(c.nameChn) LIKE LOWER(CONCAT('%', :q, '%')))
            AND LOWER(c.membershipStatus) = LOWER(:membershipStatus)
            ORDER BY c.createdAt DESC
            """)
    List<Client> searchClients(
            @Param("q") String q,
            @Param("membershipStatus") String membershipStatus
    );

    @Query("""
            SELECT c FROM Client c
            WHERE LOWER(c.abbr) LIKE LOWER(CONCAT('%', :q, '%'))
                OR LOWER(c.nameEn) LIKE LOWER(CONCAT('%', :q, '%'))
                OR LOWER(c.nameChn) LIKE LOWER(CONCAT('%', :q, '%'))
            ORDER BY c.createdAt DESC
            """)
    List<Client> searchClients(@Param("q") String q);
}
