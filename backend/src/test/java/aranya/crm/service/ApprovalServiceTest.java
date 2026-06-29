package aranya.crm.service;

import aranya.crm.dto.response.ApprovalRequestResponse;
import aranya.crm.entity.ApprovalRequest;
import aranya.crm.entity.Role;
import aranya.crm.entity.User;
import aranya.crm.entity.UserRole;
import aranya.crm.repository.ApprovalRequestRepository;
import aranya.crm.repository.UserRepository;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.JsonNodeFactory;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;
import jakarta.persistence.EntityNotFoundException;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.Spy;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.jdbc.core.JdbcTemplate;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class ApprovalServiceTest {

    @Mock
    private ApprovalRequestRepository approvalRequestRepository;

    @Spy
    private ObjectMapper objectMapper = new ObjectMapper().registerModule(new JavaTimeModule());

    @Mock
    private ApprovalActionRegistry approvalActionRegistry;

    @Mock
    private JdbcTemplate jdbcTemplate;

    @Mock
    private UserRepository userRepository;

    @InjectMocks
    private ApprovalService approvalService;

    @BeforeEach
    void setUp() {
        lenient().when(jdbcTemplate.queryForList(anyString(), eq(String.class), any()))
                .thenReturn(List.of("C001 · Test Client"));
    }

    @Test
    @DisplayName("createRequest stores a pending approval request with serialized payload")
    void createRequest_storesPendingRequestWithSerializedPayload() {
        User requester = user(10L, "Social Worker");
        stubLoadUser(requester);
        when(approvalActionRegistry.supports("CASE_CREATE")).thenReturn(true);
        when(approvalRequestRepository.save(any(ApprovalRequest.class))).thenAnswer(invocation -> {
            ApprovalRequest saved = invocation.getArgument(0);
            saved.setId(99L);
            saved.setCreatedAt(LocalDateTime.of(2026, 6, 15, 9, 0));
            return saved;
        });

        ApprovalRequestResponse result = approvalService.createRequest(
                "CASE_CREATE",
                "CLIENT",
                5L,
                Map.of("clientId", 5L, "status", "OPEN"),
                requester
        );

        ArgumentCaptor<ApprovalRequest> captor = ArgumentCaptor.forClass(ApprovalRequest.class);
        verify(approvalRequestRepository).save(captor.capture());
        ApprovalRequest saved = captor.getValue();

        assertThat(saved.getType()).isEqualTo("CASE_CREATE");
        assertThat(saved.getStatus()).isEqualTo("PENDING");
        assertThat(saved.getTargetType()).isEqualTo("CLIENT");
        assertThat(saved.getTargetId()).isEqualTo(5L);
        assertThat(saved.getPayloadJson().toString()).contains("\"clientId\":5");
        assertThat(saved.getIdempotencyKey()).isNotBlank();
        assertThat(saved.getRequestedBy()).isSameAs(requester);
        assertThat(result.getId()).isEqualTo(99L);
        assertThat(result.getRequestedByName()).isEqualTo("Social Worker");
        assertThat(result.getTargetLabel()).isEqualTo("C001 · Test Client");
    }

    @Test
    @DisplayName("listPending exposes case code as target label")
    void listPending_exposesCaseCodeAsTargetLabel() {
        User viewer = user(30L, "Viewer", "VIEW_MANAGER");
        ApprovalRequest request = request(7L, "DELETE_CASE", "PENDING", user(10L, "Requester"));
        request.setTargetType("CASE");
        request.setTargetId(12L);
        when(jdbcTemplate.queryForList(anyString(), eq(String.class), eq(12L))).thenReturn(List.of("ASDFL/2026/C/012"));
        when(approvalRequestRepository.findByStatusOrderByCreatedAtAscIdAsc("PENDING")).thenReturn(List.of(request));
        stubLoadUser(viewer);

        List<ApprovalRequestResponse> result = approvalService.listPending(viewer);

        assertThat(result).hasSize(1);
        assertThat(result.get(0).getTargetLabel()).isEqualTo("ASDFL/2026/C/012");
    }

    @Test
    @DisplayName("createRequest returns an existing pending request for the same approval payload")
    void createRequest_returnsExistingPendingRequestForSamePayload() {
        User requester = user(10L, "Social Worker");
        ApprovalRequest existing = request(88L, "CASE_CREATE", "PENDING", requester);
        existing.setIdempotencyKey("existing-key");

        stubLoadUser(requester);
        when(approvalActionRegistry.supports("CASE_CREATE")).thenReturn(true);
        when(approvalRequestRepository.findFirstByStatusAndIdempotencyKeyOrderByCreatedAtAscIdAsc(eq("PENDING"), any()))
                .thenReturn(Optional.of(existing));

        ApprovalRequestResponse result = approvalService.createRequest(
                "CASE_CREATE",
                "CLIENT",
                5L,
                Map.of("clientId", 5L, "status", "OPEN"),
                requester
        );

        assertThat(result.getId()).isEqualTo(88L);
        verify(approvalRequestRepository, never()).save(any(ApprovalRequest.class));
    }

    @Test
    @DisplayName("createRequest rejects unknown approval types")
    void createRequest_rejectsUnknownType() {
        User requester = user(10L, "Requester");
        stubLoadUser(requester);
        when(approvalActionRegistry.supports("UNKNOWN")).thenReturn(false);

        assertThatThrownBy(() -> approvalService.createRequest("UNKNOWN", null, null, null, requester))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessage("Unsupported approval type: UNKNOWN");
    }

    @Test
    @DisplayName("listPending shows business pending requests to users who can view that content")
    void listPending_showsBusinessPendingRequestsToViewers() {
        User requester = user(10L, "Requester", "SOCIAL_WORKER");
        User viewer = user(30L, "Viewer", "VIEW_MANAGER");
        ApprovalRequest clientCreate = request(1L, "CLIENT_CREATE", "PENDING", requester);
        ApprovalRequest caseService = request(2L, "CASE_SERVICE_UPDATE", "PENDING", requester);
        caseService.setTargetType("CASE");
        caseService.setTargetId(7L);
        when(approvalRequestRepository.findByStatusOrderByCreatedAtAscIdAsc("PENDING"))
                .thenReturn(List.of(clientCreate, caseService));
        stubLoadUser(viewer);

        List<ApprovalRequestResponse> result = approvalService.listPending(viewer);

        assertThat(result).extracting(ApprovalRequestResponse::getId).containsExactly(1L, 2L);
    }

    @Test
    @DisplayName("listPending returns pending requests ordered by repository query")
    void listPending_returnsPendingRequests() {
        User viewer = user(30L, "Viewer", "VIEW_MANAGER");
        ApprovalRequest request = request(7L, "CASE_SERVICE_UPDATE", "PENDING", user(10L, "Requester"));
        when(approvalRequestRepository.findByStatusOrderByCreatedAtAscIdAsc("PENDING")).thenReturn(List.of(request));
        stubLoadUser(viewer);

        List<ApprovalRequestResponse> result = approvalService.listPending(viewer);

        assertThat(result).hasSize(1);
        assertThat(result.get(0).getId()).isEqualTo(7L);
        assertThat(result.get(0).getType()).isEqualTo("CASE_SERVICE_UPDATE");
        verify(approvalRequestRepository).findByStatusOrderByCreatedAtAscIdAsc("PENDING");
    }

    @Test
    @DisplayName("hasPendingRequest checks pending request existence by type and target")
    void hasPendingRequest_checksPendingRequestExistenceByTypeAndTarget() {
        when(approvalRequestRepository.existsByStatusAndTypeAndTargetTypeAndTargetId(
                "PENDING", "CASE_CREATE", "CLIENT", 5L))
                .thenReturn(true);

        assertThat(approvalService.hasPendingRequest("CASE_CREATE", "CLIENT", 5L)).isTrue();
    }

    @Test
    @DisplayName("approve marks a pending request as approved")
    void approve_marksPendingRequestApproved() {
        ApprovalRequest request = request(7L, "CASE_CREATE", "PENDING", user(10L, "Requester"));
        User manager = user(20L, "Manager");
        when(approvalRequestRepository.findById(7L)).thenReturn(Optional.of(request));
        stubLoadUser(manager);

        ApprovalRequestResponse result = approvalService.approve(7L, manager, "Looks valid");

        assertThat(request.getStatus()).isEqualTo("APPROVED");
        assertThat(request.getDecidedBy()).isSameAs(manager);
        assertThat(request.getDecisionComment()).isEqualTo("Looks valid");
        assertThat(request.getDecidedAt()).isNotNull();
        assertThat(result.getStatus()).isEqualTo("APPROVED");
        assertThat(result.getDecidedByName()).isEqualTo("Manager");
        verify(approvalActionRegistry).execute(request, manager);
    }

    @Test
    @DisplayName("reject marks a pending request as rejected")
    void reject_marksPendingRequestRejected() {
        ApprovalRequest request = request(8L, "DELETE_REPORT", "PENDING", user(10L, "Requester"));
        User manager = user(20L, "Manager");
        when(approvalRequestRepository.findById(8L)).thenReturn(Optional.of(request));
        stubLoadUser(manager);

        ApprovalRequestResponse result = approvalService.reject(8L, manager, "Missing reason");

        assertThat(request.getStatus()).isEqualTo("REJECTED");
        assertThat(request.getDecidedBy()).isSameAs(manager);
        assertThat(request.getDecisionComment()).isEqualTo("Missing reason");
        assertThat(result.getStatus()).isEqualTo("REJECTED");
    }

    @Test
    @DisplayName("approve throws when request does not exist")
    void approve_throwsWhenRequestDoesNotExist() {
        User manager = user(20L, "Manager");
        when(approvalRequestRepository.findById(404L)).thenReturn(Optional.empty());
        stubLoadUser(manager);

        assertThatThrownBy(() -> approvalService.approve(404L, manager, null))
                .isInstanceOf(EntityNotFoundException.class)
                .hasMessage("Approval request not found: 404");
    }

    @Test
    @DisplayName("reject throws when request is not pending")
    void reject_throwsWhenRequestIsNotPending() {
        ApprovalRequest request = request(8L, "DELETE_REPORT", "APPROVED", user(10L, "Requester"));
        User manager = user(20L, "Manager");
        when(approvalRequestRepository.findById(8L)).thenReturn(Optional.of(request));
        stubLoadUser(manager);

        assertThatThrownBy(() -> approvalService.reject(8L, manager, null))
                .isInstanceOf(IllegalStateException.class)
                .hasMessage("Only pending approval requests can be decided");
    }

    private ApprovalRequest request(Long id, String type, String status, User requester) {
        ApprovalRequest request = new ApprovalRequest();
        request.setId(id);
        request.setType(type);
        request.setStatus(status);
        request.setTargetType("CLIENT");
        request.setTargetId(5L);
        request.setPayloadJson(JsonNodeFactory.instance.objectNode().put("clientId", 5));
        request.setRequestedBy(requester);
        request.setCreatedAt(LocalDateTime.of(2026, 6, 15, 9, 0));
        return request;
    }

    private User user(Long id, String fullName) {
        return user(id, fullName, new String[0]);
    }

    private User user(Long id, String fullName, String... roles) {
        User user = new User();
        user.setId(id);
        user.setFullName(fullName);
        user.setUsername("user" + id);
        user.setEmail("user" + id + "@test.com");
        for (String roleName : roles) {
            Role role = new Role();
            role.setName(roleName);
            UserRole userRole = new UserRole();
            userRole.setUser(user);
            userRole.setRole(role);
            user.getUserRoles().add(userRole);
        }
        return user;
    }

    private void stubLoadUser(User user) {
        when(userRepository.findByIdWithRoles(user.getId())).thenReturn(Optional.of(user));
    }
}
