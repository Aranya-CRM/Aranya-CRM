package aranya.crm.controller;

import aranya.crm.dto.request.ProfileAccessRequest;
import aranya.crm.dto.response.ProfileAccessResponse;
import aranya.crm.entity.ClientProfileSection;
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
 * Settings — per-user sensitive client-profile section grants (pure additive model).
 *
 * Gated by {@code route:settings}. Response exposes only the section sets — never user roles.
 * Writes are whitelisted in {@link UserCapService} to the {@code clients:profile.*} cap family.
 */
@RestController
@RequestMapping("/api/admin/v1/users/{userId}/profile-access")
@RequiredArgsConstructor
@PreAuthorize("@capEval.hasCap(authentication, 'route:settings')")
public class UserProfileAccessController {

    private final UserCapService userCapService;

    @GetMapping
    public ResponseEntity<ProfileAccessResponse> getProfileAccess(@PathVariable Long userId) {
        return ResponseEntity.ok(toResponse(userId));
    }

    /** Replaces the user's editable section set atomically (full-set semantics; role baseline untouched). */
    @PutMapping
    public ResponseEntity<ProfileAccessResponse> setProfileAccess(
            @CurrentUser User currentUser,
            @PathVariable Long userId,
            @RequestBody ProfileAccessRequest request) {
        Set<ClientProfileSection> sections = EnumSet.noneOf(ClientProfileSection.class);
        if (request.getSections() != null) {
            sections.addAll(request.getSections());
        }
        userCapService.setProfileSections(userId, sections, currentUser != null ? currentUser.getId() : null);
        return ResponseEntity.ok(toResponse(userId));
    }

    private ProfileAccessResponse toResponse(Long userId) {
        return ProfileAccessResponse.builder()
                .sections(sortedNames(userCapService.getProfileSections(userId)))
                .inherited(sortedNames(userCapService.getInheritedProfileSections(userId)))
                .build();
    }

    private List<String> sortedNames(Set<ClientProfileSection> sections) {
        return sections.stream().map(Enum::name).sorted().toList();
    }
}
