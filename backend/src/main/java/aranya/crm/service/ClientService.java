package aranya.crm.service;

import aranya.crm.dto.ClientDetailResponse;
import aranya.crm.dto.ClientSummaryResponse;
import aranya.crm.dto.RelatedContactResponse;
import aranya.crm.entity.Client;
import aranya.crm.entity.RelatedContact;
import aranya.crm.repository.ClientRepository;
import aranya.crm.repository.RelatedContactRepository;
import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class ClientService {

    private final ClientRepository clientRepository;
    private final RelatedContactRepository relatedContactRepository;

    public List<ClientSummaryResponse> listClients(String q, String membershipStatus) {
        String normalizedQuery = normalizeFilter(q);
        String normalizedStatus = normalizeFilter(membershipStatus);

        List<Client> clients;
        if (normalizedQuery == null && normalizedStatus == null) {
            clients = clientRepository.findAllByOrderByCreatedAtDesc();
        } else if (normalizedQuery == null) {
            clients = clientRepository.findByMembershipStatusIgnoreCaseOrderByCreatedAtDesc(normalizedStatus);
        } else if (normalizedStatus == null) {
            clients = clientRepository.searchClients(normalizedQuery);
        } else {
            clients = clientRepository.searchClients(normalizedQuery, normalizedStatus);
        }

        return clients.stream()
                .map(this::toClientSummaryResponse)
                .toList();
    }

    public ClientDetailResponse getClientDetail(Long clientId) {
        Client client = clientRepository.findById(clientId)
                .orElseThrow(() -> new EntityNotFoundException("Client not found: " + clientId));

        List<RelatedContactResponse> relatedContacts =
                relatedContactRepository.findByClientIdOrderByPrimaryDescCreatedAtAsc(clientId).stream()
                        .map(this::toRelatedContactResponse)
                        .toList();
        return toClientDetailResponse(client, relatedContacts);
    }

    private ClientSummaryResponse toClientSummaryResponse(Client client) {
        return ClientSummaryResponse.builder()
                .id(client.getId())
                .abbr(client.getAbbr())
                .nameEn(client.getNameEn())
                .nameChn(client.getNameChn())
                .contact(client.getContact())
                .preferredCommunication(client.getPreferredCommunication())
                .preferredLanguage(client.getPreferredLanguage())
                .area(client.getAreaDistrict())
                .buddhistTradition(client.getBuddhistTradition())
                .ordinationStatus(client.getOrdinationStatus())
                .membershipStatus(client.getMembershipStatus())
                .build();
    }

    private ClientDetailResponse toClientDetailResponse(
            Client client,
            List<RelatedContactResponse> relatedContacts
    ) {
        return ClientDetailResponse.builder()
                .id(client.getId())
                .abbr(client.getAbbr())
                .nameEn(client.getNameEn())
                .nameChn(client.getNameChn())
                .contact(client.getContact())
                .preferredCommunication(client.getPreferredCommunication())
                .whatsappEnabled(client.isWhatsappEnabled())
                .preferredLanguage(client.getPreferredLanguage())
                .spokenLanguage(client.getSpokenLanguage())
                .addressText(client.getAddressText())
                .postalCode(client.getPostalCode())
                .areaDistrict(client.getAreaDistrict())
                .viharaType(client.getViharaType())
                .gender(client.getGender())
                .dateOfBirth(client.getDateOfBirth())
                .maritalStatus(client.getMaritalStatus())
                .nationality(client.getNationality())
                .ethnicity(client.getEthnicity())
                .dialectGroup(client.getDialectGroup())
                .membershipStatus(client.getMembershipStatus())
                .dateJoined(client.getDateJoined())
                .membershipRemarks(client.getMembershipRemarks())
                .buddhistTradition(client.getBuddhistTradition())
                .ordinationStatus(client.getOrdinationStatus())
                .wellbeingLivingConditions(client.isWellbeingLivingConditions())
                .wellbeingMentalHealth(client.isWellbeingMentalHealth())
                .wellbeingPhysicalHealth(client.isWellbeingPhysicalHealth())
                .wellbeingFinancialStability(client.isWellbeingFinancialStability())
                .wellbeingSocialSupport(client.isWellbeingSocialSupport())
                .wellbeingLegalIssues(client.isWellbeingLegalIssues())
                .wellbeingSpiritual(client.isWellbeingSpiritual())
                .wellbeingRemarks(client.getWellbeingRemarks())
                .specialNeeds(client.getSpecialNeeds())
                .specialNeedsRemarks(client.getSpecialNeedsRemarks())
                .nextOfKinContact(client.getNextOfKinContact())
                .comments(client.getComments())
                .createdAt(client.getCreatedAt())
                .relatedContacts(relatedContacts)
                .build();
    }

    private RelatedContactResponse toRelatedContactResponse(RelatedContact contact) {
        return RelatedContactResponse.builder()
                .id(contact.getId())
                .name(contact.getName())
                .relationshipType(contact.getRelationshipType())
                .phone(contact.getPhone())
                .email(contact.getEmail())
                .addressText(contact.getAddressText())
                .primary(contact.isPrimary())
                .notes(contact.getNotes())
                .build();
    }

    private String normalizeFilter(String value) {
        if (value == null || value.isBlank()) {
            return null;
        }
        return value.trim();
    }
}
