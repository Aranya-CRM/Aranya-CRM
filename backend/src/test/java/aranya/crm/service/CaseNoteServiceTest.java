package aranya.crm.service;

import aranya.crm.dto.response.CaseNoteResponse;
import aranya.crm.dto.request.CreateCaseNoteRequest;
import aranya.crm.entity.CaseNote;
import aranya.crm.entity.Client;
import aranya.crm.entity.ClientCase;
import aranya.crm.entity.User;
import aranya.crm.repository.CaseNoteRepository;
import aranya.crm.repository.CaseRepository;
import jakarta.persistence.EntityNotFoundException;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.when;
import static org.mockito.Mockito.verify;
import static org.mockito.ArgumentMatchers.any;

@ExtendWith(MockitoExtension.class)
class CaseNoteServiceTest {

    @Mock
    private CaseRepository caseRepository;

    @Mock
    private CaseNoteRepository caseNoteRepository;

    @InjectMocks
    private CaseNoteService caseNoteService;

    @Test
    @DisplayName("listCaseNotes maps notes for the requested case")
    void listCaseNotes_mapsNotesForRequestedCase() {
        ClientCase clientCase = clientCase(12L);
        User creator = user(9L, "Volunteer User");
        CaseNote note = note(22L, clientCase, creator);

        when(caseRepository.existsById(12L)).thenReturn(true);
        when(caseNoteRepository.findByClientCaseIdOrderByCreatedAtDescIdDesc(12L)).thenReturn(List.of(note));

        List<CaseNoteResponse> response = caseNoteService.listCaseNotes(12L);

        assertThat(response).hasSize(1);
        assertThat(response.get(0).getId()).isEqualTo("22");
        assertThat(response.get(0).getCaseId()).isEqualTo("12");
        assertThat(response.get(0).getDate()).isEqualTo("2026-05-20");
        assertThat(response.get(0).getRecordedBy()).isEqualTo("Volunteer User");
        assertThat(response.get(0).getContent()).isEqualTo("Report submitted after visit.");
        assertThat(response.get(0).getFollowUp()).isEmpty();
        assertThat(response.get(0).getCreatedAt()).isEqualTo(LocalDateTime.of(2026, 5, 20, 10, 30));
    }

    @Test
    @DisplayName("listCaseNotes throws when the case does not exist")
    void listCaseNotes_throwsWhenCaseDoesNotExist() {
        when(caseRepository.existsById(404L)).thenReturn(false);

        assertThatThrownBy(() -> caseNoteService.listCaseNotes(404L))
                .isInstanceOf(EntityNotFoundException.class)
                .hasMessage("Case not found: 404");
    }

    @Test
    @DisplayName("listOwnCaseNotes maps only notes for the current user")
    void listOwnCaseNotes_mapsOnlyNotesForCurrentUser() {
        ClientCase clientCase = clientCase(12L);
        User creator = user(9L, "Volunteer User");
        CaseNote note = note(22L, clientCase, creator);

        when(caseRepository.existsById(12L)).thenReturn(true);
        when(caseNoteRepository.findByClientCaseIdAndCreatedByIdOrderByCreatedAtDescIdDesc(12L, 9L))
                .thenReturn(List.of(note));

        List<CaseNoteResponse> response = caseNoteService.listOwnCaseNotes(12L, creator);

        assertThat(response).hasSize(1);
        assertThat(response.get(0).getRecordedBy()).isEqualTo("Volunteer User");
        assertThat(response.get(0).getContent()).isEqualTo("Report submitted after visit.");
    }

    @Test
    @DisplayName("createCaseNote stores a volunteer note for the current user")
    void createCaseNote_storesVolunteerNoteForCurrentUser() {
        ClientCase clientCase = clientCase(12L);
        User creator = user(9L, "Volunteer User");
        CreateCaseNoteRequest request = new CreateCaseNoteRequest();
        request.setContent("  Followed up with temple contact.  ");
        request.setFollowUp("  Call again next week. ");

        when(caseRepository.findById(12L)).thenReturn(Optional.of(clientCase));
        when(caseNoteRepository.save(any(CaseNote.class))).thenAnswer(invocation -> {
            CaseNote saved = invocation.getArgument(0);
            saved.setId(33L);
            saved.setCreatedAt(LocalDateTime.of(2026, 5, 21, 11, 0));
            return saved;
        });

        CaseNoteResponse response = caseNoteService.createCaseNote(12L, request, creator);

        assertThat(response.getId()).isEqualTo("33");
        assertThat(response.getCaseId()).isEqualTo("12");
        assertThat(response.getContent()).isEqualTo("Followed up with temple contact.");
        assertThat(response.getFollowUp()).isEqualTo("Call again next week.");
        assertThat(response.getRecordedBy()).isEqualTo("Volunteer User");
        verify(caseNoteRepository).save(any(CaseNote.class));
    }

    @Test
    @DisplayName("deleteOwnCaseNote deletes a note created by the current user")
    void deleteOwnCaseNote_deletesNoteCreatedByCurrentUser() {
        User creator = user(9L, "Volunteer User");
        CaseNote note = note(22L, clientCase(12L), creator);
        when(caseNoteRepository.findByIdAndCreatedById(22L, 9L)).thenReturn(Optional.of(note));

        caseNoteService.deleteOwnCaseNote(22L, creator);

        verify(caseNoteRepository).delete(note);
    }

    @Test
    @DisplayName("deleteOwnCaseNote throws when the note is not owned by current user")
    void deleteOwnCaseNote_throwsWhenNoteIsNotOwnedByCurrentUser() {
        User creator = user(9L, "Volunteer User");
        when(caseNoteRepository.findByIdAndCreatedById(404L, 9L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> caseNoteService.deleteOwnCaseNote(404L, creator))
                .isInstanceOf(EntityNotFoundException.class)
                .hasMessage("Case note not found: 404");
    }

    private static CaseNote note(Long id, ClientCase clientCase, User creator) {
        CaseNote note = new CaseNote();
        note.setId(id);
        note.setClientCase(clientCase);
        note.setNoteType("REPORT");
        note.setContent("Report submitted after visit.");
        note.setCreatedBy(creator);
        note.setCreatedAt(LocalDateTime.of(2026, 5, 20, 10, 30));
        return note;
    }

    private static ClientCase clientCase(Long id) {
        Client client = new Client();
        client.setId(5L);
        client.setAbbr("C5");
        client.setNameEn("Venerable Dev Test");
        client.setMembershipStatus("ACTIVE");

        ClientCase clientCase = new ClientCase();
        clientCase.setId(id);
        clientCase.setClient(client);
        clientCase.setCaseCode("CASE-2026-012");
        clientCase.setTitle("Test case");
        clientCase.setCreatedBy(user(1L, "Manager User"));
        clientCase.setOpenedAt(LocalDateTime.of(2026, 5, 1, 9, 0));
        clientCase.setCreatedAt(LocalDateTime.of(2026, 5, 1, 9, 0));
        return clientCase;
    }

    private static User user(Long id, String fullName) {
        User user = new User();
        user.setId(id);
        user.setUsername("user-" + id);
        user.setEmail("user" + id + "@test.com");
        user.setFullName(fullName);
        user.setStatus("ACTIVE");
        return user;
    }
}
