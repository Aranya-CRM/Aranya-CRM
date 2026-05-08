package aranya.crm.service;

import aranya.crm.dto.UserSummaryDto;
import aranya.crm.dto.request.InviteUserRequest;
import aranya.crm.dto.response.MeResponse;
import aranya.crm.entity.Role;
import aranya.crm.entity.User;
import aranya.crm.entity.UserRole;
import aranya.crm.repository.RoleRepository;
import aranya.crm.repository.UserRepository;
import aranya.crm.repository.UserRoleRepository;
import jakarta.persistence.EntityNotFoundException;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.dao.DataIntegrityViolationException;

import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class UserServiceTest {

    @Mock
    private UserRepository userRepository;

    @Mock
    private RoleRepository roleRepository;

    @Mock
    private UserRoleRepository userRoleRepository;

    @InjectMocks
    private UserService userService;

    @Test
    @DisplayName("listUsers maps users and role names")
    void listUsers_mapsUsersAndRoleNames() {
        User manager = user(1L, "manager", "manager@test.com", "Manager User", "ACTIVE");
        manager.getUserRoles().add(userRole(manager, role("MANAGER"), 99L));

        when(userRepository.findAllWithRoles()).thenReturn(List.of(manager));

        List<UserSummaryDto> result = userService.listUsers();

        assertThat(result).hasSize(1);
        assertThat(result.get(0).getId()).isEqualTo(1L);
        assertThat(result.get(0).getUsername()).isEqualTo("manager");
        assertThat(result.get(0).getEmail()).isEqualTo("manager@test.com");
        assertThat(result.get(0).getRoles()).containsExactly("MANAGER");
    }

    @Test
    @DisplayName("getCurrentUser returns profile without roles")
    void getCurrentUser_returnsProfileWithoutRoles() {
        User user = user(2L, "volunteer", "volunteer@test.com", "Volunteer User", "ACTIVE");

        MeResponse result = userService.getCurrentUser(user);

        assertThat(result.getId()).isEqualTo(2L);
        assertThat(result.getEmail()).isEqualTo("volunteer@test.com");
        assertThat(result.getFullName()).isEqualTo("Volunteer User");
    }

    @Test
    @DisplayName("invite creates an active user and assigns requested roles")
    void invite_createsActiveUserAndAssignsRequestedRoles() {
        InviteUserRequest request = inviteRequest(List.of("MANAGER", "SOCIAL_WORKER"));
        Role manager = role("MANAGER");
        Role socialWorker = role("SOCIAL_WORKER");

        when(userRepository.existsByEmail("new.user@test.com")).thenReturn(false);
        when(userRepository.existsByUsername("newuser")).thenReturn(false);
        when(roleRepository.findByName("MANAGER")).thenReturn(Optional.of(manager));
        when(roleRepository.findByName("SOCIAL_WORKER")).thenReturn(Optional.of(socialWorker));
        when(userRepository.save(any(User.class))).thenAnswer(invocation -> {
            User saved = invocation.getArgument(0);
            saved.setId(10L);
            return saved;
        });

        UserSummaryDto result = userService.invite(request, 99L);

        ArgumentCaptor<User> userCaptor = ArgumentCaptor.forClass(User.class);
        verify(userRepository).save(userCaptor.capture());
        User savedUser = userCaptor.getValue();

        assertThat(savedUser.getUsername()).isEqualTo("newuser");
        assertThat(savedUser.getFullName()).isEqualTo("New User");
        assertThat(savedUser.getEmail()).isEqualTo("new.user@test.com");
        assertThat(savedUser.getPhone()).isEqualTo("91234567");
        assertThat(savedUser.getStatus()).isEqualTo("ACTIVE");
        assertThat(savedUser.getUserRoles()).hasSize(2);
        assertThat(savedUser.getUserRoles())
                .extracting(userRole -> userRole.getRole().getName())
                .containsExactlyInAnyOrder("MANAGER", "SOCIAL_WORKER");
        assertThat(savedUser.getUserRoles())
                .allSatisfy(userRole -> assertThat(userRole.getAssignedBy()).isEqualTo(99L));

        assertThat(result.getId()).isEqualTo(10L);
        assertThat(result.getRoles()).containsExactlyInAnyOrder("MANAGER", "SOCIAL_WORKER");
    }

    @Test
    @DisplayName("invite rejects duplicate email before resolving roles")
    void invite_rejectsDuplicateEmailBeforeResolvingRoles() {
        InviteUserRequest request = inviteRequest(List.of("MANAGER"));
        when(userRepository.existsByEmail("new.user@test.com")).thenReturn(true);

        assertThatThrownBy(() -> userService.invite(request, 99L))
                .isInstanceOf(DataIntegrityViolationException.class)
                .hasMessageContaining("Email already in use");

        verify(userRepository, never()).save(any());
        verifyNoInteractions(roleRepository);
    }

    @Test
    @DisplayName("updateRoles replaces existing roles and returns new role names")
    void updateRoles_replacesExistingRolesAndReturnsNewRoleNames() {
        User user = user(10L, "newuser", "new.user@test.com", "New User", "ACTIVE");
        user.getUserRoles().add(userRole(user, role("VOLUNTEER"), 1L));

        when(userRepository.findByIdWithRoles(10L)).thenReturn(Optional.of(user));
        when(roleRepository.findByName("MANAGER")).thenReturn(Optional.of(role("MANAGER")));
        when(roleRepository.findByName("SOCIAL_WORKER")).thenReturn(Optional.of(role("SOCIAL_WORKER")));

        UserSummaryDto result = userService.updateRoles(10L, List.of("MANAGER", "SOCIAL_WORKER"), 99L);

        verify(userRoleRepository).deleteByUserId(10L);
        verify(userRoleRepository).flush();
        assertThat(user.getUserRoles()).hasSize(2);
        assertThat(result.getRoles()).containsExactlyInAnyOrder("MANAGER", "SOCIAL_WORKER");
    }

    @Test
    @DisplayName("updateRoles throws when user does not exist")
    void updateRoles_throwsWhenUserDoesNotExist() {
        when(userRepository.findByIdWithRoles(404L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> userService.updateRoles(404L, List.of("MANAGER"), 99L))
                .isInstanceOf(EntityNotFoundException.class)
                .hasMessage("User not found: 404");
    }

    @Test
    @DisplayName("updateStatus changes user status")
    void updateStatus_changesUserStatus() {
        User user = user(10L, "newuser", "new.user@test.com", "New User", "ACTIVE");
        when(userRepository.findByIdWithRoles(10L)).thenReturn(Optional.of(user));

        UserSummaryDto result = userService.updateStatus(10L, "INACTIVE");

        assertThat(user.getStatus()).isEqualTo("INACTIVE");
        assertThat(result.getStatus()).isEqualTo("INACTIVE");
    }

    @Test
    @DisplayName("deleteUser soft deletes by marking user inactive")
    void deleteUser_softDeletesByMarkingUserInactive() {
        User user = user(10L, "newuser", "new.user@test.com", "New User", "ACTIVE");
        when(userRepository.findById(10L)).thenReturn(Optional.of(user));

        userService.deleteUser(10L);

        assertThat(user.getStatus()).isEqualTo("INACTIVE");
    }

    private InviteUserRequest inviteRequest(List<String> roles) {
        InviteUserRequest request = new InviteUserRequest();
        request.setUsername("newuser");
        request.setFullName("New User");
        request.setEmail("new.user@test.com");
        request.setPhone("91234567");
        request.setRoles(roles);
        return request;
    }

    private User user(Long id, String username, String email, String fullName, String status) {
        User user = new User();
        user.setId(id);
        user.setUsername(username);
        user.setEmail(email);
        user.setFullName(fullName);
        user.setStatus(status);
        return user;
    }

    private Role role(String name) {
        Role role = new Role();
        role.setName(name);
        return role;
    }

    private UserRole userRole(User user, Role role, Long assignedBy) {
        UserRole userRole = new UserRole();
        userRole.setUser(user);
        userRole.setRole(role);
        userRole.setAssignedBy(assignedBy);
        return userRole;
    }
}
