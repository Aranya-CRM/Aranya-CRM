package aranya.crm.controller;

import aranya.crm.service.UiManifestService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

@RestController
@RequestMapping("/api/v1/ui")
@RequiredArgsConstructor
public class UiManifestController {

    private final UiManifestService uiManifestService;

    @GetMapping("/manifest")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<Map<String, Object>> getManifest(Authentication authentication) {
        return ResponseEntity.ok(uiManifestService.buildManifest(authentication));
    }
}
