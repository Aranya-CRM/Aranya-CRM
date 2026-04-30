package aranya.crm.service;

import aranya.crm.config.AppProperties;
import aranya.crm.dto.TwoFactorDisableRequest;
import aranya.crm.dto.TwoFactorEnableRequest;
import aranya.crm.dto.TwoFactorSetupResponse;
import aranya.crm.entity.TwoFactorBackupCode;
import aranya.crm.entity.User;
import aranya.crm.repository.TwoFactorBackupCodeRepository;
import aranya.crm.repository.UserRepository;
import dev.samstevens.totp.code.*;
import dev.samstevens.totp.secret.DefaultSecretGenerator;
import dev.samstevens.totp.secret.SecretGenerator;
import dev.samstevens.totp.time.SystemTimeProvider;
import dev.samstevens.totp.time.TimeProvider;
import jakarta.annotation.PostConstruct;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.google.zxing.BarcodeFormat;
import com.google.zxing.EncodeHintType;
import com.google.zxing.client.j2se.MatrixToImageWriter;
import com.google.zxing.common.BitMatrix;
import com.google.zxing.qrcode.QRCodeWriter;

import javax.crypto.Cipher;
import javax.crypto.SecretKey;
import javax.crypto.spec.GCMParameterSpec;
import javax.crypto.spec.SecretKeySpec;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.security.SecureRandom;
import java.util.*;
import java.util.concurrent.ConcurrentHashMap;

@Slf4j
@Service
@RequiredArgsConstructor
public class TwoFactorService {

    private static final int BACKUP_CODE_COUNT = 8;
    private static final String BACKUP_CODE_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    private static final String AES_ALGORITHM = "AES/GCM/NoPadding";
    private static final int GCM_IV_LENGTH = 12;
    private static final int GCM_TAG_BITS = 128;

    private final AppProperties appProperties;
    private final TwoFactorBackupCodeRepository backupCodeRepository;
    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    private SecretGenerator secretGenerator;
    private DefaultCodeVerifier codeVerifier;

    // "userId:code" -> expiry ms — prevents OTP replay within the tolerance window
    private final ConcurrentHashMap<String, Long> usedOtpCache = new ConcurrentHashMap<>();

    @PostConstruct
    public void init() {
        secretGenerator = new DefaultSecretGenerator(32);
        TimeProvider timeProvider = new SystemTimeProvider();
        CodeGenerator codeGenerator = new DefaultCodeGenerator(HashingAlgorithm.SHA1, 6);
        codeVerifier = new DefaultCodeVerifier(codeGenerator, timeProvider);
        codeVerifier.setAllowedTimePeriodDiscrepancy(1);
    }

    public TwoFactorSetupResponse generateSetup(String email) {
        String secret = secretGenerator.generate();
        String issuer = appProperties.getTwoFactor().getIssuer();
        String label = URLEncoder.encode(issuer + ":" + email, StandardCharsets.UTF_8);
        String encodedIssuer = URLEncoder.encode(issuer, StandardCharsets.UTF_8);
        String uri = String.format(
                "otpauth://totp/%s?secret=%s&issuer=%s&algorithm=SHA1&digits=6&period=30",
                label, secret, encodedIssuer);
        String qrBase64 = generateQrBase64(uri, 250);
        return TwoFactorSetupResponse.builder()
                .secret(secret)
                .qrCodeUri(uri)
                .qrCodeBase64(qrBase64)
                .build();
    }

    private String generateQrBase64(String content, int size) {
        try {
            QRCodeWriter writer = new QRCodeWriter();
            Map<EncodeHintType, Object> hints = new EnumMap<>(EncodeHintType.class);
            hints.put(EncodeHintType.MARGIN, 2);
            BitMatrix matrix = writer.encode(content, BarcodeFormat.QR_CODE, size, size, hints);
            ByteArrayOutputStream out = new ByteArrayOutputStream();
            MatrixToImageWriter.writeToStream(matrix, "PNG", out);
            return Base64.getEncoder().encodeToString(out.toByteArray());
        } catch (Exception e) {
            log.warn("QR code generation failed, falling back to text-only setup: {}", e.getMessage());
            return null;
        }
    }

    @Transactional
    public List<String> enableTwoFactor(Long userId, TwoFactorEnableRequest request) {
        User user = loadUser(userId);
        if (user.isTwoFactorEnabled()) {
            throw new IllegalStateException("2FA is already enabled. Disable it first before re-configuring.");
        }
        if (!codeVerifier.isValidCode(request.getSecret(), request.getCode())) {
            throw new BadCredentialsException("Invalid 2FA code");
        }
        user.setTwoFactorSecret(encryptSecret(request.getSecret()));
        user.setTwoFactorEnabled(true);
        userRepository.save(user);
        log.info("2FA enabled for userId: {}", userId);
        return generateAndSaveBackupCodes(user);
    }

    @Transactional
    public void disableTwoFactor(Long userId, TwoFactorDisableRequest request) {
        User user = loadUser(userId);
        if (!user.isTwoFactorEnabled()) {
            throw new IllegalStateException("2FA is not enabled");
        }
        if (!passwordEncoder.matches(request.getPassword(), user.getPasswordHash())) {
            throw new BadCredentialsException("Invalid password");
        }
        if (!verifyCodeForUser(user, request.getCode())) {
            throw new BadCredentialsException("Invalid 2FA code");
        }
        user.setTwoFactorEnabled(false);
        user.setTwoFactorSecret(null);
        userRepository.save(user);
        backupCodeRepository.deleteByUserId(userId);
        log.info("2FA disabled for userId: {}", userId);
    }

    @Transactional
    public List<String> regenerateBackupCodes(Long userId) {
        User user = loadUser(userId);
        if (!user.isTwoFactorEnabled()) {
            throw new IllegalStateException("2FA is not enabled");
        }
        log.info("Backup codes regenerated for userId: {}", userId);
        return generateAndSaveBackupCodes(user);
    }

    boolean verifyCodeForUser(User user, String code) {
        evictExpiredOtpEntries();
        if (code == null || code.isBlank()) return false;

        if (code.length() == 6 && code.chars().allMatch(Character::isDigit)) {
            return verifyTotp(user, code);
        }
        return verifyAndConsumeBackupCode(user, code);
    }

    private boolean verifyTotp(User user, String code) {
        if (user.getTwoFactorSecret() == null) return false;
        String cacheKey = user.getId() + ":" + code;
        if (usedOtpCache.containsKey(cacheKey)) {
            log.warn("OTP replay attempt detected for userId: {}", user.getId());
            return false;
        }
        String rawSecret = decryptSecret(user.getTwoFactorSecret());
        if (!codeVerifier.isValidCode(rawSecret, code)) return false;
        usedOtpCache.put(cacheKey, System.currentTimeMillis() + 90_000L);
        return true;
    }

    @Transactional
    boolean verifyAndConsumeBackupCode(User user, String code) {
        String hash = hashValue(code.toUpperCase().trim());
        Optional<TwoFactorBackupCode> found =
                backupCodeRepository.findByUserIdAndCodeHashAndUsedFalse(user.getId(), hash);
        if (found.isEmpty()) return false;
        found.get().setUsed(true);
        backupCodeRepository.save(found.get());
        log.info("Backup code consumed for userId: {}", user.getId());
        return true;
    }

    private List<String> generateAndSaveBackupCodes(User user) {
        backupCodeRepository.deleteByUserId(user.getId());
        SecureRandom random = new SecureRandom();
        List<String> rawCodes = new ArrayList<>(BACKUP_CODE_COUNT);
        List<TwoFactorBackupCode> entities = new ArrayList<>(BACKUP_CODE_COUNT);
        for (int i = 0; i < BACKUP_CODE_COUNT; i++) {
            String code = generateBackupCode(random);
            rawCodes.add(code);
            TwoFactorBackupCode entity = new TwoFactorBackupCode();
            entity.setUser(user);
            entity.setCodeHash(hashValue(code));
            entities.add(entity);
        }
        backupCodeRepository.saveAll(entities);
        return rawCodes;
    }

    private String generateBackupCode(SecureRandom random) {
        StringBuilder sb = new StringBuilder(8);
        for (int i = 0; i < 8; i++) {
            sb.append(BACKUP_CODE_CHARS.charAt(random.nextInt(BACKUP_CODE_CHARS.length())));
        }
        return sb.toString();
    }

    String encryptSecret(String rawSecret) {
        try {
            byte[] iv = new byte[GCM_IV_LENGTH];
            new SecureRandom().nextBytes(iv);
            Cipher cipher = Cipher.getInstance(AES_ALGORITHM);
            cipher.init(Cipher.ENCRYPT_MODE, getAesKey(), new GCMParameterSpec(GCM_TAG_BITS, iv));
            byte[] ciphertext = cipher.doFinal(rawSecret.getBytes(StandardCharsets.UTF_8));
            byte[] combined = new byte[iv.length + ciphertext.length];
            System.arraycopy(iv, 0, combined, 0, iv.length);
            System.arraycopy(ciphertext, 0, combined, iv.length, ciphertext.length);
            return Base64.getEncoder().encodeToString(combined);
        } catch (Exception e) {
            throw new IllegalStateException("Failed to encrypt TOTP secret", e);
        }
    }

    private String decryptSecret(String encryptedSecret) {
        try {
            byte[] combined = Base64.getDecoder().decode(encryptedSecret);
            byte[] iv = Arrays.copyOfRange(combined, 0, GCM_IV_LENGTH);
            byte[] ciphertext = Arrays.copyOfRange(combined, GCM_IV_LENGTH, combined.length);
            Cipher cipher = Cipher.getInstance(AES_ALGORITHM);
            cipher.init(Cipher.DECRYPT_MODE, getAesKey(), new GCMParameterSpec(GCM_TAG_BITS, iv));
            return new String(cipher.doFinal(ciphertext), StandardCharsets.UTF_8);
        } catch (Exception e) {
            throw new IllegalStateException("Failed to decrypt TOTP secret", e);
        }
    }

    private SecretKey getAesKey() {
        byte[] keyBytes = Base64.getDecoder().decode(appProperties.getTwoFactor().getEncryptionKey());
        if (keyBytes.length != 32) {
            throw new IllegalStateException("TWO_FACTOR_ENCRYPTION_KEY must be 32 bytes (Base64-encoded)");
        }
        return new SecretKeySpec(keyBytes, "AES");
    }

    private String hashValue(String value) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            byte[] hash = digest.digest(value.getBytes(StandardCharsets.UTF_8));
            return HexFormat.of().formatHex(hash);
        } catch (NoSuchAlgorithmException e) {
            throw new IllegalStateException("SHA-256 not available", e);
        }
    }

    private void evictExpiredOtpEntries() {
        long now = System.currentTimeMillis();
        usedOtpCache.entrySet().removeIf(e -> e.getValue() < now);
    }

    private User loadUser(Long userId) {
        return userRepository.findById(userId)
                .orElseThrow(() -> new NoSuchElementException("User not found: " + userId));
    }
}
