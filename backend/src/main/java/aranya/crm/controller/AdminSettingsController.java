package aranya.crm.controller;

import aranya.crm.dto.request.DocumentAccessRequest;
import aranya.crm.dto.response.DocumentAccessResponse;
import aranya.crm.entity.DocumentCategory;
import aranya.crm.entity.User;
import aranya.crm.security.annotation.CurrentUser;
import aranya.crm.service.UserCapService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.EnumSet;
import java.util.Set;

/**
 * Settings — grant additional permissions to individual users.
 *
 * Gated by {@code route:settings} (ADMIN / MANAGER / FULL_MANAGER). Currently exposes only
 * per-category case-document view grants; the underlying {@link UserCapService} restricts writes
 * to the {@code cases:documents.view.*} cap family, so no privilege-escalation grant is possible here.
 */
@RestController
@RequestMapping("/api/admin/v1/settings")
@RequiredArgsConstructor
@PreAuthorize("@capEval.hasCap(authentication, 'route:settings')")
public class AdminSettingsController {

    private final UserCapService userCapService;

    @GetMapping("/document-access/{userId}")
    public ResponseEntity<DocumentAccessResponse> getDocumentAccess(@PathVariable Long userId) {
        return ResponseEntity.ok(toResponse(userId, userCapService.getDocumentCategories(userId)));
    }

    @PutMapping("/document-access/{userId}")
    public ResponseEntity<DocumentAccessResponse> setDocumentAccess(
            @CurrentUser User currentUser,
            @PathVariable Long userId,
            @RequestBody DocumentAccessRequest request) {
        Set<DocumentCategory> categories = EnumSet.noneOf(DocumentCategory.class);
        if (request.getCategories() != null) {
            categories.addAll(request.getCategories());
        }
        userCapService.setDocumentCategories(userId, categories, currentUser != null ? currentUser.getId() : null);
        return ResponseEntity.ok(toResponse(userId, userCapService.getDocumentCategories(userId)));
    }

    private DocumentAccessResponse toResponse(Long userId, Set<DocumentCategory> categories) {
        return DocumentAccessResponse.builder()
                .userId(userId)
                .categories(categories.stream().map(Enum::name).sorted().toList())
                .build();
    }
}
