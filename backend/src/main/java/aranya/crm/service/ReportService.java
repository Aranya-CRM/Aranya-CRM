package aranya.crm.service;

import aranya.crm.dto.request.CreateReportRequest;
import aranya.crm.dto.response.ReportDetailResponse;
import aranya.crm.dto.response.ReportSummaryResponse;
import aranya.crm.entity.Client;
import aranya.crm.entity.ClientCase;
import aranya.crm.entity.ServiceAppointment;
import aranya.crm.entity.ServiceType;
import aranya.crm.entity.User;
import aranya.crm.entity.VisitReport;
import aranya.crm.repository.CaseRepository;
import aranya.crm.repository.ServiceAppointmentRepository;
import aranya.crm.repository.VisitReportRepository;
import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Duration;
import java.time.LocalDateTime;
import java.util.List;
import java.util.LinkedHashMap;
import java.util.Map;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class ReportService {

    private final VisitReportRepository visitReportRepository;
    private final CaseRepository caseRepository;
    private final ServiceAppointmentRepository serviceAppointmentRepository;
    private final OperationAuditLogService operationAuditLogService;
    private static final String STATUS_DRAFT = "DRAFT";
    private static final String STATUS_SUBMITTED = "SUBMITTED";

    /** Submitted reports are visible to reviewers; drafts stay private to their author. */
    private static final List<String> REVIEWABLE_STATUSES = List.of(STATUS_SUBMITTED);

    /** MOCK scope: Social Workers only review reports authored by volunteers. */
    private static final String VOLUNTEER_ROLE = "VOLUNTEER";

    public List<ReportSummaryResponse> listReports() {
        return visitReportRepository.findAllByOrderByCreatedAtDescIdDesc().stream()
                .map(this::toReportSummaryResponse)
                .toList();
    }

    /**
     * Reports authored by other users that are visible for review. The caller's own
     * reports and everyone's drafts are excluded (drafts stay private to their author).
     */
    public List<ReportSummaryResponse> listReviewableReports(User currentUser, boolean volunteerAuthorsOnly) {
        Long currentUserId = currentUser != null ? currentUser.getId() : null;
        if (currentUserId == null) {
            return List.of();
        }
        List<VisitReport> reports = volunteerAuthorsOnly
                ? visitReportRepository.findReviewableByAuthorRole(currentUserId, REVIEWABLE_STATUSES, VOLUNTEER_ROLE)
                : visitReportRepository.findByCreatedByIdNotAndStatusInOrderByCreatedAtDescIdDesc(currentUserId, REVIEWABLE_STATUSES);
        return reports.stream()
                .map(this::toReportSummaryResponse)
                .toList();
    }

    public List<ReportSummaryResponse> listOwnReports(User currentUser) {
        return listOwnReports(currentUser, null, null);
    }

    public List<ReportSummaryResponse> listOwnReports(User currentUser, Long caseId) {
        return listOwnReports(currentUser, caseId, null);
    }

    public List<ReportSummaryResponse> listOwnReports(User currentUser, Long caseId, Long appointmentId) {
        Long currentUserId = currentUser != null ? currentUser.getId() : null;
        if (currentUserId == null) {
            return List.of();
        }
        if (appointmentId != null) {
            return visitReportRepository.findByCreatedByIdAndServiceAppointmentIdOrderByCreatedAtDescIdDesc(currentUserId, appointmentId).stream()
                    .map(this::toReportSummaryResponse)
                    .toList();
        }
        if (caseId != null) {
            return visitReportRepository.findOwnReportsForCase(currentUserId, caseId).stream()
                    .map(this::toReportSummaryResponse)
                    .toList();
        }
        return visitReportRepository.findByCreatedByIdOrderByCreatedAtDescIdDesc(currentUserId).stream()
                .map(this::toReportSummaryResponse)
                .toList();
    }

    public ReportDetailResponse getReportDetail(Long reportId) {
        VisitReport report = visitReportRepository.findById(reportId)
                .orElseThrow(() -> new EntityNotFoundException("Report not found: " + reportId));

        return toReportDetailResponse(report);
    }

    public boolean isOwnDraft(Long reportId, User currentUser) {
        VisitReport report = visitReportRepository.findById(reportId)
                .orElseThrow(() -> new EntityNotFoundException("Report not found: " + reportId));
        Long currentUserId = currentUser != null ? currentUser.getId() : null;
        Long ownerId = report.getCreatedBy() != null ? report.getCreatedBy().getId() : null;
        return currentUserId != null
                && ownerId != null
                && currentUserId.equals(ownerId)
                && STATUS_DRAFT.equalsIgnoreCase(report.getStatus());
    }

    @Transactional
    public ReportDetailResponse createReport(CreateReportRequest request, User createdBy) {
        ServiceAppointment appointment = requireAssignedAppointment(request.getAppointmentId(), createdBy);
        ClientCase clientCase = appointment.getClientCase();
        Client client = clientCase.getClient();

        VisitReport report = new VisitReport();
        report.setCreatedBy(createdBy);
        report.setStaffName(normalizeText(request.getStaffName()) != null
                ? normalizeText(request.getStaffName())
                : createdBy != null ? createdBy.getFullName() : null);
        report.setReportTimestamp(LocalDateTime.now());
        applyEventContext(report, appointment, clientCase, client);
        applyReportFields(report, request);
        report.setStatus(normalizeStatus(request.getStatus()));

        VisitReport saved = visitReportRepository.save(report);
        recordReportLog(saved, createdBy, "REPORT_CREATED", "创建报告", null, reportAuditValues(saved));
        return toReportDetailResponse(saved);
    }

    @Transactional
    public ReportDetailResponse updateReport(Long reportId, CreateReportRequest request, User currentUser) {
        VisitReport report = visitReportRepository.findById(reportId)
                .orElseThrow(() -> new EntityNotFoundException("Report not found: " + reportId));
        requireOwner(report, currentUser);
        requireEditable(report);
        Map<String, Object> before = reportAuditValues(report);
        ServiceAppointment appointment = report.getServiceAppointment();
        if (appointment == null) {
            appointment = requireAssignedAppointment(request.getAppointmentId(), currentUser);
        } else {
            requireAssignedAppointment(appointment, currentUser);
        }
        ClientCase clientCase = appointment.getClientCase();
        Client client = clientCase.getClient();

        applyEventContext(report, appointment, clientCase, client);
        applyReportFields(report, request);

        recordReportLog(report, currentUser, "REPORT_UPDATED", "修改报告", before, reportAuditValues(report));

        return toReportDetailResponse(report);
    }

    @Transactional
    public ReportDetailResponse submitReport(Long reportId, User currentUser) {
        VisitReport report = visitReportRepository.findById(reportId)
                .orElseThrow(() -> new EntityNotFoundException("Report not found: " + reportId));
        requireOwner(report, currentUser);
        requireEditable(report);
        String beforeStatus = report.getStatus();
        report.setStatus(STATUS_SUBMITTED);
        report.setUpdatedAt(LocalDateTime.now());
        recordReportLog(report, currentUser, "REPORT_SUBMITTED", "提交报告",
                Map.of("status", beforeStatus), Map.of("status", STATUS_SUBMITTED));
        return toReportDetailResponse(report);
    }

    @Transactional
    public void deleteOwnDraftReport(Long reportId, User currentUser) {
        deleteReport(reportId, currentUser, false);
    }

    @Transactional
    public void executeApprovedDeleteReport(Long reportId, User approvedBy) {
        deleteReport(reportId, approvedBy, true);
    }

    private void deleteReport(Long reportId, User currentUser, boolean canDeleteAny) {
        VisitReport report = visitReportRepository.findById(reportId)
                .orElseThrow(() -> new EntityNotFoundException("Report not found: " + reportId));
        if (!canDeleteAny) {
            requireOwner(report, currentUser);
            requireDraft(report);
        }

        recordReportLog(report, currentUser, "REPORT_DELETED", "删除报告",
                reportAuditValues(report), null);
        visitReportRepository.delete(report);
    }

    private void recordReportLog(VisitReport report, User actor, String action, String summary,
                                 Map<String, ?> before, Map<String, ?> after) {
        ClientCase clientCase = report.getClientCase();
        if (clientCase == null) return;
        operationAuditLogService.record(
                clientCase, actor, action, "REPORT", report.getId(), "RPT-" + report.getId(),
                summary, before, after
        );
    }

    private Map<String, Object> reportAuditValues(VisitReport report) {
        Map<String, Object> values = new LinkedHashMap<>();
        values.put("status", report.getStatus());
        values.put("dateOfVisit", report.getDateOfVisit());
        values.put("timeOfVisit", report.getTimeOfVisit());
        values.put("location", report.getLocation());
        values.put("programmeName", report.getProgrammeName());
        values.put("typeOfVisit", report.getTypeOfVisit());
        return values;
    }

    private ReportSummaryResponse toReportSummaryResponse(VisitReport report) {
        Client client = report.getClient();
        User createdBy = report.getCreatedBy();
        ServiceAppointment appointment = report.getServiceAppointment();
        ServiceType serviceType = appointment != null ? appointment.getServiceType() : null;

        return ReportSummaryResponse.builder()
                .id(report.getId())
                .caseId(report.getClientCase() != null ? report.getClientCase().getId() : null)
                .clientId(client != null ? client.getId() : null)
                .appointmentId(appointment != null ? appointment.getId() : null)
                .clientAbbr(client != null ? client.getAbbr() : null)
                .clientNameEn(client != null ? client.getNameEn() : null)
                .clientNameChn(client != null ? client.getNameChn() : null)
                .caseCode(findReportCaseCode(report))
                .createdById(createdBy != null ? createdBy.getId() : null)
                .createdByName(createdBy != null ? createdBy.getFullName() : null)
                .staffName(report.getStaffName())
                .reportTimestamp(report.getReportTimestamp())
                .dateOfVisit(report.getDateOfVisit())
                .timeOfVisit(report.getTimeOfVisit())
                .durationOfVisit(report.getDurationOfVisit())
                .location(report.getLocation())
                .programmeName(report.getProgrammeName())
                .typeOfVisit(report.getTypeOfVisit())
                .eventTitle(eventTitle(report))
                .eventScheduledStart(appointment != null ? appointment.getScheduledStart() : null)
                .eventScheduledEnd(appointment != null ? appointment.getScheduledEnd() : null)
                .eventLocation(appointment != null ? appointment.getLocation() : null)
                .eventAddress(appointment != null ? appointment.getAddress() : null)
                .eventContent(eventContent(appointment))
                .serviceKey(serviceType != null ? serviceType.getDescription() : null)
                .serviceName(serviceType != null ? serviceType.getName() : null)
                .status(report.getStatus())
                .createdAt(report.getCreatedAt())
                .build();
    }

    private ReportDetailResponse toReportDetailResponse(VisitReport report) {
        Client client = report.getClient();
        User createdBy = report.getCreatedBy();
        ServiceAppointment appointment = report.getServiceAppointment();
        ServiceType serviceType = appointment != null ? appointment.getServiceType() : null;

        return ReportDetailResponse.builder()
                .id(report.getId())
                .caseId(report.getClientCase() != null ? report.getClientCase().getId() : null)
                .clientId(client != null ? client.getId() : null)
                .appointmentId(appointment != null ? appointment.getId() : null)
                .clientAbbr(client != null ? client.getAbbr() : null)
                .clientNameEn(client != null ? client.getNameEn() : null)
                .clientNameChn(client != null ? client.getNameChn() : null)
                .caseCode(findReportCaseCode(report))
                .createdById(createdBy != null ? createdBy.getId() : null)
                .createdByName(createdBy != null ? createdBy.getFullName() : null)
                .staffName(report.getStaffName())
                .reportTimestamp(report.getReportTimestamp())
                .dateOfVisit(report.getDateOfVisit())
                .timeOfVisit(report.getTimeOfVisit())
                .durationOfVisit(report.getDurationOfVisit())
                .location(report.getLocation())
                .programmeName(report.getProgrammeName())
                .typeOfVisit(report.getTypeOfVisit())
                .eventTitle(eventTitle(report))
                .eventScheduledStart(appointment != null ? appointment.getScheduledStart() : null)
                .eventScheduledEnd(appointment != null ? appointment.getScheduledEnd() : null)
                .eventLocation(appointment != null ? appointment.getLocation() : null)
                .eventAddress(appointment != null ? appointment.getAddress() : null)
                .eventContent(eventContent(appointment))
                .serviceKey(serviceType != null ? serviceType.getDescription() : null)
                .serviceName(serviceType != null ? serviceType.getName() : null)
                .purposeOfVisit(report.getPurposeOfVisit())
                .whatWasDone(report.getWhatWasDone())
                .environmentObservations(report.getEnvironmentObservations())
                .sanghaObservations(report.getSanghaObservations())
                .otherObservations(report.getOtherObservations())
                .personalReflections(report.getPersonalReflections())
                .recommendations(report.getRecommendations())
                .mattersToHighlight(report.getMattersToHighlight())
                .status(report.getStatus())
                .createdAt(report.getCreatedAt())
                .updatedAt(report.getUpdatedAt())
                .build();
    }

    private String normalizeText(String value) {
        if (value == null || value.isBlank()) {
            return null;
        }
        return value.trim();
    }

    private String findReportCaseCode(VisitReport report) {
        if (report.getClientCase() != null) {
            return report.getClientCase().getCaseCode();
        }
        Client client = report.getClient();
        if (client == null || client.getId() == null) {
            return null;
        }
        return caseRepository.findFirstByClientIdOrderByOpenedAtDescIdDesc(client.getId())
                .map(ClientCase::getCaseCode)
                .orElse(null);
    }

    private String normalizeStatus(String value) {
        if (value == null || value.isBlank()) {
            return STATUS_SUBMITTED;
        }
        String normalized = value.trim().toUpperCase();
        if (STATUS_DRAFT.equals(normalized)) {
            return STATUS_DRAFT;
        }
        return STATUS_SUBMITTED;
    }

    private void requireDraft(VisitReport report) {
        if (!STATUS_DRAFT.equalsIgnoreCase(report.getStatus())) {
            throw new IllegalStateException("Only draft reports can be deleted");
        }
    }

    private void requireEditable(VisitReport report) {
        if (!STATUS_DRAFT.equalsIgnoreCase(report.getStatus())) {
            throw new IllegalStateException("Only draft reports can be changed");
        }
    }

    private void requireOwner(VisitReport report, User currentUser) {
        Long currentUserId = currentUser != null ? currentUser.getId() : null;
        Long ownerId = report.getCreatedBy() != null ? report.getCreatedBy().getId() : null;
        if (currentUserId == null || ownerId == null || !currentUserId.equals(ownerId)) {
            throw new AccessDeniedException("Report does not belong to current user");
        }
    }

    private void applyEventContext(VisitReport report, ServiceAppointment appointment, ClientCase clientCase, Client client) {
        ServiceType serviceType = appointment.getServiceType();
        report.setClient(client);
        report.setClientCase(clientCase);
        report.setServiceAppointment(appointment);
        report.setDateOfVisit(appointment.getScheduledStart().toLocalDate());
        report.setTimeOfVisit(formatEventTime(appointment));
        report.setDurationOfVisit(formatEventDuration(appointment));
        report.setLocation(normalizeText(appointment.getLocation()));
        report.setProgrammeName(serviceType != null ? normalizeText(serviceType.getName()) : null);
        report.setTypeOfVisit(serviceType != null ? normalizeText(serviceType.getDescription()) : null);
    }

    private void applyReportFields(VisitReport report, CreateReportRequest request) {
        if (request.getDateOfVisit() != null) {
            report.setDateOfVisit(request.getDateOfVisit());
        }
        String requestedTime = normalizeText(request.getTimeOfVisit());
        if (requestedTime != null) {
            report.setTimeOfVisit(requestedTime);
        }
        String requestedDuration = normalizeText(request.getDurationOfVisit());
        if (requestedDuration != null) {
            report.setDurationOfVisit(requestedDuration);
        }
        report.setPurposeOfVisit(normalizeText(request.getPurposeOfVisit()));
        report.setWhatWasDone(normalizeText(request.getWhatWasDone()));
        report.setEnvironmentObservations(normalizeText(request.getEnvironmentObservations()));
        report.setSanghaObservations(normalizeText(request.getSanghaObservations()));
        report.setOtherObservations(normalizeText(request.getOtherObservations()));
        report.setPersonalReflections(normalizeText(request.getPersonalReflections()));
        report.setRecommendations(normalizeText(request.getRecommendations()));
        report.setMattersToHighlight(normalizeText(request.getMattersToHighlight()));
        report.setUpdatedAt(LocalDateTime.now());
    }

    private ServiceAppointment requireAssignedAppointment(Long appointmentId, User currentUser) {
        if (appointmentId == null) {
            throw new IllegalArgumentException("Service event is required");
        }
        ServiceAppointment appointment = serviceAppointmentRepository.findById(appointmentId)
                .orElseThrow(() -> new EntityNotFoundException("Service event not found: " + appointmentId));
        requireAssignedAppointment(appointment, currentUser);
        return appointment;
    }

    private void requireAssignedAppointment(ServiceAppointment appointment, User currentUser) {
        Long currentUserId = currentUser != null ? currentUser.getId() : null;
        Long assignedUserId = appointment.getAssignedUser() != null ? appointment.getAssignedUser().getId() : null;
        if (currentUserId == null || assignedUserId == null || !currentUserId.equals(assignedUserId)) {
            throw new AccessDeniedException("Report can only be submitted by the assigned event owner");
        }
    }

    private String formatEventTime(ServiceAppointment appointment) {
        LocalDateTime start = appointment.getScheduledStart();
        LocalDateTime end = appointment.getScheduledEnd();
        if (start == null) {
            return null;
        }
        String startTime = start.toLocalTime().toString();
        if (end == null) {
            return startTime;
        }
        return startTime + " - " + end.toLocalTime();
    }

    private String formatEventDuration(ServiceAppointment appointment) {
        LocalDateTime start = appointment.getScheduledStart();
        LocalDateTime end = appointment.getScheduledEnd();
        if (start == null || end == null || !end.isAfter(start)) {
            return null;
        }
        long minutes = Duration.between(start, end).toMinutes();
        if (minutes < 60) {
            return minutes + " min";
        }
        long hours = minutes / 60;
        long remainingMinutes = minutes % 60;
        return remainingMinutes == 0 ? hours + " hr" : hours + " hr " + remainingMinutes + " min";
    }

    private String eventTitle(VisitReport report) {
        ServiceAppointment appointment = report.getServiceAppointment();
        if (appointment == null) {
            return null;
        }
        ServiceType serviceType = appointment.getServiceType();
        String serviceName = serviceType != null ? serviceType.getName() : null;
        String clientAbbr = report.getClient() != null ? report.getClient().getAbbr() : null;
        String location = normalizeText(appointment.getLocation());
        if (serviceName == null && clientAbbr == null) {
            return null;
        }
        String subject = serviceName != null ? serviceName : "";
        if (clientAbbr != null) {
            subject = subject.isBlank() ? clientAbbr : subject + ": " + clientAbbr;
        }
        if (location != null) {
            subject = subject + "@" + location;
        }
        if (appointment.getEventSeq() != null) {
            return appointment.getEventSeq() + " " + subject;
        }
        return subject;
    }

    private String eventContent(ServiceAppointment appointment) {
        if (appointment == null) {
            return null;
        }
        String content = java.util.stream.Stream.of(
                        appointment.getWorkDescription(),
                        appointment.getAgenda(),
                        appointment.getSchedule(),
                        appointment.getManpower(),
                        appointment.getInstructions()
                )
                .map(this::normalizeText)
                .filter(value -> value != null)
                .distinct()
                .collect(java.util.stream.Collectors.joining("\n\n"));
        return content.isBlank() ? null : content;
    }

}
