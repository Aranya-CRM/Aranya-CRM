package aranya.crm.controller;

import aranya.crm.dto.request.FileAccessRequest;
import aranya.crm.dto.response.FileAccessResponse;
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
import java.util.List;
import java.util.Set;

/**
 * Settings — per-user sensitive case-file access grants (pure additive model).
 *
 * Gated by {@code route:settings}. The response deliberately exposes only the category set —
 * never user roles. Writes are whitelisted inside {@link UserCapService} to the
 * {@code cases:documents.view.*} cap family, so no privilege-escalation grant is possible here.
 */
@RestController
@RequestMapping("/api/admin/v1/users/{userId}/file-access")
@RequiredArgsConstructor
@PreAuthorize("@capEval.hasCap(authentication, 'route:settings')")
public class UserFileAccessController {

    private final UserCapService userCapService;

    @GetMapping
    public ResponseEntity<FileAccessResponse> getFileAccess(@PathVariable Long userId) {
        return ResponseEntity.ok(toResponse(userId));
    }

    /** Replaces the user's editable category set atomically (full-set semantics; role baseline untouched). */
    @PutMapping
    public ResponseEntity<FileAccessResponse> setFileAccess(
            @CurrentUser User currentUser,
            @PathVariable Long userId,
            @RequestBody FileAccessRequest request) {
        Set<DocumentCategory> categories = EnumSet.noneOf(DocumentCategory.class);
        if (request.getCategories() != null) {
            categories.addAll(request.getCategories());
        }
        userCapService.setDocumentCategories(userId, categories, currentUser != null ? currentUser.getId() : null);
        return ResponseEntity.ok(toResponse(userId));
    }

    private FileAccessResponse toResponse(Long userId) {
        return FileAccessResponse.builder()
                .categories(sortedNames(userCapService.getDocumentCategories(userId)))
                .inherited(sortedNames(userCapService.getInheritedDocumentCategories(userId)))
                .build();
    }

    private List<String> sortedNames(Set<DocumentCategory> categories) {
        return categories.stream().map(Enum::name).sorted().toList();
    }
}
