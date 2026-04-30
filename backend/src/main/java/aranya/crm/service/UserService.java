package aranya.crm.service;

import aranya.crm.dto.InviteUserRequest;
import aranya.crm.dto.UserSummaryDto;
import aranya.crm.entity.Role;
import aranya.crm.entity.User;
import aranya.crm.entity.UserRole;
import aranya.crm.repository.RoleRepository;
import aranya.crm.repository.UserRepository;
import aranya.crm.repository.UserRoleRepository;
import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.security.SecureRandom;
import java.util.HashSet;
import java.util.List;
import java.util.Set;

@Slf4j
@Service
@RequiredArgsConstructor
@Transactional
public class UserService {

    private static final String TEMP_PASSWORD_ALPHABET =
            "abcdefghijkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    private static final int TEMP_PASSWORD_LENGTH = 12;
    private static final SecureRandom RANDOM = new SecureRandom();

    private final UserRepository userRepository;
    private final RoleRepository roleRepository;
    private final UserRoleRepository userRoleRepository;
    private final PasswordEncoder passwordEncoder;

    @Transactional(readOnly = true)
    public List<UserSummaryDto> listUsers() {
        return userRepository.findAllWithRoles().stream()
                .map(this::toDto)
                .toList();
    }

    public UserSummaryDto invite(InviteUserRequest request, Long invitedBy) {
        if (userRepository.existsByEmail(request.getEmail())) {
            throw new DataIntegrityViolationException("Email already in use: " + request.getEmail());
        }
        if (userRepository.existsByUsername(request.getUsername())) {
            throw new DataIntegrityViolationException("Username already in use: " + request.getUsername());
        }
        Set<Role> roles = resolveRoles(request.getRoles());

        String tempPassword = generateTempPassword();
        User user = new User();
        user.setUsername(request.getUsername());
        user.setFullName(request.getFullName());
        user.setEmail(request.getEmail());
        user.setPhone(request.getPhone());
        user.setPasswordHash(passwordEncoder.encode(tempPassword));
        user.setStatus("ACTIVE");
        userRepository.save(user);

        for (Role role : roles) {
            UserRole ur = new UserRole();
            ur.setUser(user);
            ur.setRole(role);
            ur.setAssignedBy(invitedBy);
            user.getUserRoles().add(ur);
        }

        // TODO: send invitation email containing temp password / set-password link
        log.info("Invited user email={}, tempPassword={} (TODO: email)", user.getEmail(), tempPassword);

        return toDto(user);
    }

    public UserSummaryDto updateRoles(Long userId, List<String> roleNames, Long assignedBy) {
        User user = userRepository.findByIdWithRoles(userId)
                .orElseThrow(() -> new EntityNotFoundException("User not found: " + userId));
        Set<Role> roles = resolveRoles(roleNames);

        // 先把旧的 UserRole 全部删掉再插入新的 — 显式 flush 避免唯一约束冲突
        userRoleRepository.deleteByUserId(userId);
        userRoleRepository.flush();
        user.getUserRoles().clear();

        for (Role role : roles) {
            UserRole ur = new UserRole();
            ur.setUser(user);
            ur.setRole(role);
            ur.setAssignedBy(assignedBy);
            user.getUserRoles().add(ur);
        }
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

    public void deleteUser(Long userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new EntityNotFoundException("User not found: " + userId));
        // Soft delete: 标记 INACTIVE 而不是真删，保留审计痕迹
        user.setStatus("INACTIVE");
        log.info("Soft-deleted userId={}", userId);
    }

    private Set<Role> resolveRoles(List<String> roleNames) {
        Set<Role> roles = new HashSet<>();
        for (String name : roleNames) {
            Role role = roleRepository.findByName(name)
                    .orElseThrow(() -> new IllegalArgumentException("Unknown role: " + name));
            roles.add(role);
        }
        return roles;
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

    private String generateTempPassword() {
        StringBuilder sb = new StringBuilder(TEMP_PASSWORD_LENGTH);
        for (int i = 0; i < TEMP_PASSWORD_LENGTH; i++) {
            sb.append(TEMP_PASSWORD_ALPHABET.charAt(RANDOM.nextInt(TEMP_PASSWORD_ALPHABET.length())));
        }
        return sb.toString();
    }
}
