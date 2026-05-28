package aranya.crm.controller;

import aranya.crm.dto.request.CreateReportRequest;
import aranya.crm.dto.response.ReportDetailResponse;
import aranya.crm.dto.response.ReportSummaryResponse;
import aranya.crm.entity.User;
import aranya.crm.security.annotation.CurrentUser;
import aranya.crm.service.ReportService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/v1/reports")
@RequiredArgsConstructor
@PreAuthorize("isAuthenticated()")
public class ReportController {

    private final ReportService reportService;

    @GetMapping
    public ResponseEntity<List<ReportSummaryResponse>> listReports(
            @CurrentUser User currentUser,
            @RequestParam(defaultValue = "false") boolean mine
    ) {
        if (mine) {
            return ResponseEntity.ok(reportService.listOwnReports(currentUser));
        }
        return ResponseEntity.ok(reportService.listReports());
    }

    @GetMapping("/{id}")
    public ResponseEntity<ReportDetailResponse> getReportDetail(@PathVariable Long id) {
        return ResponseEntity.ok(reportService.getReportDetail(id));
    }

    @PostMapping
    public ResponseEntity<ReportDetailResponse> createReport(
            @CurrentUser User currentUser,
            @Valid @RequestBody CreateReportRequest request
    ) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(reportService.createReport(request, currentUser));
    }

    @PutMapping("/{id}")
    public ResponseEntity<ReportDetailResponse> updateReport(
            @CurrentUser User currentUser,
            @PathVariable Long id,
            @Valid @RequestBody CreateReportRequest request
    ) {
        return ResponseEntity.ok(reportService.updateReport(id, request, currentUser));
    }

    @PostMapping("/{id}/submit")
    public ResponseEntity<ReportDetailResponse> submitReport(
            @CurrentUser User currentUser,
            @PathVariable Long id
    ) {
        return ResponseEntity.ok(reportService.submitReport(id, currentUser));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteReport(
            @CurrentUser User currentUser,
            @PathVariable Long id
    ) {
        reportService.deleteReport(id, currentUser);
        return ResponseEntity.noContent().build();
    }
}
