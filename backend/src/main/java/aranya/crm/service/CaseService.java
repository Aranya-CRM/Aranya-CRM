package aranya.crm.service;

import aranya.crm.dto.request.CreateCaseRequest;
import aranya.crm.dto.request.CreateServiceEventRequest;
import aranya.crm.dto.request.UpdateCaseRequest;
import aranya.crm.dto.response.CaseDetailResponse;
import aranya.crm.dto.response.CaseSummaryResponse;
import aranya.crm.dto.response.ServiceEventResponse;
import aranya.crm.entity.Client;
import aranya.crm.entity.ClientCase;
import aranya.crm.entity.User;
import aranya.crm.repository.CaseRepository;
import aranya.crm.repository.ClientRepository;
import aranya.crm.repository.UserRepository;
import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.RowMapper;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class CaseService {

    private static final String CLOSED_STATUS = "CLOSED";
    private static final String DELETED_STATUS = "DELETED";
    private static final List<String> URGENT_COLOR_CODES = List.of("RED", "ORANGE");
    private static final List<String> SERVICE_KEYS = List.of(
            "accommodationArrangement",
            "deepCleaning",
            "relocationAssistance",
            "dailyCleaning",
            "pestControl",
            "homeRepair",
            "dailyExpenseSubsidy",
            "cpfAssistance",
            "mealDelivery",
            "lunchSupport",
            "monasticSupport",
            "monasticEscort",
            "legalAid",
            "volunteerVisit",
            "digitalSupport"
    );

    private final CaseRepository caseRepository;
    private final ClientRepository clientRepository;
    private final UserRepository userRepository;
    private final JdbcTemplate jdbcTemplate;

    public List<CaseSummaryResponse> listCases(String q, String status, Long scopedToUserId) {
        String normalizedQuery = normalizeFilter(q);
        String normalizedStatus = normalizeFilter(status);

        List<ClientCase> cases;
        if (scopedToUserId != null) {
            if (normalizedQuery == null && normalizedStatus == null) {
                cases = caseRepository.findByCreatedByIdOrderByOpenedAtDescIdDesc(scopedToUserId);
            } else if (normalizedQuery == null) {
                cases = caseRepository.findByCreatedByIdAndStatusIgnoreCaseOrderByOpenedAtDescIdDesc(scopedToUserId, normalizedStatus);
            } else if (normalizedStatus == null) {
                cases = caseRepository.searchCasesByCreatedBy(scopedToUserId, normalizedQuery);
            } else {
                cases = caseRepository.searchCasesByCreatedBy(scopedToUserId, normalizedQuery, normalizedStatus);
            }
        } else {
            if (normalizedQuery == null && normalizedStatus == null) {
                cases = caseRepository.findAllByOrderByOpenedAtDescIdDesc();
            } else if (normalizedQuery == null) {
                cases = caseRepository.findByStatusIgnoreCaseOrderByOpenedAtDescIdDesc(normalizedStatus);
            } else if (normalizedStatus == null) {
                cases = caseRepository.searchCases(normalizedQuery);
            } else {
                cases = caseRepository.searchCases(normalizedQuery, normalizedStatus);
            }
        }

        return cases.stream()
                .filter(clientCase -> !DELETED_STATUS.equalsIgnoreCase(clientCase.getStatus()))
                .map(this::toCaseSummaryResponse)
                .toList();
    }

    public CaseDetailResponse getCaseDetail(Long caseId) {
        ClientCase clientCase = caseRepository.findById(caseId)
                .orElseThrow(() -> new EntityNotFoundException("Case not found: " + caseId));
        if (DELETED_STATUS.equalsIgnoreCase(clientCase.getStatus())) {
            throw new EntityNotFoundException("Case not found: " + caseId);
        }

        return toCaseDetailResponse(clientCase);
    }

    @Transactional
    public CaseDetailResponse executeApprovedCreateCase(CreateCaseRequest request, User createdBy) {
        Client client = clientRepository.findById(request.getClientId())
                .orElseThrow(() -> new EntityNotFoundException("Client not found: " + request.getClientId()));
        if (caseRepository.findFirstByClientIdOrderByOpenedAtDescIdDesc(client.getId()).isPresent()) {
            throw new IllegalStateException("Client already has a case");
        }

        User socialWorker = request.getSocialWorkerId() == null
                ? createdBy
                : userRepository.findById(request.getSocialWorkerId())
                    .orElseThrow(() -> new EntityNotFoundException("User not found: " + request.getSocialWorkerId()));

        ClientCase clientCase = new ClientCase();
        clientCase.setClient(client);
        clientCase.setCreatedBy(socialWorker);
        clientCase.setCaseCode(generateCaseCode(request.getOpenedAt()));
        clientCase.setTitle(client.getNameEn() + " - Case");
        clientCase.setStatus(normalizeStatus(request.getStatus()));
        clientCase.setColorCode(normalizeColorCode(request.getColorCode()));
        clientCase.setTradition(client.getBuddhistTradition());
        clientCase.setOpenedAt(request.getOpenedAt().atStartOfDay());
        clientCase.setComments(trimToNull(request.getComments()));
        clientCase.setRemarks(trimToNull(request.getRemarks()));

        ClientCase saved = caseRepository.save(clientCase);
        replaceSelectedServices(saved.getId(), request.getServices());
        return toCaseDetailResponse(saved);
    }

    @Transactional
    public CaseDetailResponse updateCase(Long caseId, UpdateCaseRequest request) {
        ClientCase clientCase = caseRepository.findById(caseId)
                .orElseThrow(() -> new EntityNotFoundException("Case not found: " + caseId));

        setText(request.getStatus(), clientCase::setStatus);
        setText(request.getColorCode(), clientCase::setColorCode);
        if (request.getComments() != null) {
            clientCase.setComments(request.getComments().trim());
        }
        if (request.getRemarks() != null) {
            clientCase.setRemarks(request.getRemarks().trim());
        }
        if (request.getSocialWorkerId() != null) {
            User socialWorker = userRepository.findById(request.getSocialWorkerId())
                    .orElseThrow(() -> new EntityNotFoundException("User not found: " + request.getSocialWorkerId()));
            clientCase.setCreatedBy(socialWorker);
        }

        return toCaseDetailResponse(caseRepository.save(clientCase));
    }

    @Transactional
    public CaseDetailResponse executeApprovedUpdateCaseServices(Long caseId, List<String> serviceKeys) {
        ClientCase clientCase = caseRepository.findById(caseId)
                .orElseThrow(() -> new EntityNotFoundException("Case not found: " + caseId));
        replaceSelectedServices(caseId, serviceKeys);
        return toCaseDetailResponse(clientCase);
    }

    @Transactional
    public ServiceEventResponse executeApprovedCreateServiceEvent(Long caseId, CreateServiceEventRequest request, User createdBy) {
        ClientCase clientCase = caseRepository.findById(caseId)
                .orElseThrow(() -> new EntityNotFoundException("Case not found: " + caseId));
        Set<String> selected = selectedServiceKeySet(caseId);
        String serviceKey = trimToNull(request.getServiceKey());
        if (serviceKey == null || !selected.contains(serviceKey)) {
            throw new IllegalArgumentException("Service is not selected for this case");
        }

        User assigned = userRepository.findByIdWithRoles(request.getAssignedUserId())
                .orElseThrow(() -> new EntityNotFoundException("User not found: " + request.getAssignedUserId()));
        requireAssignable(createdBy, assigned);

        Long serviceTypeId = findServiceTypeId(serviceKey);
        String venue = resolveVenue(request.getLocation(), clientCase);

        Long eventId = jdbcTemplate.queryForObject("""
                INSERT INTO service_appointment (
                    case_id,
                    service_type_id,
                    scheduled_start,
                    location,
                    work_description,
                    notes,
                    assigned_user_id,
                    created_by,
                    status
                )
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'SCHEDULED')
                RETURNING id
                """, Long.class,
                caseId,
                serviceTypeId,
                request.getScheduledStart(),
                venue,
                normalizeText(request.getWorkDescription()),
                normalizeText(request.getNotes()),
                assigned.getId(),
                createdBy.getId());

        return findServiceEventById(eventId);
    }

    public List<ServiceEventResponse> listServiceEvents(Long caseId) {
        return jdbcTemplate.query(serviceEventSql("WHERE case_id = ? ORDER BY scheduled_start ASC, id ASC"),
                serviceEventMapper(), caseId);
    }

    public List<ServiceEventResponse> listAssignedServiceEvents(Long assignedUserId) {
        return jdbcTemplate.query(serviceEventSql("WHERE assigned_user_id = ? ORDER BY scheduled_start ASC, id ASC"),
                serviceEventMapper(), assignedUserId);
    }

    @Transactional
    public void deleteServiceEvent(Long caseId, Long eventId) {
        int deleted = jdbcTemplate.update(
                "DELETE FROM service_appointment WHERE id = ? AND case_id = ?",
                eventId,
                caseId
        );
        if (deleted == 0) {
            throw new EntityNotFoundException("Service event not found: " + eventId);
        }
    }

    @Transactional
    public void executeApprovedDeleteCase(Long caseId) {
        ClientCase clientCase = caseRepository.findById(caseId)
                .orElseThrow(() -> new EntityNotFoundException("Case not found: " + caseId));
        clientCase.setStatus(DELETED_STATUS);
        clientCase.setClosedAt(LocalDateTime.now());
        caseRepository.save(clientCase);
    }

    public List<ClientCase> getActiveCases(int limit) {
        return caseRepository.findByStatusNotOrderByOpenedAtDescIdDesc(
                CLOSED_STATUS,
                PageRequest.of(0, limit)
        );
    }

    public long countActiveCases() {
        return caseRepository.countByStatusNot(CLOSED_STATUS);
    }

    public List<ClientCase> getUrgentCases(int limit) {
        return caseRepository.findByStatusNotAndColorCodeInOrderByOpenedAtDescIdDesc(
                CLOSED_STATUS,
                URGENT_COLOR_CODES,
                PageRequest.of(0, limit)
        );
    }

    public long countUrgentCases() {
        return caseRepository.countByStatusNotAndColorCodeIn(CLOSED_STATUS, URGENT_COLOR_CODES);
    }

    public long countActiveCasesByCreatedBy(Long createdById) {
        return caseRepository.countByCreatedByIdAndStatusNot(createdById, CLOSED_STATUS);
    }

    public long countUrgentCasesByCreatedBy(Long createdById) {
        return caseRepository.countByCreatedByIdAndStatusNotAndColorCodeIn(createdById, CLOSED_STATUS, URGENT_COLOR_CODES);
    }

    public long countDistinctActiveClientsByCreatedBy(Long createdById) {
        return caseRepository.countDistinctActiveClientsByCreatedById(createdById);
    }

    public List<ClientCase> getActiveCasesByCreatedBy(Long createdById, int limit) {
        return caseRepository.findByCreatedByIdAndStatusNotOrderByOpenedAtDescIdDesc(
                createdById, CLOSED_STATUS, PageRequest.of(0, limit));
    }

    private CaseSummaryResponse toCaseSummaryResponse(ClientCase clientCase) {
        return CaseSummaryResponse.builder()
                .id(clientCase.getId())
                .caseCode(clientCase.getCaseCode())
                .title(clientCase.getTitle())
                .description(clientCase.getDescription())
                .priority(clientCase.getPriority())
                .status(clientCase.getStatus())
                .colorCode(clientCase.getColorCode())
                .tradition(resolveTradition(clientCase))
                .openedAt(clientCase.getOpenedAt())
                .closedAt(clientCase.getClosedAt())
                .clientId(clientCase.getClient().getId())
                .clientAbbr(clientCase.getClient().getAbbr())
                .clientNameEn(clientCase.getClient().getNameEn())
                .clientNameChn(clientCase.getClient().getNameChn())
                .createdById(clientCase.getCreatedBy().getId())
                .createdByName(clientCase.getCreatedBy().getFullName())
                .comments(clientCase.getComments())
                .remarks(clientCase.getRemarks())
                .build();
    }

    private CaseDetailResponse toCaseDetailResponse(ClientCase clientCase) {
        return CaseDetailResponse.builder()
                .id(clientCase.getId())
                .caseCode(clientCase.getCaseCode())
                .title(clientCase.getTitle())
                .description(clientCase.getDescription())
                .priority(clientCase.getPriority())
                .status(clientCase.getStatus())
                .colorCode(clientCase.getColorCode())
                .tradition(resolveTradition(clientCase))
                .openedAt(clientCase.getOpenedAt())
                .closedAt(clientCase.getClosedAt())
                .clientId(clientCase.getClient().getId())
                .clientAbbr(clientCase.getClient().getAbbr())
                .clientNameEn(clientCase.getClient().getNameEn())
                .clientNameChn(clientCase.getClient().getNameChn())
                .createdById(clientCase.getCreatedBy().getId())
                .createdByName(clientCase.getCreatedBy().getFullName())
                .comments(clientCase.getComments())
                .remarks(clientCase.getRemarks())
                .services(selectedServices(clientCase.getId()))
                .serviceEvents(listServiceEvents(clientCase.getId()))
                .build();
    }

    private String resolveTradition(ClientCase clientCase) {
        if (clientCase.getTradition() != null && !clientCase.getTradition().isBlank()) {
            return clientCase.getTradition();
        }
        return clientCase.getClient().getBuddhistTradition();
    }

    public String findLatestCaseCodeForClient(Long clientId) {
        return caseRepository.findFirstByClientIdOrderByOpenedAtDescIdDesc(clientId)
                .map(ClientCase::getCaseCode)
                .orElse(null);
    }

    private String generateCaseCode(LocalDate openedAt) {
        String year = String.valueOf(openedAt.getYear());
        return caseRepository.findLatestCaseCodeByYear(year)
                .map(latest -> {
                    String[] parts = latest.split("/");
                    int next = Integer.parseInt(parts[parts.length - 1]) + 1;
                    return String.format("ASDFL/%s/C/%03d", year, next);
                })
                .orElse(String.format("ASDFL/%s/C/001", year));
    }

    private void replaceSelectedServices(Long caseId, List<String> serviceKeys) {
        Set<String> nextKeys = serviceKeys == null
                ? Set.of()
                : serviceKeys.stream()
                    .map(this::trimToNull)
                    .filter(key -> key != null && SERVICE_KEYS.contains(key))
                    .collect(java.util.stream.Collectors.toCollection(java.util.LinkedHashSet::new));
        Set<String> removedKeys = new java.util.LinkedHashSet<>(selectedServiceKeySet(caseId));
        removedKeys.removeAll(nextKeys);
        for (String removedKey : removedKeys) {
            jdbcTemplate.update(
                    "DELETE FROM service_appointment WHERE case_id = ? AND service_type_id IN (SELECT id FROM service_type WHERE description = ?)",
                    caseId,
                    removedKey
            );
        }
        jdbcTemplate.update("DELETE FROM case_service_selection WHERE case_id = ?", caseId);
        nextKeys.forEach(key -> jdbcTemplate.update(
                "INSERT INTO case_service_selection (case_id, service_key) VALUES (?, ?) ON CONFLICT DO NOTHING",
                caseId, key));
    }

    private Map<String, Boolean> selectedServices(Long caseId) {
        Map<String, Boolean> services = new LinkedHashMap<>();
        SERVICE_KEYS.forEach(key -> services.put(key, false));
        selectedServiceKeySet(caseId).forEach(key -> services.put(key, true));
        return services;
    }

    private Set<String> selectedServiceKeySet(Long caseId) {
        return Set.copyOf(jdbcTemplate.queryForList(
                "SELECT service_key FROM case_service_selection WHERE case_id = ?",
                String.class,
                caseId
        ));
    }

    private Long findServiceTypeId(String serviceKey) {
        List<Long> ids = jdbcTemplate.queryForList(
                "SELECT id FROM service_type WHERE description = ? AND is_active = true ORDER BY id LIMIT 1",
                Long.class,
                serviceKey
        );
        if (ids.isEmpty()) {
            throw new EntityNotFoundException("Service type not found: " + serviceKey);
        }
        return ids.get(0);
    }

    private ServiceEventResponse findServiceEventById(Long eventId) {
        return jdbcTemplate.queryForObject(serviceEventSql("WHERE id = ?"), serviceEventMapper(), eventId);
    }

    private String serviceEventSql(String whereClause) {
        return """
                WITH ranked_events AS (
                SELECT
                    sa.id,
                    cc.id AS case_id,
                    c.id AS client_id,
                    c.abbr AS client_abbr,
                    c.name_en AS client_name_en,
                    c.name_chn AS client_name_chn,
                    cc.case_code,
                    st.description AS service_key,
                    st.name AS service_name,
                    sa.location,
                    sa.work_description,
                    sa.notes,
                    sa.scheduled_start,
                    au.id AS assigned_user_id,
                    au.full_name AS assigned_user_name,
                    (
                        ROW_NUMBER() OVER (PARTITION BY sa.case_id ORDER BY sa.scheduled_start ASC, sa.id ASC)
                        || ' ' || st.name || ': ' || c.abbr || '@' || COALESCE(NULLIF(sa.location, ''), COALESCE(NULLIF(c.vihara_type, ''), c.area_district, 'Unknown'))
                    ) AS title
                FROM service_appointment sa
                JOIN "case" cc ON cc.id = sa.case_id
                JOIN client c ON c.id = cc.client_id
                JOIN service_type st ON st.id = sa.service_type_id
                LEFT JOIN users au ON au.id = sa.assigned_user_id
                )
                SELECT * FROM ranked_events
                %s
                """.formatted(whereClause);
    }

    private RowMapper<ServiceEventResponse> serviceEventMapper() {
        return (rs, _rowNum) -> ServiceEventResponse.builder()
                .id(rs.getLong("id"))
                .caseId(rs.getLong("case_id"))
                .clientId(rs.getLong("client_id"))
                .clientAbbr(rs.getString("client_abbr"))
                .clientNameEn(rs.getString("client_name_en"))
                .clientNameChn(rs.getString("client_name_chn"))
                .caseCode(rs.getString("case_code"))
                .serviceKey(rs.getString("service_key"))
                .serviceName(rs.getString("service_name"))
                .title(rs.getString("title"))
                .location(rs.getString("location"))
                .scheduledStart(rs.getObject("scheduled_start", LocalDateTime.class))
                .workDescription(rs.getString("work_description"))
                .notes(rs.getString("notes"))
                .assignedUserId(rs.getObject("assigned_user_id", Long.class))
                .assignedUserName(rs.getString("assigned_user_name"))
                .build();
    }

    private void requireAssignable(User actor, User assigned) {
        boolean actorManager = hasRole(actor, "MANAGER") || hasRole(actor, "FULL_MANAGER") || hasRole(actor, "TEAM_LEAD");
        boolean actorSocialWorker = hasRole(actor, "SOCIAL_WORKER");
        boolean assignedVolunteer = hasRole(assigned, "VOLUNTEER");
        if (actorManager && "ACTIVE".equals(assigned.getStatus())) {
            return;
        }
        if (actorSocialWorker && assignedVolunteer) {
            return;
        }
        throw new AccessDeniedException("User cannot assign this service event");
    }

    private boolean hasRole(User user, String roleName) {
        return user != null && user.getUserRoles() != null && user.getUserRoles().stream()
                .anyMatch(userRole -> userRole.getRole() != null && roleName.equals(userRole.getRole().getName()));
    }

    private String resolveVenue(String location, ClientCase clientCase) {
        String explicit = trimToNull(location);
        if (explicit != null) {
            return explicit;
        }
        if (clientCase.getClient().getViharaType() != null && !clientCase.getClient().getViharaType().isBlank()) {
            return clientCase.getClient().getViharaType();
        }
        return clientCase.getClient().getAreaDistrict() != null ? clientCase.getClient().getAreaDistrict() : "Unknown";
    }

    private String normalizeStatus(String status) {
        String normalized = trimToNull(status);
        return normalized == null ? "OPEN" : normalized.toUpperCase();
    }

    private String normalizeColorCode(String colorCode) {
        String normalized = trimToNull(colorCode);
        return normalized == null ? "GREEN" : normalized.toUpperCase();
    }

    private String trimToNull(String value) {
        return value == null || value.isBlank() ? null : value.trim();
    }

    private String normalizeText(String value) {
        return value == null ? null : value.trim();
    }

    private String normalizeFilter(String value) {
        if (value == null || value.isBlank()) {
            return null;
        }
        return value.trim();
    }

    private void setText(String value, java.util.function.Consumer<String> setter) {
        if (value != null && !value.isBlank()) {
            setter.accept(value.trim());
        }
    }
}
