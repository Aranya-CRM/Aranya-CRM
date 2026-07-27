package aranya.crm.repository;

import aranya.crm.entity.ServiceEventAssignment;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface ServiceEventAssignmentRepository extends JpaRepository<ServiceEventAssignment, Long> {

    @EntityGraph(attributePaths = {"user", "user.userRoles", "user.userRoles.role"})
    List<ServiceEventAssignment> findByServiceAppointment_IdAndStatusIgnoreCaseOrderByAssignedAtAscIdAsc(
            Long serviceAppointmentId,
            String status
    );

    @Query("""
            SELECT CASE WHEN COUNT(sea) > 0 THEN true ELSE false END
            FROM ServiceEventAssignment sea
            WHERE sea.serviceAppointment.id = :eventId
              AND sea.user.id = :userId
              AND UPPER(sea.status) = 'ACTIVE'
            """)
    boolean existsActiveAssignment(@Param("eventId") Long eventId, @Param("userId") Long userId);
}
