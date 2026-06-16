package aranya.crm.service;

import aranya.crm.common.exception.ConflictException;
import aranya.crm.dto.UserSummaryDto;
import aranya.crm.dto.request.InviteUserRequest;
import aranya.crm.dto.response.MeResponse;
import aranya.crm.entity.Role;
import aranya.crm.entity.User;
import aranya.crm.entity.UserRole;
import aranya.crm.repository.RoleRepository;
import aranya.crm.repository.UserRepository;
import aranya.crm.repository.UserRoleRepository;
import com.google.firebase.auth.FirebaseAuth;
import com.google.firebase.auth.FirebaseAuthException;
import com.google.firebase.auth.UserRecord;
import jakarta.persistence.EntityNotFoundException;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.MockedStatic;
import org.mockito.Mockito;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
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
        User removed = user(3L, "removed", "removed@test.com", "Removed User", "DELETED");

        when(userRepository.findAllWithRoles()).thenReturn(List.of(manager, removed));

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
    @DisplayName("invite creates an INVITED user with a real Firebase UID and assigns one requested role")
    void invite_createsInvitedUserAndAssignsRequestedRoles() throws FirebaseAuthException {
        InviteUserRequest request = inviteRequest(List.of("MANAGER"));
        Role manager = role("MANAGER");

        when(userRepository.findByEmail("new.user@test.com")).thenReturn(Optional.empty());
        when(userRepository.existsByUsername("newuser")).thenReturn(false);
        when(roleRepository.findByName("MANAGER")).thenReturn(Optional.of(manager));
        when(userRepository.save(any(User.class))).thenAnswer(invocation -> {
            User saved = invocation.getArgument(0);
            saved.setId(10L);
            return saved;
        });

        try (MockedStatic<FirebaseAuth> firebaseAuthStatic = Mockito.mockStatic(FirebaseAuth.class)) {
            FirebaseAuth firebaseAuth = Mockito.mock(FirebaseAuth.class);
            UserRecord record = Mockito.mock(UserRecord.class);
            when(record.getUid()).thenReturn("firebase-uid-123");
            when(firebaseAuth.createUser(any(UserRecord.CreateRequest.class))).thenReturn(record);
            firebaseAuthStatic.when(FirebaseAuth::getInstance).thenReturn(firebaseAuth);

            UserSummaryDto result = userService.invite(request, 99L);

            ArgumentCaptor<User> userCaptor = ArgumentCaptor.forClass(User.class);
            verify(userRepository).save(userCaptor.capture());
            User savedUser = userCaptor.getValue();

            assertThat(savedUser.getUsername()).isEqualTo("newuser");
            assertThat(savedUser.getFullName()).isEqualTo("New User");
            assertThat(savedUser.getEmail()).isEqualTo("new.user@test.com");
            assertThat(savedUser.getPhone()).isEqualTo("91234567");
            assertThat(savedUser.getStatus()).isEqualTo("INVITED");
            assertThat(savedUser.getFirebaseUid()).isEqualTo("firebase-uid-123");
            assertThat(savedUser.getUserRoles()).hasSize(1);
            assertThat(savedUser.getUserRoles())
                    .extracting(userRole -> userRole.getRole().getName())
                    .containsExactly("MANAGER");
            assertThat(savedUser.getUserRoles())
                    .allSatisfy(userRole -> assertThat(userRole.getAssignedBy()).isEqualTo(99L));

            assertThat(result.getId()).isEqualTo(10L);
            assertThat(result.getRoles()).containsExactly("MANAGER");
        }
    }

    @Test
    @DisplayName("invite rejects multiple roles")
    void invite_rejectsMultipleRoles() {
        InviteUserRequest request = inviteRequest(List.of("MANAGER", "VOLUNTEER"));

        assertThatThrownBy(() -> userService.invite(request, 99L))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessage("Exactly one role must be selected");
    }

    @Test
    @DisplayName("invite rejects an ACTIVE duplicate email with ALREADY_EXISTS before resolving roles")
    void invite_rejectsDuplicateEmailBeforeResolvingRoles() {
        InviteUserRequest request = inviteRequest(List.of("MANAGER"));
        User existing = user(5L, "existing", "new.user@test.com", "Existing User", "ACTIVE");
        when(userRepository.findByEmail("new.user@test.com")).thenReturn(Optional.of(existing));

        assertThatThrownBy(() -> userService.invite(request, 99L))
                .isInstanceOf(ConflictException.class)
                .hasMessageContaining("Email already in use");

        verify(userRepository, never()).save(any());
        verifyNoInteractions(roleRepository);
    }

    @Test
    @DisplayName("invite rejects an INVITED duplicate email with ALREADY_INVITED")
    void invite_rejectsAlreadyInvitedEmail() {
        InviteUserRequest request = inviteRequest(List.of("MANAGER"));
        User existing = user(6L, "pending", "new.user@test.com", "Pending User", "INVITED");
        when(userRepository.findByEmail("new.user@test.com")).thenReturn(Optional.of(existing));

        assertThatThrownBy(() -> userService.invite(request, 99L))
                .isInstanceOf(ConflictException.class)
                .satisfies(ex -> assertThat(((ConflictException) ex).getCode()).isEqualTo("ALREADY_INVITED"));

        verify(userRepository, never()).save(any());
        verifyNoInteractions(roleRepository);
    }

    @Test
    @DisplayName("updateRoles replaces existing role and returns one role name")
    void updateRoles_replacesExistingRolesAndReturnsNewRoleNames() {
        User user = user(10L, "newuser", "new.user@test.com", "New User", "ACTIVE");
        user.getUserRoles().add(userRole(user, role("VOLUNTEER"), 1L));

        when(userRepository.findByIdWithRoles(10L)).thenReturn(Optional.of(user));
        when(roleRepository.findByName("MANAGER")).thenReturn(Optional.of(role("MANAGER")));

        UserSummaryDto result = userService.updateRoles(10L, List.of("MANAGER"), 99L);

        verify(userRoleRepository).deleteByUserId(10L);
        verify(userRoleRepository).flush();
        assertThat(user.getUserRoles()).hasSize(1);
        assertThat(result.getRoles()).containsExactly("MANAGER");
    }

    @Test
    @DisplayName("updateRoles rejects multiple roles")
    void updateRoles_rejectsMultipleRoles() {
        assertThatThrownBy(() -> userService.updateRoles(10L, List.of("MANAGER", "VOLUNTEER"), 99L))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessage("Exactly one role must be selected");

        verifyNoInteractions(userRoleRepository);
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
    @DisplayName("deleteUser soft deletes by marking user deleted")
    void deleteUser_softDeletesByMarkingUserDeleted() {
        User user = user(10L, "newuser", "new.user@test.com", "New User", "ACTIVE");
        when(userRepository.findById(10L)).thenReturn(Optional.of(user));

        userService.deleteUser(10L);

        assertThat(user.getStatus()).isEqualTo("DELETED");
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
