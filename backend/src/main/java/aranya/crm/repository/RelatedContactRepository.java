package aranya.crm.repository;

import aranya.crm.entity.RelatedContact;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface RelatedContactRepository extends JpaRepository<RelatedContact, Long> {

    List<RelatedContact> findByClientIdOrderByPrimaryDescCreatedAtAsc(Long clientId);

    @Modifying
    @Query("DELETE FROM RelatedContact rc WHERE rc.client.id = :clientId")
    int deleteByClientId(@Param("clientId") Long clientId);
}
