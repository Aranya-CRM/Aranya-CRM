package aranya.crm.controller;

import aranya.crm.dto.InviteUserRequest;
import aranya.crm.dto.UpdateRolesRequest;
import aranya.crm.dto.UpdateUserStatusRequest;
import aranya.crm.dto.UserSummaryDto;
import aranya.crm.security.model.FirebaseUserPrincipal;
import aranya.crm.service.UserService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/v1/users")
@RequiredArgsConstructor
@PreAuthorize("hasRole('MANAGER')")
public class UserController {

    private final UserService userService;

    @GetMapping
    public ResponseEntity<List<UserSummaryDto>> list() {
        return ResponseEntity.ok(userService.listUsers());
    }

    @PostMapping("/invite")
    public ResponseEntity<UserSummaryDto> invite(
            @AuthenticationPrincipal FirebaseUserPrincipal principal,
            @Valid @RequestBody InviteUserRequest request) {
        return ResponseEntity.ok(userService.invite(request, principal.getId()));
    }

    @PatchMapping("/{id}/roles")
    public ResponseEntity<UserSummaryDto> updateRoles(
            @AuthenticationPrincipal FirebaseUserPrincipal principal,
            @PathVariable Long id,
            @Valid @RequestBody UpdateRolesRequest request) {
        return ResponseEntity.ok(userService.updateRoles(id, request.getRoles(), principal.getId()));
    }

    @PatchMapping("/{id}/status")
    public ResponseEntity<UserSummaryDto> updateStatus(
            @PathVariable Long id,
            @Valid @RequestBody UpdateUserStatusRequest request) {
        return ResponseEntity.ok(userService.updateStatus(id, request.getStatus()));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        userService.deleteUser(id);
        return ResponseEntity.noContent().build();
    }
}
