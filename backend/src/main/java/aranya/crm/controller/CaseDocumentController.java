package aranya.crm.controller;

import aranya.crm.common.dto.ApiErrorResponse;
import aranya.crm.dto.response.CaseDocumentResponse;
import aranya.crm.dto.response.DocumentDownloadResponse;
import aranya.crm.entity.DocumentCategory;
import aranya.crm.entity.User;
import aranya.crm.security.CapPermissionEvaluator;
import aranya.crm.security.annotation.CurrentUser;
import aranya.crm.service.CaseDocumentService;
import aranya.crm.service.GcsFileStorageService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import java.util.EnumSet;
import java.util.List;
import java.util.Locale;
import java.util.Set;

@RestController
@RequestMapping("/api/v1/cases/{caseId}/documents")
@RequiredArgsConstructor
@PreAuthorize("@capEval.hasCap(authentication, 'cases:view')")
public class CaseDocumentController {

    private final CaseDocumentService caseDocumentService;
    private final CapPermissionEvaluator capEval;

    @GetMapping
    public ResponseEntity<List<CaseDocumentResponse>> listCaseDocuments(
            @PathVariable Long caseId,
            @CurrentUser User currentUser
    ) {
        return ResponseEntity.ok(caseDocumentService.listCaseDocuments(caseId, viewableCategories(currentUser)));
    }

    @PostMapping
    @PreAuthorize("@capEval.hasCap(authentication, 'cases:view') and @capEval.hasCap(authentication, 'cases:documents.upload')")
    public ResponseEntity<CaseDocumentResponse> uploadCaseDocument(
            @PathVariable Long caseId,
            @RequestParam("category") DocumentCategory category,
            @RequestParam("file") MultipartFile file,
            @RequestParam(name = "displayName", required = false) String displayName,
            @CurrentUser User currentUser
    ) {
        return ResponseEntity.ok(caseDocumentService.uploadCaseDocument(caseId, category, file, displayName, currentUser));
    }

    @GetMapping("/{documentId}/download-url")
    public ResponseEntity<DocumentDownloadResponse> createDownloadUrl(
            @PathVariable Long caseId,
            @PathVariable Long documentId,
            @RequestParam(name = "disposition", defaultValue = "attachment") String disposition,
            @CurrentUser User currentUser
    ) {
        boolean forceDownload = !"inline".equalsIgnoreCase(disposition);
        return ResponseEntity.ok(caseDocumentService.createDownloadUrl(caseId, documentId, forceDownload, viewableCategories(currentUser)));
    }

    @DeleteMapping("/{documentId}")
    @PreAuthorize("@capEval.hasCap(authentication, 'cases:view') and @capEval.hasCap(authentication, 'cases:documents.delete')")
    public ResponseEntity<Void> deleteCaseDocument(
            @PathVariable Long caseId,
            @PathVariable Long documentId
    ) {
        caseDocumentService.deleteCaseDocument(caseId, documentId);
        return ResponseEntity.noContent().build();
    }

    /** 计算调用者可查看的文档类别集合(cases:documents.view.&lt;category&gt;,含 role_cap ∪ user_cap)。 */
    private Set<DocumentCategory> viewableCategories(User user) {
        Set<DocumentCategory> viewable = EnumSet.noneOf(DocumentCategory.class);
        for (DocumentCategory category : DocumentCategory.values()) {
            if (capEval.hasCap(user, "cases:documents.view." + category.name().toLowerCase(Locale.ROOT))) {
                viewable.add(category);
            }
        }
        return viewable;
    }

    @ExceptionHandler(GcsFileStorageService.StorageNotConfiguredException.class)
    public ResponseEntity<ApiErrorResponse> handleStorageUnavailable(GcsFileStorageService.StorageNotConfiguredException ex, jakarta.servlet.http.HttpServletRequest request) {
        return ResponseEntity.status(HttpStatus.SERVICE_UNAVAILABLE)
                .body(ApiErrorResponse.of(
                        "FILE_STORAGE_UNAVAILABLE",
                        "File storage is not configured.",
                        request.getRequestURI()
                ));
    }
}
