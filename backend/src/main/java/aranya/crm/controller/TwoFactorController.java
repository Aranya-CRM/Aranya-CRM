package aranya.crm.controller;

import aranya.crm.dto.*;
import aranya.crm.security.model.UserPrincipal;
import aranya.crm.service.AuthService;
import aranya.crm.service.TwoFactorService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/auth/2fa")
@RequiredArgsConstructor
public class TwoFactorController {

    private final TwoFactorService twoFactorService;
    private final AuthService authService;

    @GetMapping("/setup")
    public ResponseEntity<TwoFactorSetupResponse> setup(
            @AuthenticationPrincipal UserPrincipal principal) {
        return ResponseEntity.ok(twoFactorService.generateSetup(principal.getEmail()));
    }

    @PostMapping("/enable")
    public ResponseEntity<BackupCodesResponse> enable(
            @AuthenticationPrincipal UserPrincipal principal,
            @Valid @RequestBody TwoFactorEnableRequest request) {
        return ResponseEntity.ok(
                new BackupCodesResponse(twoFactorService.enableTwoFactor(principal.getId(), request)));
    }

    @PostMapping("/verify")
    public ResponseEntity<LoginResponse> verify(
            @Valid @RequestBody TwoFactorVerifyRequest request) {
        return ResponseEntity.ok(authService.verifyTwoFactor(request));
    }

    @PostMapping("/disable")
    public ResponseEntity<Void> disable(
            @AuthenticationPrincipal UserPrincipal principal,
            @Valid @RequestBody TwoFactorDisableRequest request) {
        twoFactorService.disableTwoFactor(principal.getId(), request);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/backup-codes")
    public ResponseEntity<BackupCodesResponse> regenerateBackupCodes(
            @AuthenticationPrincipal UserPrincipal principal) {
        return ResponseEntity.ok(
                new BackupCodesResponse(twoFactorService.regenerateBackupCodes(principal.getId())));
    }
}
