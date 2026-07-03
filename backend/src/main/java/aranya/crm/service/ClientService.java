package aranya.crm.service;

import aranya.crm.dto.request.CreateClientRequest;
import aranya.crm.dto.request.UpdateClientRequest;
import aranya.crm.dto.response.ClientDetailResponse;
import aranya.crm.dto.response.ClientSummaryResponse;
import aranya.crm.dto.response.RelatedContactResponse;
import aranya.crm.entity.Client;
import aranya.crm.entity.ClientCase;
import aranya.crm.entity.RelatedContact;
import aranya.crm.entity.User;
import aranya.crm.repository.CaseRepository;
import aranya.crm.repository.ClientRepository;
import aranya.crm.repository.RelatedContactRepository;
import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.function.Consumer;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class ClientService {

    private static final String ACTIVE_STATUS = "ACTIVE";
    private static final String CLOSED_STATUS = "CLOSED";
    private static final String DELETED_STATUS = "DELETED";

    private final ClientRepository clientRepository;
    private final RelatedContactRepository relatedContactRepository;
    private final CaseRepository caseRepository;

    public List<ClientSummaryResponse> listClients(String q, String membershipStatus) {
        String normalizedQuery = normalizeFilter(q);
        String normalizedStatus = normalizeMembershipStatusFilter(membershipStatus);

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

    public List<ClientSummaryResponse> listClientsAvailableForCase() {
        return clientRepository.findActiveClientsWithoutActiveCase().stream()
                .map(this::toClientSummaryResponse)
                .toList();
    }

    @Transactional
    public ClientDetailResponse createClient(CreateClientRequest req, User createdBy) {
        return executeApprovedCreateClient(req, createdBy);
    }

    @Transactional
    public ClientDetailResponse executeApprovedCreateClient(CreateClientRequest req, User createdBy) {
        Client client = new Client();
        client.setNameEn(req.getNameEn());
        client.setNameChn(req.getNameChn());
        client.setAbbr(req.getAbbr());
        client.setBuddhistTradition(req.getBuddhistTradition());
        client.setOrdinationStatus(req.getOrdinationStatus());
        client.setAreaDistrict(req.getAreaDistrict());
        client.setPreferredLanguage(req.getPreferredLanguage());
        client.setContact(req.getContact());
        client.setMembershipStatus(ACTIVE_STATUS);
        clientRepository.save(client);

        return getClientDetail(client.getId());
    }

    @Transactional
    public ClientDetailResponse updateClient(Long clientId, UpdateClientRequest req) {
        return executeApprovedUpdateClient(clientId, req);
    }

    @Transactional
    public ClientDetailResponse executeApprovedUpdateClient(Long clientId, UpdateClientRequest req) {
        Client client = clientRepository.findById(clientId)
                .orElseThrow(() -> new EntityNotFoundException("Client not found: " + clientId));

        set(req.getNameEn(),                    client::setNameEn);
        set(req.getNameChn(),                   client::setNameChn);
        set(req.getAbbr(),                      client::setAbbr);
        set(req.getContact(),                   client::setContact);
        set(req.getPreferredCommunication(),    client::setPreferredCommunication);
        set(req.getWhatsappEnabled(),           client::setWhatsappEnabled);
        set(req.getPreferredLanguage(),         client::setPreferredLanguage);
        set(req.getSpokenLanguage(),            client::setSpokenLanguage);
        set(req.getAddressText(),               client::setAddressText);
        set(req.getPostalCode(),                client::setPostalCode);
        set(req.getAreaDistrict(),              client::setAreaDistrict);
        set(req.getViharaType(),                client::setViharaType);
        set(req.getNricNameEn(),                client::setNricNameEn);
        set(req.getNricNameChn(),               client::setNricNameChn);
        set(req.getNricNo(),                    client::setNricNo);
        set(req.getOrdinationCertificateStatus(), client::setOrdinationCertificateStatus);
        set(req.getDateOfVerification(),        client::setDateOfVerification);
        set(req.getGender(),                    client::setGender);
        set(req.getDateOfBirth(),               client::setDateOfBirth);
        set(req.getMaritalStatus(),             client::setMaritalStatus);
        set(req.getNationality(),               client::setNationality);
        set(req.getEthnicity(),                 client::setEthnicity);
        set(req.getDialectGroup(),              client::setDialectGroup);
        set(req.getDateJoined(),                client::setDateJoined);
        set(req.getMembershipRemarks(),         client::setMembershipRemarks);
        set(req.getBuddhistTradition(),         client::setBuddhistTradition);
        set(req.getOrdinationStatus(),          client::setOrdinationStatus);
        set(req.getDateOfTonsure(),             client::setDateOfTonsure);
        set(req.getCountryOfTonsure(),          client::setCountryOfTonsure);
        set(req.getPlaceOfTonsure(),            client::setPlaceOfTonsure);
        set(req.getDateOfOrdination(),          client::setDateOfOrdination);
        set(req.getCountryOfOrdination(),       client::setCountryOfOrdination);
        set(req.getPlaceOfOrdination(),         client::setPlaceOfOrdination);
        set(req.getWellbeingPhysicalHealth(),   client::setWellbeingPhysicalHealth);
        set(req.getWellbeingMentalHealth(),     client::setWellbeingMentalHealth);
        set(req.getWellbeingSocialSupport(),    client::setWellbeingSocialSupport);
        set(req.getWellbeingFinancialStability(), client::setWellbeingFinancialStability);
        set(req.getWellbeingLivingConditions(), client::setWellbeingLivingConditions);
        set(req.getWellbeingSpiritual(),        client::setWellbeingSpiritual);
        set(req.getWellbeingLegalIssues(),      client::setWellbeingLegalIssues);
        set(req.getWellbeingRemarks(),          client::setWellbeingRemarks);
        set(req.getSpecialNeeds(),              client::setSpecialNeeds);
        set(req.getSpecialNeedsRemarks(),       client::setSpecialNeedsRemarks);
        set(req.getBankTransferInfo(),          client::setBankTransferInfo);
        set(req.getPayNowInfo(),                client::setPayNowInfo);
        set(req.getNextOfKinContact(),          client::setNextOfKinContact);
        set(req.getComments(),                  client::setComments);

        clientRepository.save(client);
        return getClientDetail(clientId);
    }

    @Transactional
    public void executeApprovedDeleteClient(Long clientId) {
        Client client = clientRepository.findById(clientId)
                .orElseThrow(() -> new EntityNotFoundException("Client not found: " + clientId));
        client.setMembershipStatus(CLOSED_STATUS);
        clientRepository.save(client);
        closeClientActiveCases(clientId);
    }

    private void closeClientActiveCases(Long clientId) {
        List<ClientCase> activeCases = caseRepository.findActiveCasesByClientId(clientId);
        activeCases.forEach(clientCase -> {
            clientCase.setStatus(DELETED_STATUS);
            clientCase.setClosedAt(java.time.LocalDateTime.now());
        });
        caseRepository.saveAll(activeCases);
    }

    private static <T> void set(T value, Consumer<T> setter) {
        if (value != null) setter.accept(value);
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
                .nricNameEn(client.getNricNameEn())
                .nricNameChn(client.getNricNameChn())
                .nricNo(client.getNricNo())
                .ordinationCertificateStatus(client.getOrdinationCertificateStatus())
                .dateOfVerification(client.getDateOfVerification())
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
                .dateOfTonsure(client.getDateOfTonsure())
                .countryOfTonsure(client.getCountryOfTonsure())
                .placeOfTonsure(client.getPlaceOfTonsure())
                .dateOfOrdination(client.getDateOfOrdination())
                .countryOfOrdination(client.getCountryOfOrdination())
                .placeOfOrdination(client.getPlaceOfOrdination())
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
                .bankTransferInfo(client.getBankTransferInfo())
                .payNowInfo(client.getPayNowInfo())
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

    private String normalizeMembershipStatusFilter(String value) {
        String normalized = normalizeFilter(value);
        if (normalized == null) {
            return ACTIVE_STATUS;
        }
        if ("all".equalsIgnoreCase(normalized)) {
            return null;
        }
        if (DELETED_STATUS.equalsIgnoreCase(normalized)) {
            return CLOSED_STATUS;
        }
        return normalized;
    }
}
