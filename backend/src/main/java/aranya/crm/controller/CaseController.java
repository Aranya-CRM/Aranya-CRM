package aranya.crm.controller;

import aranya.crm.dto.response.CaseDetailResponse;
import aranya.crm.dto.response.CaseSummaryResponse;
import aranya.crm.service.CaseService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/v1/cases")
@RequiredArgsConstructor
@PreAuthorize("isAuthenticated()")
public class CaseController {

    private final CaseService caseService;

    @GetMapping
    public ResponseEntity<List<CaseSummaryResponse>> listCases(
            @RequestParam(required = false) String q,
            @RequestParam(required = false) String status
    ) {
        return ResponseEntity.ok(caseService.listCases(q, status));
    }

    @GetMapping("/{id}")
    public ResponseEntity<CaseDetailResponse> getCaseDetail(@PathVariable Long id) {
        return ResponseEntity.ok(caseService.getCaseDetail(id));
    }
}
