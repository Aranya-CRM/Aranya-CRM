package aranya.crm.service;

import aranya.crm.entity.CaseAssignment;
import aranya.crm.dto.response.DashboardResponse;
import aranya.crm.entity.Client;
import aranya.crm.entity.ClientCase;
import aranya.crm.entity.User;
import aranya.crm.entity.VisitReport;
import aranya.crm.repository.ClientRepository;
import aranya.crm.repository.CaseAssignmentRepository;
import aranya.crm.repository.VisitReportRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class DashboardService {

    private static final int DASHBOARD_LIST_LIMIT = 5;
    private static final String ACTIVE_MEMBERSHIP_STATUS = "ACTIVE";

    private final ClientRepository clientRepository;
    private final CaseService caseService;
    private final VisitReportRepository visitReportRepository;
    private final CaseAssignmentRepository caseAssignmentRepository;

    public DashboardResponse getDashboard(Authentication authentication) {
        User currentUser = authentication != null && authentication.getPrincipal() instanceof User user
                ? user
                : null;
        Set<String> roles = roleNames(authentication);

        List<DashboardResponse.Section> sections = new ArrayList<>();
        if (roles.contains("VOLUNTEER") && currentUser != null) {
            sections.add(volunteerReportStats(currentUser.getId()));
            sections.add(volunteerRecentTasks(currentUser.getId()));
            sections.add(volunteerRecentReports(currentUser.getId()));
            sections.add(volunteerQuickActions());
        }
        if (roles.contains("MANAGER")) {
            sections.add(managerStats());
            sections.add(managerRecentCases());
            sections.add(managerRecentReports());
            sections.add(managerQuickActions());
        }
        if (roles.contains("SOCIAL_WORKER") && currentUser != null) {
            sections.add(swOwnStats(currentUser.getId()));
            sections.add(swRecentCases(currentUser.getId()));
            sections.add(swRecentReports(currentUser.getId()));
            sections.add(swQuickActions());
        }

        return DashboardResponse.builder()
                .designSystem(DashboardResponse.DesignSystem.builder()
                        .name("aranya-crm-dashboard")
                        .version("1.0")
                        .build())
                .screen(DashboardResponse.Screen.builder()
                        .id("dashboard")
                        .version("2026-05-13")
                        .build())
                .sections(sections)
                .metadata(DashboardResponse.Metadata.now())
                .build();
    }

    private DashboardResponse.Section volunteerReportStats(Long currentUserId) {
        return DashboardResponse.Section.builder()
                .id("volunteer.report_stats")
                .stats(List.of(
                        stat("myReportCount", visitReportRepository.countByCreatedById(currentUserId)),
                        stat("assignedTaskCount", caseAssignmentRepository.countVolunteerAssignments(currentUserId))
                ))
                .build();
    }

    private DashboardResponse.Section volunteerRecentReports(Long currentUserId) {
        List<DashboardResponse.Item> items = visitReportRepository
                .findByCreatedByIdOrderByCreatedAtDescIdDesc(currentUserId, PageRequest.of(0, DASHBOARD_LIST_LIMIT))
                .stream()
                .map(this::toReportItem)
                .toList();

        return DashboardResponse.Section.builder()
                .id("volunteer.my_recent_reports")
                .items(items)
                .build();
    }

    private DashboardResponse.Section volunteerRecentTasks(Long currentUserId) {
        List<DashboardResponse.Item> items = caseAssignmentRepository
                .findVolunteerAssignments(currentUserId, PageRequest.of(0, DASHBOARD_LIST_LIMIT))
                .stream()
                .map(CaseAssignment::getClientCase)
                .map(this::toCaseItem)
                .toList();

        return DashboardResponse.Section.builder()
                .id("volunteer.recent_tasks")
                .items(items)
                .build();
    }

    private DashboardResponse.Section volunteerQuickActions() {
        return DashboardResponse.Section.builder()
                .id("volunteer.quick_actions")
                .actions(List.of(action("view_tasks"), action("submit_report")))
                .build();
    }

    private DashboardResponse.Section managerStats() {
        return DashboardResponse.Section.builder()
                .id("sw.stats")
                .stats(List.of(
                        stat("activeMonastics", clientRepository.countByMembershipStatusIgnoreCase(ACTIVE_MEMBERSHIP_STATUS)),
                        stat("openCases", caseService.countActiveCases()),
                        stat("urgentCases", caseService.countUrgentCases()),
                        // 待处理报告 = 已提交待审批(SUBMITTED),而非全部报告
                        stat("pendingReports", visitReportRepository.countByStatusIgnoreCase("SUBMITTED"))
                ))
                .build();
    }

    private DashboardResponse.Section managerRecentCases() {
        List<DashboardResponse.Item> items = caseService.getActiveCases(DASHBOARD_LIST_LIMIT)
                .stream()
                .map(this::toCaseItem)
                .toList();

        return DashboardResponse.Section.builder()
                .id("sw.recent_cases")
                .items(items)
                .build();
    }

    private DashboardResponse.Section managerRecentReports() {
        List<DashboardResponse.Item> items = visitReportRepository
                .findAllByOrderByCreatedAtDescIdDesc(PageRequest.of(0, DASHBOARD_LIST_LIMIT))
                .stream()
                .map(this::toReportItem)
                .toList();

        return DashboardResponse.Section.builder()
                .id("sw.recent_reports")
                .items(items)
                .build();
    }

    private DashboardResponse.Section managerQuickActions() {
        return DashboardResponse.Section.builder()
                .id("sw.quick_actions")
                .actions(List.of(action("new_case"), action("add_client"), action("submit_report")))
                .build();
    }

    private DashboardResponse.Section swOwnStats(Long userId) {
        return DashboardResponse.Section.builder()
                .id("sw.stats")
                .stats(List.of(
                        stat("myAssignedClients", caseService.countDistinctActiveClientsByCreatedBy(userId)),
                        stat("myOpenCases", caseService.countActiveCasesByCreatedBy(userId)),
                        stat("myUrgentCases", caseService.countUrgentCasesByCreatedBy(userId)),
                        stat("myDraftReports", visitReportRepository.countByCreatedByIdAndStatusIgnoreCase(userId, "DRAFT"))
                ))
                .build();
    }

    private DashboardResponse.Section swRecentCases(Long userId) {
        List<DashboardResponse.Item> items = caseService.getActiveCasesByCreatedBy(userId, DASHBOARD_LIST_LIMIT)
                .stream()
                .map(this::toCaseItem)
                .toList();

        return DashboardResponse.Section.builder()
                .id("sw.recent_cases")
                .items(items)
                .build();
    }

    private DashboardResponse.Section swRecentReports(Long userId) {
        List<DashboardResponse.Item> items = visitReportRepository
                .findByCreatedByIdOrderByCreatedAtDescIdDesc(userId, PageRequest.of(0, DASHBOARD_LIST_LIMIT))
                .stream()
                .map(this::toReportItem)
                .toList();

        return DashboardResponse.Section.builder()
                .id("sw.recent_reports")
                .items(items)
                .build();
    }

    private DashboardResponse.Section swQuickActions() {
        return DashboardResponse.Section.builder()
                .id("sw.quick_actions")
                .actions(List.of(action("new_case"), action("add_client"), action("submit_report")))
                .build();
    }

    private DashboardResponse.Item toCaseItem(ClientCase clientCase) {
        Client client = clientCase.getClient();
        return DashboardResponse.Item.builder()
                .id(String.valueOf(clientCase.getId()))
                .clientId(client != null ? String.valueOf(client.getId()) : null)
                .clientAbbr(client != null ? client.getAbbr() : null)
                .clientNameChn(client != null ? client.getNameChn() : null)
                .clientNameEn(client != null ? client.getNameEn() : null)
                .caseCode(clientCase.getCaseCode())
                .statusCode(clientCase.getStatus())
                .colorCode(clientCase.getColorCode())
                .openedAt(clientCase.getOpenedAt() != null ? clientCase.getOpenedAt().toString() : null)
                .location(resolveClientVenue(client))
                .programmeName(clientCase.getTitle())
                .build();
    }

    private DashboardResponse.Item toReportItem(VisitReport report) {
        Client client = report.getClient();
        User createdBy = report.getCreatedBy();
        return DashboardResponse.Item.builder()
                .id(String.valueOf(report.getId()))
                .clientId(client != null ? String.valueOf(client.getId()) : null)
                .clientAbbr(client != null ? client.getAbbr() : null)
                .clientNameChn(client != null ? client.getNameChn() : null)
                .clientNameEn(client != null ? client.getNameEn() : null)
                .caseCode(findReportCaseCode(client))
                .reportType(report.getTypeOfVisit())
                .dateOfVisit(report.getDateOfVisit() != null ? report.getDateOfVisit().toString() : null)
                .location(report.getLocation())
                .programmeName(report.getProgrammeName())
                .createdAt(report.getCreatedAt() != null ? report.getCreatedAt().toString() : null)
                .createdById(createdBy != null ? String.valueOf(createdBy.getId()) : null)
                .createdByName(createdBy != null ? createdBy.getFullName() : null)
                .statusCode(report.getStatus())
                .build();
    }

    private String resolveClientVenue(Client client) {
        if (client == null) {
            return null;
        }
        if (client.getViharaType() != null && !client.getViharaType().isBlank()) {
            return client.getViharaType();
        }
        return client.getAreaDistrict();
    }

    private String findReportCaseCode(Client client) {
        if (client == null || client.getId() == null) {
            return null;
        }
        return caseService.findLatestCaseCodeForClient(client.getId());
    }

    private DashboardResponse.Stat stat(String id, long value) {
        return DashboardResponse.Stat.builder()
                .id(id)
                .value(String.valueOf(value))
                .build();
    }

    private DashboardResponse.Action action(String id) {
        return DashboardResponse.Action.builder()
                .id(id)
                .build();
    }

    private Set<String> roleNames(Authentication authentication) {
        if (authentication == null) {
            return Set.of();
        }
        return authentication.getAuthorities().stream()
                .map(GrantedAuthority::getAuthority)
                .filter(authority -> authority.startsWith("ROLE_"))
                .map(authority -> authority.substring("ROLE_".length()))
                .collect(Collectors.toSet());
    }
}
