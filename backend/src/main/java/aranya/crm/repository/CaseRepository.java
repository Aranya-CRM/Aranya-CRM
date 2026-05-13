package aranya.crm.repository;


import aranya.crm.entity.ClientCase;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Collection;
import java.util.List;

public interface CaseRepository extends JpaRepository<ClientCase, Long> {

    @EntityGraph(attributePaths = "client")
    List<ClientCase> findByStatusNotOrderByOpenedAtDescIdDesc(String status, Pageable pageable);

    long countByStatusNot(String status);

    @EntityGraph(attributePaths = "client")
    List<ClientCase> findByStatusNotAndColorCodeInOrderByOpenedAtDescIdDesc(
            String status,
            Collection<String> colorCodes,
            Pageable pageable
    );

    long countByStatusNotAndColorCodeIn(String status, Collection<String> colorCodes);
}
