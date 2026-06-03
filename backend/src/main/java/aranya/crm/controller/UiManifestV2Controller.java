package aranya.crm.controller;

import aranya.crm.service.UiManifestV2Service;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

@RestController
@RequestMapping("/api/v2/ui")
@RequiredArgsConstructor
public class UiManifestV2Controller {

    private final UiManifestV2Service uiManifestV2Service;

    @GetMapping("/manifest")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<Map<String, Object>> getManifest(Authentication authentication) {
        return ResponseEntity.ok(Map.of(
                "caps", uiManifestV2Service.buildCaps(authentication)
        ));
    }
}
