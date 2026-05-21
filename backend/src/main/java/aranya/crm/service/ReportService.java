package aranya.crm.service;

import aranya.crm.dto.request.CreateReportRequest;
import aranya.crm.dto.response.ReportDetailResponse;
import aranya.crm.dto.response.ReportSummaryResponse;
import aranya.crm.entity.Client;
import aranya.crm.entity.User;
import aranya.crm.entity.VisitReport;
import aranya.crm.repository.ClientRepository;
import aranya.crm.repository.VisitReportRepository;
import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
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

    public List<ReportSummaryResponse> listReports() {
        return visitReportRepository.findAllByOrderByCreatedAtDescIdDesc().stream()
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
        report.setClient(client);
        report.setCreatedBy(createdBy);
        report.setStaffName(normalizeText(request.getStaffName()) != null
                ? normalizeText(request.getStaffName())
                : createdBy != null ? createdBy.getFullName() : null);
        report.setReportTimestamp(LocalDateTime.now());
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

        return toReportDetailResponse(visitReportRepository.save(report));
    }

    @Transactional
    public void deleteReport(Long reportId) {
        VisitReport report = visitReportRepository.findById(reportId)
                .orElseThrow(() -> new EntityNotFoundException("Report not found: " + reportId));

        visitReportRepository.delete(report);
    }

    private ReportSummaryResponse toReportSummaryResponse(VisitReport report) {
        Client client = report.getClient();
        User createdBy = report.getCreatedBy();

        return ReportSummaryResponse.builder()
                .id(report.getId())
                .clientId(client != null ? client.getId() : null)
                .clientNameEn(client != null ? client.getNameEn() : null)
                .clientNameChn(client != null ? client.getNameChn() : null)
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
                .createdAt(report.getCreatedAt())
                .build();
    }

    private ReportDetailResponse toReportDetailResponse(VisitReport report) {
        Client client = report.getClient();
        User createdBy = report.getCreatedBy();

        return ReportDetailResponse.builder()
                .id(report.getId())
                .clientId(client != null ? client.getId() : null)
                .clientNameEn(client != null ? client.getNameEn() : null)
                .clientNameChn(client != null ? client.getNameChn() : null)
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
}
