package aranya.crm.controller;

import aranya.crm.dto.request.InviteUserRequest;
import aranya.crm.dto.response.MeResponse;
import aranya.crm.dto.request.UpdateRolesRequest;
import aranya.crm.dto.request.UpdateUserStatusRequest;
import aranya.crm.dto.UserSummaryDto;
import aranya.crm.entity.User;
import aranya.crm.security.annotation.CurrentUser;
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
// @PreAuthorize("hasRole('MANAGER')")
public class UserController {

    private final UserService userService;

    /**
     * 当前已认证用户的角色信息。
     * 显式覆盖类级别 hasRole('MANAGER') —— 任何已认证用户都能调用 /me。
     * 这是前端 AuthContext 在初始化和登录后获取角色的入口。
     */
    @GetMapping
    public ResponseEntity<List<UserSummaryDto>> list() {
        return ResponseEntity.ok(userService.listUsers());
    }

    @PostMapping("/invite")
    public ResponseEntity<UserSummaryDto> invite(
            @CurrentUser User currentUser,
            @Valid @RequestBody InviteUserRequest request) {
        return ResponseEntity.ok(userService.invite(request, currentUser.getId()));
    }

    @PatchMapping("/{id}/roles")
    public ResponseEntity<UserSummaryDto> updateRoles(
            @CurrentUser User currentUser,
            @PathVariable Long id,
            @Valid @RequestBody UpdateRolesRequest request) {
        return ResponseEntity.ok(userService.updateRoles(id, request.getRoles(), currentUser.getId()));
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
