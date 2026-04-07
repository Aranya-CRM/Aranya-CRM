package aranya.crm.repository;

import aranya.crm.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Optional;

public interface UserRepository extends JpaRepository<User,Long> {
    @Query("""
            SELECT DISTINCT u FROM User u
            LEFT JOIN FETCH u.userRoles ur
            LEFT JOIN FETCH ur.role
            WHERE u.email = :email
            """)
    Optional<User> findByEmailWithRoles(@Param("email") String email);
}
