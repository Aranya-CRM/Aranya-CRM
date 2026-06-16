package aranya.crm.service;

import aranya.crm.common.exception.ConflictException;
import aranya.crm.dto.request.InviteUserRequest;
import aranya.crm.dto.response.MeResponse;
import aranya.crm.dto.UserSummaryDto;
import aranya.crm.entity.Role;
import aranya.crm.entity.User;
import aranya.crm.entity.UserRole;
import aranya.crm.repository.RoleRepository;
import aranya.crm.repository.UserRepository;
import aranya.crm.repository.UserRoleRepository;
import com.google.firebase.auth.FirebaseAuth;
import com.google.firebase.auth.FirebaseAuthException;
import com.google.firebase.auth.FirebaseToken;
import com.google.firebase.auth.UserRecord;
import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.OffsetDateTime;
import java.util.HashSet;
import java.util.List;
import java.util.Optional;
import java.util.Set;

@Slf4j
@Service
@RequiredArgsConstructor
@Transactional
public class UserService {

    private final UserRepository userRepository;
    private final RoleRepository roleRepository;
    private final UserRoleRepository userRoleRepository;

    /** 邀请超过该天数仍未接受(状态仍为 INVITED),在用户列表中标记提醒。 */
    private static final long INVITE_STALE_DAYS = 3;

    @Transactional(readOnly = true)
    public List<UserSummaryDto> listUsers() {
        return userRepository.findAllWithRoles().stream()
                .filter(user -> !"DELETED".equals(user.getStatus()))
                .map(this::toDto)
                .toList();
    }

    public Optional<User> findByFirebaseUid(String firebaseUid) {
        return userRepository.findByFirebaseUid(firebaseUid);
    }

    public Optional<User> findByEmail(String email) {
        return userRepository.findByEmail(email);
    }

    @Transactional
    public User syncFromFirebase(User user, FirebaseToken token){
        boolean changed = false;

        if (token.isEmailVerified() != user.isEmailVerified()){
            user.setEmailVerified(token.isEmailVerified());
            changed = true;
        }

        String tokenName = token.getName();
        if (tokenName != null && !tokenName.equals(user.getFullName())){
            user.setFullName(tokenName);
            changed = true;
        }

        if (changed){
            userRepository.save(user);
        }
        return user;
    }

    /**
     * 首次完整登录(已通过邮箱验证 + TOTP)即视为注册完成,把 INVITED 用户激活为 ACTIVE。
     * 由 FirebaseAuthFilter 在校验通过后调用。
     */
    public User activateInvitedUser(User user) {
        user.setStatus("ACTIVE");
        log.info("Activating invited user id={} email={} -> ACTIVE", user.getId(), user.getEmail());
        return userRepository.save(user);
    }

    @Transactional(readOnly = true)
    public Optional<User> findByFirebaseUidWithRoles(String firebaseUid) {
        return userRepository.findByFirebaseUidWithRoles(firebaseUid);
    }
    /**
     * 当前已认证用户的基础 profile。
     * UI 渲染权限由 /ui/manifest 单独返回，/me 不暴露角色信息。
     */
    @Transactional(readOnly = true)
    public MeResponse getCurrentUser(User user) {
        return MeResponse.builder()
                .id(user.getId())
                .email(user.getEmail())
                .fullName(user.getFullName())
                .build();
    }

    public UserSummaryDto invite(InviteUserRequest request, Long invitedBy) {
        validateSingleRole(request.getRoles());
        userRepository.findByEmail(request.getEmail()).ifPresent(existing -> {
            // INVITED → 提示"已邀请";其余(ACTIVE/INACTIVE/DELETED)→ 提示"已存在"
            if ("INVITED".equals(existing.getStatus())) {
                throw new ConflictException("ALREADY_INVITED", "User already invited: " + request.getEmail());
            }
            throw new ConflictException("ALREADY_EXISTS", "Email already in use: " + request.getEmail());
        });
        Role role = resolveRole(request.getRoles().get(0));

        String username;
        if (request.getUsername() != null && !request.getUsername().isBlank()) {
            // 如果request中有username的话,则去重校验并添加
            username = request.getUsername().trim();
            if (userRepository.existsByUsername(username)){
                throw new DataIntegrityViolationException("Username already in use: " + username);
            }
        } else {
            username = deriveUniqueUsername(request.getEmail());
        }

        String fullName = (request.getFullName() != null && !request.getFullName().isBlank())
            ? request.getFullName().trim()
            : localPart(request.getEmail());
        // 1) 在 Firebase 创建认证账号(无密码,邮箱视为已验证——邀请来自可信邮箱)。
        //    用户随后通过设密码邮件设置登录密码。
        String firebaseUid = createFirebaseUser(request.getEmail(), fullName);

        try {
            // 2) 本地落库:状态 INVITED,首次完整登录(设密码+绑 TOTP)后由过滤器自动转 ACTIVE。
            User user = new User();
            user.setFirebaseUid(firebaseUid);
            user.setUsername(username);
            user.setFullName(fullName);
            user.setEmail(request.getEmail());
            user.setPhone(request.getPhone());
            user.setStatus("INVITED");
            user.setInvitedAt(OffsetDateTime.now());
            userRepository.save(user);

            UserRole ur = new UserRole();
            ur.setUser(user);
            ur.setRole(role);
            ur.setAssignedBy(invitedBy);
            userRoleRepository.save(ur);
            user.getUserRoles().add(ur);

            log.info("Invited user email={} uid={} role={} status=INVITED",
                    user.getEmail(), firebaseUid, role.getName());
            return toDto(user);
        } catch (RuntimeException e) {
            // 本地落库失败 → 回滚刚创建的 Firebase 账号,避免产生孤儿账号。
            deleteFirebaseUserQuietly(firebaseUid);
            throw e;
        }
    }

    /** 通过 Admin SDK 创建 Firebase 账号,返回真实 UID。邮箱已被占用等错误向上抛出。 */
    private String createFirebaseUser(String email, String fullName) {
        UserRecord.CreateRequest req = new UserRecord.CreateRequest()
                .setEmail(email)
                .setEmailVerified(true);
        if (fullName != null && !fullName.isBlank()) {
            req.setDisplayName(fullName);
        }
        try {
            return FirebaseAuth.getInstance().createUser(req).getUid();
        } catch (FirebaseAuthException e) {
            log.warn("Firebase createUser failed for {}: {}", email, e.getMessage());
            throw new DataIntegrityViolationException(
                    "Could not create auth account for " + email + ": " + e.getMessage(), e);
        }
    }

    /** 回滚补偿:删除 Firebase 账号,失败仅记录不抛出。 */
    private void deleteFirebaseUserQuietly(String uid) {
        try {
            FirebaseAuth.getInstance().deleteUser(uid);
        } catch (FirebaseAuthException e) {
            log.error("Failed to roll back Firebase user {}: {}", uid, e.getMessage());
        }
    }

    public UserSummaryDto updateRoles(Long userId, List<String> roleNames, Long assignedBy) {
        validateSingleRole(roleNames);
        User user = userRepository.findByIdWithRoles(userId)
                .orElseThrow(() -> new EntityNotFoundException("User not found: " + userId));
        Role role = resolveRole(roleNames.get(0));

        // 先把旧的 UserRole 全部删掉再插入新的 — 显式 flush 避免唯一约束冲突
        userRoleRepository.deleteByUserId(userId);
        userRoleRepository.flush();
        user.getUserRoles().clear();

        UserRole ur = new UserRole();
        ur.setUser(user);
        ur.setRole(role);
        ur.setAssignedBy(assignedBy);
        user.getUserRoles().add(ur);
        log.info("Updated roles for userId={} -> {}", userId, roleNames);
        return toDto(user);
    }

    public UserSummaryDto updateStatus(Long userId, String status) {
        User user = userRepository.findByIdWithRoles(userId)
                .orElseThrow(() -> new EntityNotFoundException("User not found: " + userId));
        user.setStatus(status);
        log.info("Updated status for userId={} -> {}", userId, status);
        return toDto(user);
    }

    public void executeApprovedDeleteUser(Long userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new EntityNotFoundException("User not found: " + userId));
        // Soft delete: 标记 DELETED 并从管理列表隐藏，保留审计痕迹。
        user.setStatus("DELETED");
        log.info("Soft-deleted userId={}", userId);
    }

    private void validateSingleRole(List<String> roleNames) {
        Set<String> uniqueRoleNames = new HashSet<>(roleNames);
        if (uniqueRoleNames.size() != 1) {
            throw new IllegalArgumentException("Exactly one role must be selected");
        }
    }

    private Role resolveRole(String roleName) {
        return roleRepository.findByName(roleName)
                .orElseThrow(() -> new IllegalArgumentException("Unknown role: " + roleName));
    }

    /** 邀请仍处 INVITED 且超过阈值天数 → 标记为超期未接受,提醒 MANAGER 手动清理。 */
    private boolean isInviteStale(User user) {
        return "INVITED".equals(user.getStatus())
                && user.getInvitedAt() != null
                && user.getInvitedAt().isBefore(OffsetDateTime.now().minusDays(INVITE_STALE_DAYS));
    }

    private String localPart(String email) {
        int at = email.indexOf('@');
        return at > 0 ? email.substring(0,at):email;
    }

    private String deriveUniqueUsername(String email) {
        String base = localPart(email);
        if (base.length() > 50){
            base = base.substring(0,50);
        }
        String candidate = base;
        int i = 1;
        while (userRepository.existsByUsername(candidate)) {
            String suffix = String.valueOf(i++);
            int keep = Math.min(base.length(),50 - suffix.length());
            candidate = base.substring(0,keep)+suffix;
        }
        return candidate;
    }

    private UserSummaryDto toDto(User user) {
        List<String> roleNames = user.getUserRoles().stream()
                .map(ur -> ur.getRole().getName())
                .toList();
        return UserSummaryDto.builder()
                .id(user.getId())
                .username(user.getUsername())
                .email(user.getEmail())
                .fullName(user.getFullName())
                .status(user.getStatus())
                .roles(roleNames)
                .invitedAt(user.getInvitedAt())
                .inviteStale(isInviteStale(user))
                .build();
    }

}
