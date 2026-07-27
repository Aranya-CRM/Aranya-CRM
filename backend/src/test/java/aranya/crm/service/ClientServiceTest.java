package aranya.crm.service;

import aranya.crm.dto.request.CreateClientRequest;
import aranya.crm.dto.request.UpdateClientRequest;
import aranya.crm.dto.response.ClientDetailResponse;
import aranya.crm.dto.response.ClientSummaryResponse;
import aranya.crm.entity.Client;
import aranya.crm.entity.RelatedContact;
import aranya.crm.entity.User;
import aranya.crm.repository.ClientRepository;
import aranya.crm.repository.RelatedContactRepository;
import jakarta.persistence.EntityNotFoundException;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDateTime;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class ClientServiceTest {

    @Mock
    private ClientRepository clientRepository;

    @Mock
    private RelatedContactRepository relatedContactRepository;

    @InjectMocks
    private ClientService clientService;

    @Test
    @DisplayName("listClients returns searchable client summaries")
    void listClients_returnsSearchableClientSummaries() {
        Client client = new Client();
        client.setId(10L);
        client.setAbbr("C001");
        client.setNameEn("Tan Mei Lin");
        client.setNameChn("陈美玲");
        client.setContact("91234567");
        client.setPreferredCommunication("WHATSAPP");
        client.setPreferredLanguage("Mandarin");
        client.setAreaDistrict("Hougang");
        client.setBuddhistTradition("Mahayana");
        client.setOrdinationStatus("Bhikkhuni");
        client.setGender("F");
        client.setDateOfBirth(LocalDate.of(1951, 2, 21));
        client.setDateOfOrdination(LocalDate.of(1981, 5, 19));
        client.setMembershipStatus("ACTIVE");
        client.setCreatedAt(LocalDateTime.of(2026, 5, 7, 9, 30));

        when(clientRepository.searchClients("tan", "ACTIVE")).thenReturn(List.of(client));

        List<ClientSummaryResponse> response = clientService.listClients(" tan ", "ACTIVE");

        assertThat(response).hasSize(1);
        assertThat(response.get(0).getId()).isEqualTo(10L);
        assertThat(response.get(0).getAbbr()).isEqualTo("C001");
        assertThat(response.get(0).getNameEn()).isEqualTo("Tan Mei Lin");
        assertThat(response.get(0).getArea()).isEqualTo("Hougang");
        assertThat(response.get(0).getBuddhistTradition()).isEqualTo("Mahayana");
        assertThat(response.get(0).getGender()).isEqualTo("F");
        assertThat(response.get(0).getDateOfBirth()).isEqualTo(LocalDate.of(1951, 2, 21));
        assertThat(response.get(0).getDateOfOrdination()).isEqualTo(LocalDate.of(1981, 5, 19));
        verify(clientRepository).searchClients("tan", "ACTIVE");
    }

    @Test
    @DisplayName("listClients normalizes blank filters")
    void listClients_normalizesBlankFilters() {
        when(clientRepository.findAllByOrderByCreatedAtDesc()).thenReturn(List.of());

        List<ClientSummaryResponse> response = clientService.listClients("  ", "");

        assertThat(response).isEmpty();
        verify(clientRepository).findAllByOrderByCreatedAtDesc();
    }

    @Test
    @DisplayName("getClientDetail returns client profile with related contacts")
    void getClientDetail_returnsClientProfileWithRelatedContacts() {
        Client client = new Client();
        client.setId(10L);
        client.setAbbr("C001");
        client.setNameEn("Tan Mei Lin");
        client.setNameChn("陈美玲");
        client.setContact("91234567");
        client.setPreferredCommunication("WHATSAPP");
        client.setWhatsappEnabled(true);
        client.setPreferredLanguage("Mandarin");
        client.setAddressText("123 Temple Road");
        client.setMembershipStatus("ACTIVE");
        client.setCreatedAt(LocalDateTime.of(2026, 5, 7, 9, 30));

        RelatedContact contact = new RelatedContact();
        contact.setId(20L);
        contact.setName("Tan Wei");
        contact.setRelationshipType("Son");
        contact.setPhone("98765432");
        contact.setEmail("wei@example.com");
        contact.setPrimary(true);

        when(clientRepository.findById(10L)).thenReturn(Optional.of(client));
        when(relatedContactRepository.findByClientIdOrderByPrimaryDescCreatedAtAsc(10L))
                .thenReturn(List.of(contact));

        ClientDetailResponse response = clientService.getClientDetail(10L);

        assertThat(response.getId()).isEqualTo(10L);
        assertThat(response.getAbbr()).isEqualTo("C001");
        assertThat(response.getNameEn()).isEqualTo("Tan Mei Lin");
        assertThat(response.getRelatedContacts()).hasSize(1);
        assertThat(response.getRelatedContacts().get(0).getName()).isEqualTo("Tan Wei");
        verify(relatedContactRepository).findByClientIdOrderByPrimaryDescCreatedAtAsc(10L);
    }

    @Test
    @DisplayName("getClientDetail throws when client does not exist")
    void getClientDetail_throwsWhenClientDoesNotExist() {
        when(clientRepository.findById(99L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> clientService.getClientDetail(99L))
                .isInstanceOf(EntityNotFoundException.class)
                .hasMessage("Client not found: 99");
    }

    // ── listClients missing branches ─────────────────────────────────────────

    @Test
    @DisplayName("listClients with query only calls searchClients without status")
    void listClients_withQueryOnly_callsSearchClientsWithoutStatus() {
        when(clientRepository.searchClients("tan")).thenReturn(List.of());

        clientService.listClients("tan", null);

        verify(clientRepository).searchClients("tan");
    }

    @Test
    @DisplayName("listClients with status only calls findByMembershipStatus")
    void listClients_withStatusOnly_callsFindByMembershipStatus() {
        when(clientRepository.findByMembershipStatusIgnoreCaseOrderByCreatedAtDesc("ACTIVE"))
                .thenReturn(List.of());

        clientService.listClients(null, "ACTIVE");

        verify(clientRepository).findByMembershipStatusIgnoreCaseOrderByCreatedAtDesc("ACTIVE");
    }

    @Test
    @DisplayName("listClientsAvailableForCase returns active clients without active cases")
    void listClientsAvailableForCase_returnsActiveClientsWithoutActiveCases() {
        Client client = buildClient(10L, "Tan Mei Lin", "TML");
        when(clientRepository.findActiveClientsWithoutActiveCase()).thenReturn(List.of(client));

        List<ClientSummaryResponse> response = clientService.listClientsAvailableForCase();

        assertThat(response).hasSize(1);
        assertThat(response.get(0).getId()).isEqualTo(10L);
        assertThat(response.get(0).getAbbr()).isEqualTo("TML");
        verify(clientRepository).findActiveClientsWithoutActiveCase();
    }

    // ── createClient ─────────────────────────────────────────────────────────

    @Test
    @DisplayName("createClient maps request fields to client and returns detail response")
    void createClient_mapsFieldsCorrectly() {
        when(clientRepository.save(any())).thenAnswer(inv -> {
            Client c = inv.getArgument(0);
            c.setId(30L);
            return c;
        });

        Client savedClient = buildClient(30L, "Ven. Nyanatiloka", "VN");
        savedClient.setBuddhistTradition("Theravada");
        savedClient.setContact("91234567");
        when(clientRepository.findById(30L)).thenReturn(Optional.of(savedClient));
        when(relatedContactRepository.findByClientIdOrderByPrimaryDescCreatedAtAsc(30L)).thenReturn(List.of());

        CreateClientRequest req = new CreateClientRequest();
        req.setNameEn("Ven. Nyanatiloka");
        req.setAbbr("VN");
        req.setBuddhistTradition("Theravada");
        req.setContact("91234567");

        ClientDetailResponse response = clientService.createClient(req, new User());

        assertThat(response.getId()).isEqualTo(30L);
        assertThat(response.getNameEn()).isEqualTo("Ven. Nyanatiloka");
        assertThat(response.getBuddhistTradition()).isEqualTo("Theravada");
        assertThat(response.getContact()).isEqualTo("91234567");
    }

    // ── updateClient ─────────────────────────────────────────────────────────

    @Test
    @DisplayName("updateClient applies non-null fields and skips null fields (PATCH semantics)")
    void updateClient_appliesNonNullFields_andSkipsNullFields() {
        Client client = buildClient(10L, "Old Name", "C001");
        client.setNameChn("旧名字");
        when(clientRepository.findById(10L)).thenReturn(Optional.of(client));
        when(relatedContactRepository.findByClientIdOrderByPrimaryDescCreatedAtAsc(10L)).thenReturn(List.of());

        UpdateClientRequest req = new UpdateClientRequest();
        req.setNameEn("New Name");
        // nameChn not set → null → should be skipped

        ClientDetailResponse response = clientService.updateClient(10L, req);

        assertThat(client.getNameEn()).isEqualTo("New Name");
        assertThat(client.getNameChn()).isEqualTo("旧名字");
        assertThat(response.getNameEn()).isEqualTo("New Name");
        assertThat(response.getNameChn()).isEqualTo("旧名字");
        verify(clientRepository).save(client);
    }

    @Test
    @DisplayName("updateClient throws when client does not exist")
    void updateClient_throwsWhenClientDoesNotExist() {
        when(clientRepository.findById(99L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> clientService.updateClient(99L, new UpdateClientRequest()))
                .isInstanceOf(EntityNotFoundException.class)
                .hasMessage("Client not found: 99");
    }

    // ── helpers ──────────────────────────────────────────────────────────────

    private CreateClientRequest buildCreateRequest(String nameEn, String abbr) {
        CreateClientRequest req = new CreateClientRequest();
        req.setNameEn(nameEn);
        req.setAbbr(abbr);
        return req;
    }

    private Client buildClient(Long id, String nameEn, String abbr) {
        Client c = new Client();
        c.setId(id);
        c.setNameEn(nameEn);
        c.setAbbr(abbr);
        c.setMembershipStatus("ACTIVE");
        c.setCreatedAt(LocalDateTime.of(2026, 5, 21, 10, 0));
        return c;
    }
}
