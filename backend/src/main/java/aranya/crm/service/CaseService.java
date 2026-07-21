package aranya.crm.service;

import aranya.crm.dto.request.CreateCaseRequest;
import aranya.crm.dto.request.CreateServiceEventRequest;
import aranya.crm.dto.request.UpdateCaseRequest;
import aranya.crm.dto.response.CalendarEventResponse;
import aranya.crm.dto.response.CaseDetailResponse;
import aranya.crm.dto.response.CaseSummaryResponse;
import aranya.crm.dto.response.ServiceEventResponse;
import aranya.crm.dto.response.UserAssignmentResponse;
import aranya.crm.entity.CaseAssignment;
import aranya.crm.entity.Client;
import aranya.crm.entity.ClientCase;
import aranya.crm.entity.ServiceAppointment;
import aranya.crm.entity.ServiceEventAssignment;
import aranya.crm.entity.User;
import aranya.crm.repository.CaseAssignmentRepository;
import aranya.crm.repository.CaseRepository;
import aranya.crm.repository.ClientRepository;
import aranya.crm.repository.ServiceAppointmentRepository;
import aranya.crm.repository.ServiceEventAssignmentRepository;
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
import java.util.Objects;
import java.util.Optional;
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
    private final CaseAssignmentRepository caseAssignmentRepository;
    private final ClientRepository clientRepository;
    private final UserRepository userRepository;
    private final ServiceAppointmentRepository serviceAppointmentRepository;
    private final ServiceEventAssignmentRepository serviceEventAssignmentRepository;
    private final JdbcTemplate jdbcTemplate;
    private final GoogleCalendarService googleCalendarService;
    private final OperationAuditLogService operationAuditLogService;

    public List<CaseSummaryResponse> listCases(String q, String status, Long scopedToUserId) {
        String normalizedQuery = normalizeFilter(q);
        String normalizedStatus = normalizeFilter(status);

        List<ClientCase> cases;
        if (scopedToUserId != null) {
            if (normalizedQuery == null && normalizedStatus == null) {
                cases = caseRepository.findAssignedCasesByUserIdOrderByOpenedAtDescIdDesc(scopedToUserId);
            } else if (normalizedQuery == null) {
                cases = caseRepository.findAssignedCasesByUserIdAndStatusIgnoreCaseOrderByOpenedAtDescIdDesc(scopedToUserId, normalizedStatus);
            } else if (normalizedStatus == null) {
                cases = caseRepository.searchAssignedCasesByUserId(scopedToUserId, normalizedQuery);
            } else {
                cases = caseRepository.searchAssignedCasesByUserId(scopedToUserId, normalizedQuery, normalizedStatus);
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
        return getCaseDetail(caseId, null);
    }

    public CaseDetailResponse getCaseDetail(Long caseId, Long scopedToUserId) {
        ClientCase clientCase = caseRepository.findById(caseId)
                .orElseThrow(() -> new EntityNotFoundException("Case not found: " + caseId));
        if (DELETED_STATUS.equalsIgnoreCase(clientCase.getStatus())) {
            throw new EntityNotFoundException("Case not found: " + caseId);
        }
        requireCaseVisible(caseId, scopedToUserId);

        return toCaseDetailResponse(clientCase);
    }

    public void requireCaseVisible(Long caseId, Long scopedToUserId) {
        if (scopedToUserId == null) {
            return;
        }
        if (!caseRepository.existsVisibleCaseForAssignedUser(caseId, scopedToUserId)) {
            throw new AccessDeniedException("User cannot access this case");
        }
    }

    public void requireCaseOperator(Long caseId, User user) {
        if (user == null || user.getId() == null) {
            throw new AccessDeniedException("User cannot modify this case");
        }
        if (isManagerLike(user) || isPrimaryAssignee(caseId, user.getId())) {
            return;
        }
        throw new AccessDeniedException("Only the primary case owner or manager can modify this case");
    }

    public void requireCaseEditor(Long caseId, User user) {
        if (user == null || user.getId() == null) {
            throw new AccessDeniedException("User cannot modify this case");
        }
        if (isManagerLike(user) || isPrimaryAssignee(caseId, user.getId()) || isActiveCaseAssignee(caseId, user.getId())) {
            return;
        }
        throw new AccessDeniedException("Only assigned case users or managers can modify this case");
    }

    public Long resolveCaseServiceApprovalApproverId(Long caseId, User requester, Long requestedApproverId) {
        if (requester == null || requester.getId() == null) {
            throw new AccessDeniedException("Requester is required");
        }
        if (!isManagerLike(requester)
                && !isPrimaryAssignee(caseId, requester.getId())
                && isActiveCaseAssignee(caseId, requester.getId())) {
            Long primaryAssigneeId = primaryAssigneeIdForCase(caseId);
            if (primaryAssigneeId == null) {
                throw new AccessDeniedException("Case primary assignee is required for approval");
            }
            return primaryAssigneeId;
        }
        return requestedApproverId;
    }

    public void requirePrimaryCaseOwner(Long caseId, User user) {
        if (user == null || user.getId() == null || !isPrimaryAssignee(caseId, user.getId())) {
            throw new AccessDeniedException("Only the primary case owner can operate service events");
        }
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

        User primaryAssignee = resolvePrimaryAssignee(request.getSocialWorkerId(), createdBy);

        ClientCase clientCase = new ClientCase();
        clientCase.setClient(client);
        clientCase.setCreatedBy(createdBy);
        clientCase.setCaseCode(generateCaseCode(request.getOpenedAt()));
        clientCase.setTitle(client.getNameEn() + " - Case");
        clientCase.setStatus(normalizeStatus(request.getStatus()));
        clientCase.setColorCode(normalizeColorCode(request.getColorCode()));
        clientCase.setTradition(client.getBuddhistTradition());
        clientCase.setOpenedAt(request.getOpenedAt().atStartOfDay());
        clientCase.setComments(trimToNull(request.getComments()));
        clientCase.setRemarks(trimToNull(request.getRemarks()));

        ClientCase saved = caseRepository.save(clientCase);
        replacePrimaryAssignee(saved, primaryAssignee, createdBy);
        replaceSelectedServices(saved.getId(), request.getServices());
        operationAuditLogService.record(
                saved, createdBy, "CASE_CREATED", "CASE", saved.getId(), saved.getCaseCode(),
                "创建个案 " + saved.getCaseCode(), null,
                Map.of("status", saved.getStatus(), "colorCode", saved.getColorCode() == null ? "" : saved.getColorCode())
        );
        return toCaseDetailResponse(saved);
    }

    @Transactional
    public CaseDetailResponse updateCase(Long caseId, UpdateCaseRequest request) {
        return updateCase(caseId, request, null, null);
    }

    @Transactional
    public CaseDetailResponse updateCase(Long caseId, UpdateCaseRequest request, User actor, Long scopedToUserId) {
        ClientCase clientCase = caseRepository.findById(caseId)
                .orElseThrow(() -> new EntityNotFoundException("Case not found: " + caseId));
        requireCaseVisible(caseId, scopedToUserId);
        if (actor != null) {
            requireCaseEditor(caseId, actor);
        }
        requireMutableCase(clientCase);

        Map<String, Object> before = new LinkedHashMap<>();
        Map<String, Object> after = new LinkedHashMap<>();
        User currentAssignee = primaryAssigneeFor(clientCase);

        String nextStatus = trimToNull(request.getStatus());
        if (nextStatus != null) {
            nextStatus = nextStatus.toUpperCase();
            addChange(before, after, "status", clientCase.getStatus(), nextStatus);
            clientCase.setStatus(nextStatus);
            if (CLOSED_STATUS.equals(nextStatus)) {
                clearCaseOperationalData(caseId);
                clientCase.setClosedAt(LocalDateTime.now());
            }
        }
        if (request.getColorCode() != null) {
            String nextColorCode = trimToNull(request.getColorCode());
            addChange(before, after, "colorCode", clientCase.getColorCode(), nextColorCode);
            clientCase.setColorCode(nextColorCode);
        }
        if (request.getComments() != null) {
            String nextComments = request.getComments().trim();
            addChange(before, after, "comments", clientCase.getComments(), nextComments);
            clientCase.setComments(nextComments);
        }
        if (request.getRemarks() != null) {
            String nextRemarks = request.getRemarks().trim();
            addChange(before, after, "remarks", clientCase.getRemarks(), nextRemarks);
            clientCase.setRemarks(nextRemarks);
        }
        if (request.getSocialWorkerId() != null) {
            if (actor != null && !isManagerLike(actor)) {
                throw new AccessDeniedException("Only managers can change the primary case owner");
            }
            User primaryAssignee = resolvePrimaryAssignee(request.getSocialWorkerId(), actor);
            addChange(before, after, "assignee",
                    currentAssignee == null ? null : currentAssignee.getFullName(),
                    primaryAssignee == null ? null : primaryAssignee.getFullName());
            replacePrimaryAssignee(clientCase, primaryAssignee, actor);
        }

        ClientCase saved = caseRepository.save(clientCase);
        if (!after.isEmpty()) {
            operationAuditLogService.record(
                    saved, actor, "CASE_UPDATED", "CASE", saved.getId(), saved.getCaseCode(),
                    "修改个案资料", before, after
            );
        }
        return toCaseDetailResponse(saved);
    }

    @Transactional
    public CaseDetailResponse executeApprovedUpdateCaseServices(Long caseId, List<String> serviceKeys, User actor) {
        ClientCase clientCase = caseRepository.findById(caseId)
                .orElseThrow(() -> new EntityNotFoundException("Case not found: " + caseId));
        requireMutableCase(clientCase);
        List<String> before = listSelectedServiceKeys(caseId);
        replaceSelectedServices(caseId, serviceKeys);
        operationAuditLogService.record(
                clientCase, actor, "CASE_SERVICES_CHANGED", "CASE", caseId, clientCase.getCaseCode(),
                "变更服务模块", Map.of("serviceKeys", before), Map.of("serviceKeys", serviceKeys == null ? List.of() : serviceKeys)
        );
        return toCaseDetailResponse(clientCase);
    }

    public CaseDetailResponse executeApprovedUpdateCaseServices(Long caseId, List<String> serviceKeys) {
        return executeApprovedUpdateCaseServices(caseId, serviceKeys, null);
    }

    public List<UserAssignmentResponse> listCaseParticipants(Long caseId) {
        ensureCaseExists(caseId);
        return caseParticipantUsers(caseId);
    }

    @Transactional
    public List<UserAssignmentResponse> updateCaseParticipants(Long caseId, List<Long> userIds, User actor) {
        ClientCase clientCase = caseRepository.findById(caseId)
                .orElseThrow(() -> new EntityNotFoundException("Case not found: " + caseId));
        requireMutableCase(clientCase);
        requirePrimaryCaseOwner(caseId, actor);

        User primaryAssignee = primaryAssigneeFor(clientCase);
        Long primaryAssigneeId = primaryAssignee != null ? primaryAssignee.getId() : null;
        List<User> participants = normalizedUserIds(userIds).stream()
                .filter(id -> primaryAssigneeId == null || !primaryAssigneeId.equals(id))
                .map(id -> userRepository.findByIdWithRoles(id)
                        .orElseThrow(() -> new EntityNotFoundException("User not found: " + id)))
                .peek(this::requireCaseParticipant)
                .toList();

        caseAssignmentRepository.deleteNonPrimaryAssignments(caseId);
        for (User participant : participants) {
            CaseAssignment assignment = new CaseAssignment();
            assignment.setClientCase(clientCase);
            assignment.setUser(participant);
            assignment.setPrimary(false);
            assignment.setAssignmentRole("SOCIAL_WORKER");
            assignment.setStatus("ACTIVE");
            assignment.setAssignedBy(actor);
            caseAssignmentRepository.save(assignment);
        }
        return caseParticipantUsers(caseId);
    }

    @Transactional
    public ServiceEventResponse createServiceEvent(Long caseId, CreateServiceEventRequest request, User createdBy) {
        ClientCase clientCase = caseRepository.findById(caseId)
                .orElseThrow(() -> new EntityNotFoundException("Case not found: " + caseId));
        requireMutableCase(clientCase);
        requirePrimaryCaseOwner(caseId, createdBy);
        Set<String> selected = selectedServiceKeySet(caseId);
        String serviceKey = trimToNull(request.getServiceKey());
        if (serviceKey == null || !selected.contains(serviceKey)) {
            throw new IllegalArgumentException("Service is not selected for this case");
        }
        validateEventTimes(request.getScheduledStart(), request.getScheduledEnd());

        User primaryAssignee = primaryAssigneeFor(clientCase);
        Long primaryAssigneeId = primaryAssignee != null ? primaryAssignee.getId() : null;
        List<Long> participantIds = eventParticipantIds(request).stream()
                .filter(id -> primaryAssigneeId == null || !primaryAssigneeId.equals(id))
                .toList();
        Long assignedId = participantIds.isEmpty() ? null : participantIds.get(0);

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

        replaceEventParticipants(eventId, participantIds, createdBy);
        ServiceEventResponse response = findServiceEventById(eventId);
        // best-effort 镜像到 Google 共享日历;失败不阻断本地创建
        mirrorToGoogle(eventId, caseId, response, trimToNull(request.getCalendarId()), null, null);
        // 重新读取使 synced 反映镜像结果
        ServiceEventResponse created = findServiceEventById(eventId);
        operationAuditLogService.record(
                clientCase, createdBy, "SERVICE_EVENT_CREATED", "SERVICE_EVENT", eventId,
                serviceEventLabel(created), "创建服务事件", null, serviceEventValues(created)
        );
        return created;
    }

    /** 编辑已存在的服务事件:更新本地真相源,并同步更新/补建 Google 镜像。 */
    @Transactional
    public ServiceEventResponse updateServiceEvent(Long caseId, Long eventId,
                                                   CreateServiceEventRequest request, User currentUser) {
        ServiceEventResponse before = findServiceEventById(eventId);
        List<Map<String, Object>> rows = jdbcTemplate.queryForList(
                "SELECT google_event_id, google_calendar_id FROM service_appointment WHERE id = ? AND case_id = ?",
                eventId, caseId);
        if (rows.isEmpty()) {
            throw new EntityNotFoundException("Service event not found: " + eventId);
        }
        ClientCase clientCase = caseRepository.findById(caseId)
                .orElseThrow(() -> new EntityNotFoundException("Case not found: " + caseId));
        requireMutableCase(clientCase);
        requirePrimaryCaseOwner(caseId, currentUser);
        Set<String> selected = selectedServiceKeySet(caseId);
        String serviceKey = trimToNull(request.getServiceKey());
        if (serviceKey == null || !selected.contains(serviceKey)) {
            throw new IllegalArgumentException("Service is not selected for this case");
        }
        validateEventTimes(request.getScheduledStart(), request.getScheduledEnd());

        User primaryAssignee = primaryAssigneeFor(clientCase);
        Long primaryAssigneeId = primaryAssignee != null ? primaryAssignee.getId() : null;
        List<Long> participantIds = eventParticipantIds(request).stream()
                .filter(id -> primaryAssigneeId == null || !primaryAssigneeId.equals(id))
                .toList();
        Long assignedId = participantIds.isEmpty() ? null : participantIds.get(0);
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

        replaceEventParticipants(eventId, participantIds, currentUser);
        ServiceEventResponse updated = findServiceEventById(eventId);
        mirrorToGoogle(eventId, caseId, updated, trimToNull(request.getCalendarId()),
                asString(rows.get(0).get("google_event_id")),
                asString(rows.get(0).get("google_calendar_id")));
        ServiceEventResponse result = findServiceEventById(eventId);
        operationAuditLogService.record(
                clientCase, currentUser, "SERVICE_EVENT_UPDATED", "SERVICE_EVENT", eventId,
                serviceEventLabel(result), "修改服务事件", serviceEventValues(before), serviceEventValues(result)
        );
        return result;
    }

    /** 手动重试将事件同步到 Google(用于上次镜像失败的事件);保持其原目标日历。 */
    public ServiceEventResponse syncServiceEvent(Long caseId, Long eventId, User currentUser) {
        ClientCase clientCase = caseRepository.findById(caseId)
                .orElseThrow(() -> new EntityNotFoundException("Case not found: " + caseId));
        requireMutableCase(clientCase);
        requireCaseOperator(caseId, currentUser);
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
        return jdbcTemplate.query(serviceEventSql("WHERE case_id = ? AND LOWER(case_status) NOT IN ('closed', 'deleted') ORDER BY scheduled_start ASC, id ASC"),
                serviceEventMapper(), caseId);
    }

    public List<ServiceEventResponse> listAssignedServiceEvents(Long assignedUserId) {
        return jdbcTemplate.query(serviceEventSql("""
                WHERE (
                    assigned_user_id = ?
                    OR EXISTS (
                        SELECT 1 FROM service_event_assignment sea
                        WHERE sea.service_appointment_id = re.id
                          AND sea.user_id = ?
                          AND UPPER(sea.status) = 'ACTIVE'
                    )
                    OR EXISTS (
                        SELECT 1 FROM case_assignment ca
                        WHERE ca.case_id = re.case_id
                          AND ca.user_id = ?
                          AND ca.is_primary = true
                          AND UPPER(ca.status) = 'ACTIVE'
                    )
                )
                AND LOWER(case_status) NOT IN ('closed', 'deleted')
                ORDER BY scheduled_start ASC, id ASC
                """),
                serviceEventMapper(), assignedUserId, assignedUserId, assignedUserId);
    }

    public List<ServiceEventResponse> listCreatedServiceEvents(Long createdById) {
        return jdbcTemplate.query(serviceEventSql("""
                WHERE created_by_id = ?
                  AND (assigned_user_id IS NULL OR assigned_user_id <> ?)
                  AND LOWER(case_status) NOT IN ('closed', 'deleted')
                ORDER BY scheduled_start ASC, id ASC
                """), serviceEventMapper(), createdById, createdById);
    }

    public List<ServiceEventResponse> listAllServiceEvents() {
        return jdbcTemplate.query(serviceEventSql("WHERE LOWER(case_status) NOT IN ('closed', 'deleted') ORDER BY scheduled_start ASC, id ASC"), serviceEventMapper());
    }

    /** 分配给该用户、探访已过且尚未提交报告的事件数(PENDING/DUE_SOON/OVERDUE),用于看板提醒。 */
    public long countPendingReportEvents(Long assignedUserId) {
        return listAssignedServiceEvents(assignedUserId).stream()
                .map(ServiceEventResponse::getReminderState)
                .filter(state -> "PENDING".equals(state) || "DUE_SOON".equals(state) || "OVERDUE".equals(state))
                .count();
    }

    @Transactional
    public void deleteServiceEvent(Long caseId, Long eventId, User actor) {
        deleteServiceEventInternal(caseId, eventId, actor, true);
    }

    public void deleteServiceEvent(Long caseId, Long eventId) {
        deleteServiceEventInternal(caseId, eventId, null, false);
    }

    private void deleteServiceEventInternal(Long caseId, Long eventId, User actor, boolean enforceActor) {
        ClientCase clientCase = caseRepository.findById(caseId)
                .orElseThrow(() -> new EntityNotFoundException("Case not found: " + caseId));
        requireMutableCase(clientCase);
        if (enforceActor) {
            requireCaseOperator(caseId, actor);
        }
        List<Map<String, Object>> rows = jdbcTemplate.queryForList(
                "SELECT google_event_id, google_calendar_id FROM service_appointment WHERE id = ? AND case_id = ?",
                eventId, caseId);
        if (rows.isEmpty()) {
            throw new EntityNotFoundException("Service event not found: " + eventId);
        }
        ServiceEventResponse before = findServiceEventById(eventId);
        cleanupReportsForEvent(eventId);
        int deleted = jdbcTemplate.update("DELETE FROM service_appointment WHERE id = ? AND case_id = ?", eventId, caseId);
        if (deleted == 0) throw new EntityNotFoundException("Service event not found: " + eventId);
        deleteMirroredEvents(rows);
        operationAuditLogService.record(
                clientCase, actor, "SERVICE_EVENT_DELETED", "SERVICE_EVENT", eventId,
                serviceEventLabel(before), "删除服务事件", serviceEventValues(before), null
        );
    }

    /** 读取共享日历在区间内的事件(排除本 case 自己的事件,避免与本地渲染重复)。 */
    public List<CalendarEventResponse> listSharedCalendarEvents(Long caseId, LocalDateTime from, LocalDateTime to) {
        return googleCalendarService.listEvents(from, to, caseId);
    }

    @Transactional
    public void executeApprovedDeleteCase(Long caseId, User actor) {
        ClientCase clientCase = caseRepository.findById(caseId)
                .orElseThrow(() -> new EntityNotFoundException("Case not found: " + caseId));
        String beforeStatus = clientCase.getStatus();
        clearCaseOperationalData(caseId);
        clientCase.setStatus(CLOSED_STATUS);
        clientCase.setClosedAt(LocalDateTime.now());
        caseRepository.save(clientCase);
        operationAuditLogService.record(
                clientCase, actor, "CASE_ARCHIVED", "CASE", caseId, clientCase.getCaseCode(),
                "归档个案", Map.of("status", beforeStatus), Map.of("status", CLOSED_STATUS)
        );
    }

    public void executeApprovedDeleteCase(Long caseId) {
        executeApprovedDeleteCase(caseId, null);
    }

    @Transactional
    public CaseDetailResponse restoreCase(Long caseId, User actor) {
        ClientCase clientCase = caseRepository.findById(caseId)
                .orElseThrow(() -> new EntityNotFoundException("Case not found: " + caseId));
        if (DELETED_STATUS.equalsIgnoreCase(clientCase.getStatus())) {
            throw new EntityNotFoundException("Case not found: " + caseId);
        }
        if (CLOSED_STATUS.equalsIgnoreCase(clientCase.getStatus())) {
            String beforeStatus = clientCase.getStatus();
            clientCase.setStatus("OPEN");
            clientCase.setClosedAt(null);
            caseRepository.save(clientCase);
            operationAuditLogService.record(
                    clientCase, actor, "CASE_RESTORED", "CASE", caseId, clientCase.getCaseCode(),
                    "恢复个案", Map.of("status", beforeStatus), Map.of("status", "OPEN")
            );
        }
        return toCaseDetailResponse(clientCase);
    }

    public CaseDetailResponse restoreCase(Long caseId) {
        return restoreCase(caseId, null);
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
        return caseRepository.countActiveAssignedCasesByUserId(createdById);
    }

    public long countUrgentCasesByCreatedBy(Long createdById) {
        return caseRepository.countUrgentActiveAssignedCasesByUserId(createdById, URGENT_COLOR_CODES);
    }

    public long countDistinctActiveClientsByCreatedBy(Long createdById) {
        return caseRepository.countDistinctActiveClientsByAssignedUserId(createdById);
    }

    public List<ClientCase> getActiveCasesByCreatedBy(Long createdById, int limit) {
        return caseRepository.findActiveAssignedCasesByUserId(createdById, PageRequest.of(0, limit));
    }

    private CaseSummaryResponse toCaseSummaryResponse(ClientCase clientCase) {
        User primaryAssignee = primaryAssigneeFor(clientCase);
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
                .createdById(primaryAssignee != null ? primaryAssignee.getId() : null)
                .createdByName(primaryAssignee != null ? primaryAssignee.getFullName() : null)
                .participantUsers(caseParticipantUsers(clientCase.getId()))
                .comments(clientCase.getComments())
                .remarks(clientCase.getRemarks())
                .build();
    }

    private CaseDetailResponse toCaseDetailResponse(ClientCase clientCase) {
        User primaryAssignee = primaryAssigneeFor(clientCase);
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
                .createdById(primaryAssignee != null ? primaryAssignee.getId() : null)
                .createdByName(primaryAssignee != null ? primaryAssignee.getFullName() : null)
                .participantUsers(caseParticipantUsers(clientCase.getId()))
                .comments(clientCase.getComments())
                .remarks(clientCase.getRemarks())
                .services(selectedServices(clientCase.getId()))
                .serviceEvents(listServiceEvents(clientCase.getId()))
                .build();
    }

    private User primaryAssigneeFor(ClientCase clientCase) {
        return caseAssignmentRepository
                .findFirstByClientCase_IdAndPrimaryTrueAndStatusIgnoreCaseOrderByAssignedAtDescIdDesc(clientCase.getId(), "ACTIVE")
                .map(CaseAssignment::getUser)
                .orElse(clientCase.getCreatedBy());
    }

    private List<UserAssignmentResponse> caseParticipantUsers(Long caseId) {
        return caseAssignmentRepository
                .findByClientCase_IdAndPrimaryFalseAndStatusIgnoreCaseOrderByAssignedAtAscIdAsc(caseId, "ACTIVE")
                .stream()
                .map(CaseAssignment::getUser)
                .map(user -> toUserAssignmentResponse(user, "SOCIAL_WORKER"))
                .toList();
    }

    private List<UserAssignmentResponse> eventParticipantUsers(Long eventId) {
        return serviceEventAssignmentRepository
                .findByServiceAppointment_IdAndStatusIgnoreCaseOrderByAssignedAtAscIdAsc(eventId, "ACTIVE")
                .stream()
                .map(assignment -> toUserAssignmentResponse(assignment.getUser(), assignment.getAssignmentRole()))
                .toList();
    }

    private UserAssignmentResponse toUserAssignmentResponse(User user, String role) {
        return UserAssignmentResponse.builder()
                .id(user.getId())
                .fullName(user.getFullName())
                .email(user.getEmail())
                .role(role)
                .build();
    }

    private void ensureCaseExists(Long caseId) {
        ClientCase clientCase = caseRepository.findById(caseId)
                .orElseThrow(() -> new EntityNotFoundException("Case not found: " + caseId));
        if (DELETED_STATUS.equalsIgnoreCase(clientCase.getStatus())) {
            throw new EntityNotFoundException("Case not found: " + caseId);
        }
    }

    private User resolvePrimaryAssignee(Long requestedAssigneeId, User fallbackUser) {
        if (requestedAssigneeId != null) {
            User assignee = userRepository.findByIdWithRoles(requestedAssigneeId)
                    .orElseThrow(() -> new EntityNotFoundException("User not found: " + requestedAssigneeId));
            requirePrimaryAssignee(assignee);
            return assignee;
        }
        if (fallbackUser == null || fallbackUser.getId() == null) {
            return null;
        }
        return userRepository.findByIdWithRoles(fallbackUser.getId())
                .filter(user -> "ACTIVE".equalsIgnoreCase(user.getStatus()) && isPrimaryAssigneeRole(user))
                .orElse(null);
    }

    private void replacePrimaryAssignee(ClientCase clientCase, User assignee, User assignedBy) {
        caseAssignmentRepository.deactivatePrimaryAssignments(clientCase.getId());
        if (assignee == null) {
            return;
        }
        CaseAssignment assignment = new CaseAssignment();
        assignment.setClientCase(clientCase);
        assignment.setUser(assignee);
        assignment.setPrimary(true);
        assignment.setAssignmentRole(primaryAssignmentRole(assignee));
        assignment.setStatus("ACTIVE");
        assignment.setAssignedBy(assignedBy != null && assignedBy.getId() != null ? assignedBy : null);
        caseAssignmentRepository.save(assignment);
    }

    private void requirePrimaryAssignee(User user) {
        if (!"ACTIVE".equalsIgnoreCase(user.getStatus()) || !isPrimaryAssigneeRole(user)) {
            throw new AccessDeniedException("Primary case assignee must be an active manager or social worker");
        }
    }

    private void requireCaseParticipant(User user) {
        if (!"ACTIVE".equalsIgnoreCase(user.getStatus()) || !hasRole(user, "SOCIAL_WORKER")) {
            throw new AccessDeniedException("Case participants must be active social workers");
        }
    }

    private void requireEventParticipant(User user) {
        boolean eventParticipantRole = hasRole(user, "SOCIAL_WORKER") || hasRole(user, "VOLUNTEER");
        if (!"ACTIVE".equalsIgnoreCase(user.getStatus()) || !eventParticipantRole || isManagerLike(user)) {
            throw new AccessDeniedException("Event participants must be active social workers or volunteers");
        }
    }

    private boolean isPrimaryAssigneeRole(User user) {
        return hasRole(user, "MANAGER") || hasRole(user, "SOCIAL_WORKER")
                || hasRole(user, "FULL_MANAGER") || hasRole(user, "TEAM_LEAD");
    }

    private String primaryAssignmentRole(User user) {
        if (hasRole(user, "SOCIAL_WORKER")) {
            return "SOCIAL_WORKER";
        }
        return "MANAGER";
    }

    private boolean isManagerLike(User user) {
        return hasRole(user, "MANAGER") || hasRole(user, "ADMIN") || hasRole(user, "FULL_MANAGER") || hasRole(user, "TEAM_LEAD");
    }

    private boolean isPrimaryAssignee(Long caseId, Long userId) {
        Optional<CaseAssignment> activePrimary = caseAssignmentRepository
                .findFirstByClientCase_IdAndPrimaryTrueAndStatusIgnoreCaseOrderByAssignedAtDescIdDesc(caseId, "ACTIVE");
        if (activePrimary.isPresent()) {
            return activePrimary
                    .map(CaseAssignment::getUser)
                    .map(User::getId)
                    .filter(userId::equals)
                    .isPresent();
        }
        return caseRepository.findById(caseId)
                .map(ClientCase::getCreatedBy)
                .map(User::getId)
                .filter(userId::equals)
                .isPresent();
    }

    private boolean isActiveCaseAssignee(Long caseId, Long userId) {
        return caseAssignmentRepository.existsActiveAssignment(caseId, userId);
    }

    private Long primaryAssigneeIdForCase(Long caseId) {
        Optional<CaseAssignment> activePrimary = caseAssignmentRepository
                .findFirstByClientCase_IdAndPrimaryTrueAndStatusIgnoreCaseOrderByAssignedAtDescIdDesc(caseId, "ACTIVE");
        if (activePrimary.isPresent()) {
            return activePrimary
                    .map(CaseAssignment::getUser)
                    .map(User::getId)
                    .orElse(null);
        }
        return caseRepository.findById(caseId)
                .map(ClientCase::getCreatedBy)
                .map(User::getId)
                .orElse(null);
    }

    private List<Long> eventParticipantIds(CreateServiceEventRequest request) {
        List<Long> ids = new java.util.ArrayList<>();
        if (request.getAssignedUserId() != null) {
            ids.add(request.getAssignedUserId());
        }
        if (request.getParticipantUserIds() != null) {
            ids.addAll(request.getParticipantUserIds());
        }
        return normalizedUserIds(ids);
    }

    private List<Long> normalizedUserIds(List<Long> userIds) {
        if (userIds == null) {
            return List.of();
        }
        return userIds.stream()
                .filter(id -> id != null)
                .distinct()
                .toList();
    }

    private void replaceEventParticipants(Long eventId, List<Long> userIds, User actor) {
        ServiceAppointment appointment = serviceAppointmentRepository.findById(eventId)
                .orElseThrow(() -> new EntityNotFoundException("Service event not found: " + eventId));
        deleteEventAssignments(eventId);
        for (Long userId : normalizedUserIds(userIds)) {
            User participant = userRepository.findByIdWithRoles(userId)
                    .orElseThrow(() -> new EntityNotFoundException("User not found: " + userId));
            requireEventParticipant(participant);
            ServiceEventAssignment assignment = new ServiceEventAssignment();
            assignment.setServiceAppointment(appointment);
            assignment.setUser(participant);
            assignment.setAssignmentRole(hasRole(participant, "SOCIAL_WORKER") ? "SOCIAL_WORKER" : "VOLUNTEER");
            assignment.setStatus("ACTIVE");
            assignment.setAssignedBy(actor);
            serviceEventAssignmentRepository.save(assignment);
        }
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
            deleteEventsForRemovedService(caseId, removedKey);
        }
        jdbcTemplate.update("DELETE FROM case_service_selection WHERE case_id = ?", caseId);
        nextKeys.forEach(key -> jdbcTemplate.update(
                "INSERT INTO case_service_selection (case_id, service_key) VALUES (?, ?) ON CONFLICT DO NOTHING",
                caseId, key));
    }

    private void deleteEventsForRemovedService(Long caseId, String serviceKey) {
        List<Map<String, Object>> rows = jdbcTemplate.queryForList("""
                SELECT id, google_event_id, google_calendar_id
                FROM service_appointment
                WHERE case_id = ?
                  AND service_type_id IN (SELECT id FROM service_type WHERE description = ?)
                """, caseId, serviceKey);
        for (Map<String, Object> row : rows) {
            cleanupReportsForEvent(asLong(row.get("id")));
        }
        jdbcTemplate.update("""
                DELETE FROM service_appointment
                WHERE case_id = ?
                  AND service_type_id IN (SELECT id FROM service_type WHERE description = ?)
                """, caseId, serviceKey);
        deleteMirroredEvents(rows);
    }

    private void clearCaseOperationalData(Long caseId) {
        List<Map<String, Object>> rows = jdbcTemplate.queryForList("""
                SELECT id, google_event_id, google_calendar_id
                FROM service_appointment
                WHERE case_id = ?
                """, caseId);
        for (Map<String, Object> row : rows) {
            cleanupReportsForEvent(asLong(row.get("id")));
        }
        jdbcTemplate.update("""
                DELETE FROM visit_report
                WHERE case_id = ?
                  AND UPPER(status) <> 'SUBMITTED'
                """, caseId);
        jdbcTemplate.update("""
                UPDATE visit_report
                SET service_appointment_id = NULL,
                    updated_at = NOW()
                WHERE case_id = ?
                """, caseId);
        jdbcTemplate.update("DELETE FROM service_appointment WHERE case_id = ?", caseId);
        jdbcTemplate.update("DELETE FROM case_service_selection WHERE case_id = ?", caseId);
        deleteMirroredEvents(rows);
    }

    private void cleanupReportsForEvent(Long eventId) {
        deleteEventAssignments(eventId);
        jdbcTemplate.update("""
                DELETE FROM visit_report
                WHERE service_appointment_id = ?
                  AND UPPER(status) = 'DRAFT'
                """, eventId);
        jdbcTemplate.update("""
                UPDATE visit_report
                SET service_appointment_id = NULL,
                    updated_at = NOW()
                WHERE service_appointment_id = ?
                """, eventId);
    }

    private void deleteEventAssignments(Long eventId) {
        jdbcTemplate.update("DELETE FROM service_event_assignment WHERE service_appointment_id = ?", eventId);
    }

    private void deleteMirroredEvents(List<Map<String, Object>> rows) {
        for (Map<String, Object> row : rows) {
            Object googleEventId = row.get("google_event_id");
            Object googleCalendarId = row.get("google_calendar_id");
            if (googleEventId != null) {
                googleCalendarService.deleteCaseEvent(
                        googleCalendarId != null ? googleCalendarId.toString() : null,
                        googleEventId.toString());
            }
        }
    }

    private Long asLong(Object value) {
        if (value instanceof Number number) {
            return number.longValue();
        }
        return value != null ? Long.valueOf(value.toString()) : null;
    }

    private void requireMutableCase(ClientCase clientCase) {
        if (clientCase == null || DELETED_STATUS.equalsIgnoreCase(clientCase.getStatus())) {
            throw new EntityNotFoundException("Case not found");
        }
        if (CLOSED_STATUS.equalsIgnoreCase(clientCase.getStatus())) {
            throw new IllegalStateException("Closed cases are read-only");
        }
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
                    cc.status AS case_status,
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
                    cu.id AS created_by_id,
                    cu.full_name AS created_by_name,
                    (
                        ROW_NUMBER() OVER (PARTITION BY sa.case_id ORDER BY sa.scheduled_start ASC, sa.id ASC)
                        || ' ' || st.name || ': ' || c.abbr || '@' || COALESCE(NULLIF(sa.location, ''), COALESCE(NULLIF(c.vihara_type, ''), c.area_district, 'Unknown'))
                    ) AS title
                FROM service_appointment sa
                JOIN "case" cc ON cc.id = sa.case_id
                JOIN client c ON c.id = cc.client_id
                JOIN service_type st ON st.id = sa.service_type_id
                LEFT JOIN users au ON au.id = sa.assigned_user_id
                LEFT JOIN users cu ON cu.id = sa.created_by
                )
                SELECT * FROM ranked_events re
                %s
                """.formatted(whereClause);
    }

    private RowMapper<ServiceEventResponse> serviceEventMapper() {
        return (rs, _rowNum) -> {
            LocalDateTime scheduledStart = rs.getObject("scheduled_start", LocalDateTime.class);
            LocalDateTime reportDueAt = rs.getObject("report_due_at", LocalDateTime.class);
            boolean reportSubmitted = rs.getBoolean("report_submitted");
            Long eventId = rs.getLong("id");
            List<UserAssignmentResponse> participantUsers = eventParticipantUsers(eventId);
            return ServiceEventResponse.builder()
                    .id(eventId)
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
                    .participantUserIds(participantUsers.stream().map(UserAssignmentResponse::getId).toList())
                    .participantUsers(participantUsers)
                    .createdById(rs.getObject("created_by_id", Long.class))
                    .createdByName(rs.getString("created_by_name"))
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

    private void addChange(Map<String, Object> before, Map<String, Object> after,
                           String field, Object oldValue, Object newValue) {
        if (Objects.equals(oldValue, newValue)) return;
        before.put(field, oldValue);
        after.put(field, newValue);
    }

    private String serviceEventLabel(ServiceEventResponse event) {
        if (event.getTitle() != null && !event.getTitle().isBlank()) return event.getTitle();
        return "Service event #" + event.getId();
    }

    private Map<String, Object> serviceEventValues(ServiceEventResponse event) {
        Map<String, Object> values = new LinkedHashMap<>();
        values.put("serviceKey", event.getServiceKey());
        values.put("scheduledStart", event.getScheduledStart());
        values.put("scheduledEnd", event.getScheduledEnd());
        values.put("reportDueAt", event.getReportDueAt());
        values.put("location", event.getLocation());
        values.put("assignedUserId", event.getAssignedUserId());
        values.put("assignedUserName", event.getAssignedUserName());
        values.put("workDescription", event.getWorkDescription());
        values.put("notes", event.getNotes());
        return values;
    }

    private void setText(String value, java.util.function.Consumer<String> setter) {
        if (value != null && !value.isBlank()) {
            setter.accept(value.trim());
        }
    }
}
