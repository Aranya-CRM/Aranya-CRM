package aranya.crm.repository;

import aranya.crm.entity.TwoFactorBackupCode;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Optional;

public interface TwoFactorBackupCodeRepository extends JpaRepository<TwoFactorBackupCode, Long> {

    Optional<TwoFactorBackupCode> findByUserIdAndCodeHashAndUsedFalse(Long userId, String codeHash);

    @Modifying
    @Query("DELETE FROM TwoFactorBackupCode b WHERE b.user.id = :userId")
    void deleteByUserId(@Param("userId") Long userId);
}
