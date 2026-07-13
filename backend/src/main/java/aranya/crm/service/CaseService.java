package aranya.crm.service;

import aranya.crm.dto.request.CreateCaseRequest;
import aranya.crm.dto.request.CreateServiceEventRequest;
import aranya.crm.dto.request.UpdateCaseRequest;
import aranya.crm.dto.response.CalendarEventResponse;
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
    private final GoogleCalendarService googleCalendarService;

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

    public List<String> listSelectedServiceKeys(Long caseId) {
        ClientCase clientCase = caseRepository.findById(caseId)
                .orElseThrow(() -> new EntityNotFoundException("Case not found: " + caseId));
        if (DELETED_STATUS.equalsIgnoreCase(clientCase.getStatus())) {
            throw new EntityNotFoundException("Case not found: " + caseId);
        }
        Set<String> selected = selectedServiceKeySet(caseId);
        return SERVICE_KEYS.stream().filter(selected::contains).toList();
    }

    @Transactional
    public CaseDetailResponse executeApprovedCreateCase(CreateCaseRequest request, User createdBy) {
        Client client = clientRepository.findById(request.getClientId())
                .orElseThrow(() -> new EntityNotFoundException("Client not found: " + request.getClientId()));
        if (caseRepository.existsActiveCaseByClientId(client.getId())) {
            throw new IllegalStateException("Client already has an active case");
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
    public ServiceEventResponse createServiceEvent(Long caseId, CreateServiceEventRequest request, User createdBy) {
        ClientCase clientCase = caseRepository.findById(caseId)
                .orElseThrow(() -> new EntityNotFoundException("Case not found: " + caseId));
        Set<String> selected = selectedServiceKeySet(caseId);
        String serviceKey = trimToNull(request.getServiceKey());
        if (serviceKey == null || !selected.contains(serviceKey)) {
            throw new IllegalArgumentException("Service is not selected for this case");
        }
        validateEventTimes(request.getScheduledStart(), request.getScheduledEnd());

        // 负责人可空;给定时校验可分配性
        Long assignedId = null;
        if (request.getAssignedUserId() != null) {
            User assigned = userRepository.findByIdWithRoles(request.getAssignedUserId())
                    .orElseThrow(() -> new EntityNotFoundException("User not found: " + request.getAssignedUserId()));
            requireAssignable(createdBy, assigned);
            assignedId = assigned.getId();
        }

        Long serviceTypeId = findServiceTypeId(serviceKey);
        String venue = resolveVenue(request.getLocation(), clientCase);
        Long eventSeq = jdbcTemplate.queryForObject("SELECT nextval('service_event_seq')", Long.class);

        Long eventId = jdbcTemplate.queryForObject("""
                INSERT INTO service_appointment (
                    case_id,
                    service_type_id,
                    scheduled_start,
                    scheduled_end,
                    report_due_at,
                    location,
                    work_description,
                    notes,
                    agenda,
                    schedule,
                    manpower,
                    instructions,
                    address,
                    event_seq,
                    assigned_user_id,
                    created_by,
                    status
                )
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'SCHEDULED')
                RETURNING id
                """, Long.class,
                caseId,
                serviceTypeId,
                request.getScheduledStart(),
                request.getScheduledEnd(),
                request.getReportDueAt(),
                venue,
                normalizeText(request.getWorkDescription()),
                normalizeText(request.getNotes()),
                normalizeText(request.getAgenda()),
                normalizeText(request.getSchedule()),
                normalizeText(request.getManpower()),
                normalizeText(request.getInstructions()),
                normalizeText(request.getAddress()),
                eventSeq,
                assignedId,
                createdBy.getId());

        ServiceEventResponse response = findServiceEventById(eventId);
        // best-effort 镜像到 Google 共享日历;失败不阻断本地创建
        mirrorToGoogle(eventId, caseId, response, trimToNull(request.getCalendarId()), null, null);
        // 重新读取使 synced 反映镜像结果
        return findServiceEventById(eventId);
    }

    /** 编辑已存在的服务事件:更新本地真相源,并同步更新/补建 Google 镜像。 */
    public ServiceEventResponse updateServiceEvent(Long caseId, Long eventId,
                                                   CreateServiceEventRequest request, User currentUser) {
        List<Map<String, Object>> rows = jdbcTemplate.queryForList(
                "SELECT google_event_id, google_calendar_id FROM service_appointment WHERE id = ? AND case_id = ?",
                eventId, caseId);
        if (rows.isEmpty()) {
            throw new EntityNotFoundException("Service event not found: " + eventId);
        }
        ClientCase clientCase = caseRepository.findById(caseId)
                .orElseThrow(() -> new EntityNotFoundException("Case not found: " + caseId));
        Set<String> selected = selectedServiceKeySet(caseId);
        String serviceKey = trimToNull(request.getServiceKey());
        if (serviceKey == null || !selected.contains(serviceKey)) {
            throw new IllegalArgumentException("Service is not selected for this case");
        }
        validateEventTimes(request.getScheduledStart(), request.getScheduledEnd());

        Long assignedId = null;
        if (request.getAssignedUserId() != null) {
            User assigned = userRepository.findByIdWithRoles(request.getAssignedUserId())
                    .orElseThrow(() -> new EntityNotFoundException("User not found: " + request.getAssignedUserId()));
            requireAssignable(currentUser, assigned);
            assignedId = assigned.getId();
        }
        Long serviceTypeId = findServiceTypeId(serviceKey);
        String venue = resolveVenue(request.getLocation(), clientCase);

        jdbcTemplate.update("""
                UPDATE service_appointment SET
                    service_type_id = ?,
                    scheduled_start = ?,
                    scheduled_end = ?,
                    report_due_at = ?,
                    location = ?,
                    work_description = ?,
                    notes = ?,
                    agenda = ?,
                    schedule = ?,
                    manpower = ?,
                    instructions = ?,
                    address = ?,
                    assigned_user_id = ?
                WHERE id = ? AND case_id = ?
                """,
                serviceTypeId,
                request.getScheduledStart(),
                request.getScheduledEnd(),
                request.getReportDueAt(),
                venue,
                normalizeText(request.getWorkDescription()),
                normalizeText(request.getNotes()),
                normalizeText(request.getAgenda()),
                normalizeText(request.getSchedule()),
                normalizeText(request.getManpower()),
                normalizeText(request.getInstructions()),
                normalizeText(request.getAddress()),
                assignedId,
                eventId, caseId);

        ServiceEventResponse updated = findServiceEventById(eventId);
        mirrorToGoogle(eventId, caseId, updated, trimToNull(request.getCalendarId()),
                asString(rows.get(0).get("google_event_id")),
                asString(rows.get(0).get("google_calendar_id")));
        return findServiceEventById(eventId);
    }

    /** 手动重试将事件同步到 Google(用于上次镜像失败的事件);保持其原目标日历。 */
    public ServiceEventResponse syncServiceEvent(Long caseId, Long eventId) {
        List<Map<String, Object>> rows = jdbcTemplate.queryForList(
                "SELECT google_event_id, google_calendar_id FROM service_appointment WHERE id = ? AND case_id = ?",
                eventId, caseId);
        if (rows.isEmpty()) {
            throw new EntityNotFoundException("Service event not found: " + eventId);
        }
        ServiceEventResponse ev = findServiceEventById(eventId);
        String existingCalendar = asString(rows.get(0).get("google_calendar_id"));
        mirrorToGoogle(eventId, caseId, ev, existingCalendar,
                asString(rows.get(0).get("google_event_id")), existingCalendar);
        return findServiceEventById(eventId);
    }

    /**
     * 将事件镜像到 Google(best-effort)。existing* 为空表示尚未镜像→新建;
     * 已镜像且目标日历变更→先删旧再新建;否则原地更新。镜像结果写回 google_event_id/calendar_id。
     */
    private void mirrorToGoogle(Long eventId, Long caseId, ServiceEventResponse ev, String requestedCalendarId,
                                String existingGoogleEventId, String existingGoogleCalendarId) {
        String title = composeEventTitle(ev.getEventSeq(), ev);
        String description = composeEventDescriptionFromEvent(ev);
        String targetCalendarId = googleCalendarService.resolveTargetCalendarId(requestedCalendarId);

        // 目标日历变了:删除旧日历上的镜像,转为新建
        if (existingGoogleEventId != null && existingGoogleCalendarId != null
                && !existingGoogleCalendarId.equals(targetCalendarId)) {
            googleCalendarService.deleteCaseEvent(existingGoogleCalendarId, existingGoogleEventId);
            existingGoogleEventId = null;
        }

        if (existingGoogleEventId != null) {
            googleCalendarService.updateCaseEvent(targetCalendarId, existingGoogleEventId, caseId,
                            ev.getServiceKey(), title, description, ev.getLocation(),
                            ev.getScheduledStart(), ev.getScheduledEnd())
                    .ifPresent(gid -> jdbcTemplate.update(
                            "UPDATE service_appointment SET google_event_id = ?, google_calendar_id = ? WHERE id = ?",
                            gid, targetCalendarId, eventId));
        } else {
            googleCalendarService.createCaseEvent(caseId, ev.getServiceKey(), title, description,
                            ev.getLocation(), ev.getScheduledStart(), ev.getScheduledEnd(), targetCalendarId)
                    .ifPresent(gid -> jdbcTemplate.update(
                            "UPDATE service_appointment SET google_event_id = ?, google_calendar_id = ? WHERE id = ?",
                            gid, targetCalendarId, eventId));
        }
    }

    private void validateEventTimes(LocalDateTime start, LocalDateTime end) {
        if (start != null && end != null && end.isBefore(start)) {
            throw new IllegalArgumentException("End time must not be before start time");
        }
    }

    private String asString(Object value) {
        return value == null ? null : value.toString();
    }

    /** 组织日历标题:`072 Medical Appointment: VKZhi @ Address` */
    private String composeEventTitle(Long eventSeq, ServiceEventResponse response) {
        String seq = eventSeq != null ? String.format("%03d", eventSeq) : "";
        StringBuilder sb = new StringBuilder();
        if (!seq.isEmpty()) sb.append(seq).append(' ');
        sb.append(response.getServiceName() != null ? response.getServiceName() : response.getServiceKey());
        sb.append(": ").append(response.getClientAbbr() != null ? response.getClientAbbr() : "");
        if (response.getLocation() != null && !response.getLocation().isBlank()) {
            sb.append(" @ ").append(response.getLocation());
        }
        return sb.toString();
    }

    /** 组织日历正文:按 *Agenda* / *Schedule* / *Address* / *Manpower* / *Instructions for Kappiya* 分节。 */
    private String composeEventDescriptionFromEvent(ServiceEventResponse ev) {
        StringBuilder sb = new StringBuilder();
        appendSection(sb, "Agenda", ev.getAgenda());
        appendSection(sb, "Schedule", ev.getSchedule());
        appendSection(sb, "Address", ev.getAddress());
        appendSection(sb, "Manpower", ev.getManpower());
        appendSection(sb, "Instructions for Kappiya", ev.getInstructions());
        return sb.toString().trim();
    }

    private void appendSection(StringBuilder sb, String label, String content) {
        sb.append('*').append(label).append("*\n");
        sb.append(content != null && !content.isBlank() ? content.trim() : "").append("\n\n");
    }

    public List<ServiceEventResponse> listServiceEvents(Long caseId) {
        return jdbcTemplate.query(serviceEventSql("WHERE case_id = ? ORDER BY scheduled_start ASC, id ASC"),
                serviceEventMapper(), caseId);
    }

    public List<ServiceEventResponse> listAssignedServiceEvents(Long assignedUserId) {
        return jdbcTemplate.query(serviceEventSql("WHERE assigned_user_id = ? ORDER BY scheduled_start ASC, id ASC"),
                serviceEventMapper(), assignedUserId);
    }

    /** 分配给该用户、探访已过且尚未提交报告的事件数(PENDING/DUE_SOON/OVERDUE),用于看板提醒。 */
    public long countPendingReportEvents(Long assignedUserId) {
        return listAssignedServiceEvents(assignedUserId).stream()
                .map(ServiceEventResponse::getReminderState)
                .filter(state -> "PENDING".equals(state) || "DUE_SOON".equals(state) || "OVERDUE".equals(state))
                .count();
    }

    @Transactional
    public void deleteServiceEvent(Long caseId, Long eventId) {
        List<Map<String, Object>> rows = jdbcTemplate.queryForList(
                "SELECT google_event_id, google_calendar_id FROM service_appointment WHERE id = ? AND case_id = ?",
                eventId, caseId);
        int deleted = jdbcTemplate.update(
                "DELETE FROM service_appointment WHERE id = ? AND case_id = ?",
                eventId,
                caseId
        );
        if (deleted == 0) {
            throw new EntityNotFoundException("Service event not found: " + eventId);
        }
        // best-effort 从对应 Google 日历删除镜像事件
        if (!rows.isEmpty()) {
            Object googleEventId = rows.get(0).get("google_event_id");
            Object googleCalendarId = rows.get(0).get("google_calendar_id");
            if (googleEventId != null) {
                googleCalendarService.deleteCaseEvent(
                        googleCalendarId != null ? googleCalendarId.toString() : null,
                        googleEventId.toString());
            }
        }
    }

    /** 读取共享日历在区间内的事件(排除本 case 自己的事件,避免与本地渲染重复)。 */
    public List<CalendarEventResponse> listSharedCalendarEvents(Long caseId, LocalDateTime from, LocalDateTime to) {
        return googleCalendarService.listEvents(from, to, caseId);
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
        return caseRepository.findActiveCases(PageRequest.of(0, limit));
    }

    public long countActiveCases() {
        return caseRepository.countActiveCases();
    }

    public List<ClientCase> getUrgentCases(int limit) {
        return caseRepository.findUrgentActiveCases(URGENT_COLOR_CODES, PageRequest.of(0, limit));
    }

    public long countUrgentCases() {
        return caseRepository.countUrgentActiveCases(URGENT_COLOR_CODES);
    }

    public long countActiveCasesByCreatedBy(Long createdById) {
        return caseRepository.countActiveCasesByCreatedById(createdById);
    }

    public long countUrgentCasesByCreatedBy(Long createdById) {
        return caseRepository.countUrgentActiveCasesByCreatedById(createdById, URGENT_COLOR_CODES);
    }

    public long countDistinctActiveClientsByCreatedBy(Long createdById) {
        return caseRepository.countDistinctActiveClientsByCreatedById(createdById);
    }

    public List<ClientCase> getActiveCasesByCreatedBy(Long createdById, int limit) {
        return caseRepository.findActiveCasesByCreatedById(createdById, PageRequest.of(0, limit));
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
                .clientGender(clientCase.getClient().getGender())
                .clientOrdinationStatus(clientCase.getClient().getOrdinationStatus())
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
                    sa.agenda,
                    sa.schedule,
                    sa.manpower,
                    sa.instructions,
                    sa.address,
                    sa.event_seq,
                    sa.google_calendar_id,
                    (sa.google_event_id IS NOT NULL) AS synced,
                    sa.scheduled_start,
                    sa.scheduled_end,
                    sa.report_due_at,
                    EXISTS (
                        SELECT 1 FROM visit_report vr
                        WHERE vr.service_appointment_id = sa.id
                          AND vr.status = 'SUBMITTED'
                    ) AS report_submitted,
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
        return (rs, _rowNum) -> {
            LocalDateTime scheduledStart = rs.getObject("scheduled_start", LocalDateTime.class);
            LocalDateTime reportDueAt = rs.getObject("report_due_at", LocalDateTime.class);
            boolean reportSubmitted = rs.getBoolean("report_submitted");
            return ServiceEventResponse.builder()
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
                    .scheduledStart(scheduledStart)
                    .scheduledEnd(rs.getObject("scheduled_end", LocalDateTime.class))
                    .reportDueAt(reportDueAt)
                    .reportSubmitted(reportSubmitted)
                    .reminderState(computeReminderState(scheduledStart, reportDueAt, reportSubmitted))
                    .workDescription(rs.getString("work_description"))
                    .notes(rs.getString("notes"))
                    .assignedUserId(rs.getObject("assigned_user_id", Long.class))
                    .assignedUserName(rs.getString("assigned_user_name"))
                    .eventSeq(rs.getObject("event_seq", Long.class))
                    .address(rs.getString("address"))
                    .agenda(rs.getString("agenda"))
                    .schedule(rs.getString("schedule"))
                    .manpower(rs.getString("manpower"))
                    .instructions(rs.getString("instructions"))
                    .synced(rs.getBoolean("synced"))
                    .googleCalendarId(rs.getString("google_calendar_id"))
                    .build();
        };
    }

    /**
     * Volunteer 报告提醒状态(查询时实时计算,无定时任务):
     * DONE 已交;UPCOMING 探访未到不催;OVERDUE 逾期;DUE_SOON 1 天内到期;PENDING 待提交。
     */
    private String computeReminderState(LocalDateTime scheduledStart, LocalDateTime reportDueAt, boolean reportSubmitted) {
        if (reportSubmitted) {
            return "DONE";
        }
        LocalDateTime now = LocalDateTime.now();
        if (scheduledStart != null && now.isBefore(scheduledStart)) {
            return "UPCOMING";
        }
        if (reportDueAt != null) {
            if (now.isAfter(reportDueAt)) {
                return "OVERDUE";
            }
            if (now.isAfter(reportDueAt.minusDays(1))) {
                return "DUE_SOON";
            }
        }
        return "PENDING";
    }

    private void requireAssignable(User actor, User assigned) {
        boolean actorManager = hasRole(actor, "MANAGER") || hasRole(actor, "ADMIN") || hasRole(actor, "FULL_MANAGER") || hasRole(actor, "TEAM_LEAD");
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
