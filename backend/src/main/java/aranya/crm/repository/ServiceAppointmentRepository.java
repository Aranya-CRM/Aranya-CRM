package aranya.crm.repository;

import aranya.crm.entity.ServiceAppointment;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ServiceAppointmentRepository extends JpaRepository<ServiceAppointment, Long> {
}
