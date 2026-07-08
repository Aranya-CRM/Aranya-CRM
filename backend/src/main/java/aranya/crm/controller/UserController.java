package aranya.crm.controller;

import aranya.crm.dto.UserSummaryDto;
import aranya.crm.service.UserService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

/**
 * 用户列表(只读)—— 供派工负责人下拉、审批指派等非管理场景使用。
 * 账号管理与邀请(写操作)已迁至 Admin Dashboard 的 {@link AdminUserController}(/api/admin/v1/users)。
 */
@RestController
@RequestMapping("/api/v1/users")
@RequiredArgsConstructor
@PreAuthorize("isAuthenticated()")
public class UserController {
    private final UserService userService;

    /** 可指派用户列表。管理员或具备排期能力的社工均可读取(派工/指派下拉)。 */
    @GetMapping
    @PreAuthorize("@capEval.hasCap(authentication, 'admin:users.manage') or @capEval.hasCap(authentication, 'cases:services.create')")
    public ResponseEntity<List<UserSummaryDto>> list() {
        return ResponseEntity.ok(userService.listUsers());
    }
}
