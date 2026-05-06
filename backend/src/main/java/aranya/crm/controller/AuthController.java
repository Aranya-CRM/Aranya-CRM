package aranya.crm.controller;


import aranya.crm.dto.response.MeResponse;
import aranya.crm.entity.User;
import aranya.crm.security.annotation.CurrentUser;
import aranya.crm.service.UserService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;


/**
 * 认证测试接口。
 * GET /api/auth/me 返回当前认证用户的信息(从 Firebase Token 中提取)。
 * <p>
 * 这是验证整个认证链路的关键接口:
 * - 没带 Token → 401
 * - Token 无效 → 401
 * - 没走 TOTP → 428
 * - 一切正常 → 200 + 用户信息
 */

@RestController
@RequestMapping("/api/v1/auth")
@RequiredArgsConstructor
public class AuthController {
    private final UserService userService;

    @GetMapping("/me")
    public ResponseEntity<MeResponse> me(@CurrentUser User user){
        return ResponseEntity.ok(userService.getCurrentUser(user));
    }
}
