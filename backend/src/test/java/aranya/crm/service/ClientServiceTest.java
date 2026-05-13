package aranya.crm.service;

import aranya.crm.dto.response.ClientDetailResponse;
import aranya.crm.dto.response.ClientSummaryResponse;
import aranya.crm.entity.Client;
import aranya.crm.entity.RelatedContact;
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
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
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
}
