package aranya.crm.security.model;

import lombok.AllArgsConstructor;
import lombok.Getter;


/**
 * 当前认证用户的载体对象。
 * 由 FirebaseAuthFilter 在每个请求中创建,放入 SecurityContext。
 * Controller 通过 @CurrentUser 注解或 SecurityContextHolder 获取。
 * 注意:这里只包含 Firebase Token 中的字段,不掺业务字段(role 等)。
 * 业务字段在 User 模块实现后,通过 service 层从 PostgreSQL 加载。
 */
@Getter
@AllArgsConstructor
public class FirebaseUserPrincipal{

    private String firebaseUid;
    private String email;
    private boolean emailVerified;
    private String signInProvider; // "google.com" or "password"
    private String signInSecondFactor; // "totp" or null

}
