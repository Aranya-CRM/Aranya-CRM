package aranya.crm.service;

import aranya.crm.dto.request.CreateReportRequest;
import aranya.crm.dto.response.ReportDetailResponse;
import aranya.crm.dto.response.ReportSummaryResponse;
import aranya.crm.entity.CaseNote;
import aranya.crm.entity.Client;
import aranya.crm.entity.ClientCase;
import aranya.crm.entity.User;
import aranya.crm.entity.VisitReport;
import aranya.crm.repository.CaseNoteRepository;
import aranya.crm.repository.CaseRepository;
import aranya.crm.repository.ClientRepository;
import aranya.crm.repository.VisitReportRepository;
import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class ReportService {

    private final ClientRepository clientRepository;
    private final VisitReportRepository visitReportRepository;
    private final CaseRepository caseRepository;
    private final CaseNoteRepository caseNoteRepository;
    private static final String STATUS_DRAFT = "DRAFT";
    private static final String STATUS_SUBMITTED = "SUBMITTED";
    private static final String STATUS_ARCHIVED = "ARCHIVED";
    private static final String STATUS_RETURNED = "RETURNED";

    /** Statuses of reports that are visible to other users for review/approval. */
    private static final List<String> REVIEWABLE_STATUSES = List.of(STATUS_SUBMITTED, STATUS_ARCHIVED);

    /** MOCK scope: Social Workers only review reports authored by volunteers. */
    private static final String VOLUNTEER_ROLE = "VOLUNTEER";

    public List<ReportSummaryResponse> listReports() {
        return visitReportRepository.findAllByOrderByCreatedAtDescIdDesc().stream()
                .map(this::toReportSummaryResponse)
                .toList();
    }

    /**
     * Reports authored by other users that are visible for review — submitted or
     * archived only. The caller's own reports and everyone's drafts/returned reports
     * are excluded (drafts stay private to their author, viewable via listOwnReports).
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
        Long currentUserId = currentUser != null ? currentUser.getId() : null;
        if (currentUserId == null) {
            return List.of();
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

    @Transactional
    public ReportDetailResponse createReport(CreateReportRequest request, User createdBy) {
        Client client = clientRepository.findById(request.getClientId())
                .orElseThrow(() -> new EntityNotFoundException("Client not found: " + request.getClientId()));

        VisitReport report = new VisitReport();
        report.setCreatedBy(createdBy);
        report.setStaffName(normalizeText(request.getStaffName()) != null
                ? normalizeText(request.getStaffName())
                : createdBy != null ? createdBy.getFullName() : null);
        report.setReportTimestamp(LocalDateTime.now());
        applyReportFields(report, client, request);
        report.setStatus(normalizeStatus(request.getStatus()));

        VisitReport savedReport = visitReportRepository.save(report);
        if (isSubmitted(savedReport)) {
            createLinkedCaseNoteIfPresent(client, savedReport, createdBy);
        }

        return toReportDetailResponse(savedReport);
    }

    @Transactional
    public ReportDetailResponse updateReport(Long reportId, CreateReportRequest request, User currentUser) {
        VisitReport report = visitReportRepository.findById(reportId)
                .orElseThrow(() -> new EntityNotFoundException("Report not found: " + reportId));
        requireOwner(report, currentUser);
        requireEditable(report);
        Client client = clientRepository.findById(request.getClientId())
                .orElseThrow(() -> new EntityNotFoundException("Client not found: " + request.getClientId()));

        applyReportFields(report, client, request);

        return toReportDetailResponse(report);
    }

    @Transactional
    public ReportDetailResponse submitReport(Long reportId, User currentUser) {
        VisitReport report = visitReportRepository.findById(reportId)
                .orElseThrow(() -> new EntityNotFoundException("Report not found: " + reportId));
        requireOwner(report, currentUser);
        requireEditable(report);
        report.setStatus(STATUS_SUBMITTED);
        report.setUpdatedAt(LocalDateTime.now());
        createLinkedCaseNoteIfPresent(report.getClient(), report, currentUser);
        return toReportDetailResponse(report);
    }

    @Transactional
    public ReportDetailResponse approveReport(Long reportId, User currentUser) {
        VisitReport report = visitReportRepository.findById(reportId)
                .orElseThrow(() -> new EntityNotFoundException("Report not found: " + reportId));
        requireSubmitted(report);
        report.setStatus(STATUS_ARCHIVED);
        report.setUpdatedAt(LocalDateTime.now());
        return toReportDetailResponse(report);
    }

    @Transactional
    public void deleteReport(Long reportId, User currentUser) {
        VisitReport report = visitReportRepository.findById(reportId)
                .orElseThrow(() -> new EntityNotFoundException("Report not found: " + reportId));
        requireOwner(report, currentUser);
        requireDraft(report);

        visitReportRepository.delete(report);
    }

    private ReportSummaryResponse toReportSummaryResponse(VisitReport report) {
        Client client = report.getClient();
        User createdBy = report.getCreatedBy();

        return ReportSummaryResponse.builder()
                .id(report.getId())
                .clientId(client != null ? client.getId() : null)
                .clientAbbr(client != null ? client.getAbbr() : null)
                .clientNameEn(client != null ? client.getNameEn() : null)
                .clientNameChn(client != null ? client.getNameChn() : null)
                .caseCode(findReportCaseCode(client))
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
                .status(report.getStatus())
                .createdAt(report.getCreatedAt())
                .build();
    }

    private ReportDetailResponse toReportDetailResponse(VisitReport report) {
        Client client = report.getClient();
        User createdBy = report.getCreatedBy();

        return ReportDetailResponse.builder()
                .id(report.getId())
                .clientId(client != null ? client.getId() : null)
                .clientAbbr(client != null ? client.getAbbr() : null)
                .clientNameEn(client != null ? client.getNameEn() : null)
                .clientNameChn(client != null ? client.getNameChn() : null)
                .caseCode(findReportCaseCode(client))
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

    private String findReportCaseCode(Client client) {
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
        if (STATUS_ARCHIVED.equals(normalized)) {
            return STATUS_ARCHIVED;
        }
        if (STATUS_RETURNED.equals(normalized)) {
            return STATUS_RETURNED;
        }
        return STATUS_SUBMITTED;
    }

    private boolean isSubmitted(VisitReport report) {
        return STATUS_SUBMITTED.equalsIgnoreCase(report.getStatus());
    }

    private void requireSubmitted(VisitReport report) {
        if (!STATUS_SUBMITTED.equalsIgnoreCase(report.getStatus())) {
            throw new IllegalStateException("Only submitted reports can be approved");
        }
    }

    private void requireDraft(VisitReport report) {
        if (!STATUS_DRAFT.equalsIgnoreCase(report.getStatus())) {
            throw new IllegalStateException("Only draft reports can be deleted");
        }
    }

    private void requireEditable(VisitReport report) {
        if (!STATUS_DRAFT.equalsIgnoreCase(report.getStatus())
                && !STATUS_RETURNED.equalsIgnoreCase(report.getStatus())) {
            throw new IllegalStateException("Only draft or returned reports can be changed");
        }
    }

    private void requireOwner(VisitReport report, User currentUser) {
        Long currentUserId = currentUser != null ? currentUser.getId() : null;
        Long ownerId = report.getCreatedBy() != null ? report.getCreatedBy().getId() : null;
        if (currentUserId == null || ownerId == null || !currentUserId.equals(ownerId)) {
            throw new AccessDeniedException("Report does not belong to current user");
        }
    }

    private void applyReportFields(VisitReport report, Client client, CreateReportRequest request) {
        report.setClient(client);
        report.setDateOfVisit(request.getDateOfVisit());
        report.setTimeOfVisit(normalizeText(request.getTimeOfVisit()));
        report.setDurationOfVisit(normalizeText(request.getDurationOfVisit()));
        report.setLocation(normalizeText(request.getLocation()));
        report.setProgrammeName(normalizeText(request.getProgrammeName()));
        report.setTypeOfVisit(normalizeText(request.getTypeOfVisit()));
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

    private void createLinkedCaseNoteIfPresent(Client client, VisitReport report, User createdBy) {
        caseRepository.findFirstByClientIdOrderByOpenedAtDescIdDesc(client.getId())
                .ifPresent(clientCase -> {
                    CaseNote note = new CaseNote();
                    note.setClientCase(clientCase);
                    note.setNoteType("REPORT");
                    note.setVisibility("INTERNAL");
                    note.setCreatedBy(createdBy);
                    note.setContent(buildCaseNoteContent(report));
                    caseNoteRepository.save(note);
                });
    }

    private String buildCaseNoteContent(VisitReport report) {
        StringBuilder content = new StringBuilder("Report submitted");
        appendLine(content, "Programme", report.getProgrammeName());
        appendLine(content, "Visit type", report.getTypeOfVisit());
        appendLine(content, "Location", report.getLocation());
        appendLine(content, "Purpose", report.getPurposeOfVisit());
        appendLine(content, "What was done", report.getWhatWasDone());
        appendLine(content, "Observations", report.getSanghaObservations());
        appendLine(content, "Recommendations", report.getRecommendations());
        appendLine(content, "Matters to highlight", report.getMattersToHighlight());
        return content.toString();
    }

    private void appendLine(StringBuilder content, String label, String value) {
        if (value != null && !value.isBlank()) {
            content.append(System.lineSeparator()).append(label).append(": ").append(value);
        }
    }
}
