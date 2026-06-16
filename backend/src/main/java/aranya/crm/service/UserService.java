package aranya.crm.service;

import aranya.crm.dto.request.InviteUserRequest;
import aranya.crm.dto.response.MeResponse;
import aranya.crm.dto.UserSummaryDto;
import aranya.crm.entity.Role;
import aranya.crm.entity.User;
import aranya.crm.entity.UserRole;
import aranya.crm.repository.RoleRepository;
import aranya.crm.repository.UserRepository;
import aranya.crm.repository.UserRoleRepository;
import com.google.firebase.auth.FirebaseToken;
import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.HashSet;
import java.util.List;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
@Transactional
public class UserService {

    private final UserRepository userRepository;
    private final RoleRepository roleRepository;
    private final UserRoleRepository userRoleRepository;

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
        if (userRepository.existsByEmail(request.getEmail())) {
            throw new DataIntegrityViolationException("Email already in use: " + request.getEmail());
        }
        if (userRepository.existsByUsername(request.getUsername())) {
            throw new DataIntegrityViolationException("Username already in use: " + request.getUsername());
        }
        Role role = resolveRole(request.getRoles().get(0));

        User user = new User();
        user.setFirebaseUid("pending:" + UUID.randomUUID());
        user.setUsername(request.getUsername());
        user.setFullName(request.getFullName());
        user.setEmail(request.getEmail());
        user.setPhone(request.getPhone());
        user.setStatus("ACTIVE");
        userRepository.save(user);

        UserRole ur = new UserRole();
        ur.setUser(user);
        ur.setRole(role);
        ur.setAssignedBy(invitedBy);
        user.getUserRoles().add(ur);

        // TODO: send invitation email containing temp password / set-password link.
        // Never log the temporary password.
        log.info("Invited user email={} (TODO: email)", user.getEmail());

        return toDto(user);
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
                .build();
    }

}
