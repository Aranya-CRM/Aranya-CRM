package aranya.crm.controller;

import aranya.crm.common.dto.ApiErrorResponse;
import aranya.crm.dto.request.DriveImportRequest;
import aranya.crm.dto.response.DriveEntryResponse;
import aranya.crm.dto.response.DriveImportResultResponse;
import aranya.crm.entity.User;
import aranya.crm.security.annotation.CurrentUser;
import aranya.crm.service.DriveImportService;
import aranya.crm.service.GoogleDriveService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

/** 组织 Google Drive 历史文件一次性迁移(仅 Manager)。 */
@RestController
@RequestMapping("/api/v1/admin/drive")
@RequiredArgsConstructor
@PreAuthorize("@capEval.hasCap(authentication, 'cases:documents.import')")
public class DriveMigrationController {

    private final DriveImportService driveImportService;

    @GetMapping("/files")
    public ResponseEntity<List<DriveEntryResponse>> listFiles(
            @RequestParam(name = "folderId", required = false) String folderId
    ) {
        return ResponseEntity.ok(driveImportService.listFolder(folderId));
    }

    @PostMapping("/import")
    public ResponseEntity<List<DriveImportResultResponse>> importFiles(
            @Valid @RequestBody DriveImportRequest request,
            @CurrentUser User currentUser
    ) {
        return ResponseEntity.ok(driveImportService.importBatch(request, currentUser));
    }

    @ExceptionHandler(GoogleDriveService.DriveNotConfiguredException.class)
    public ResponseEntity<ApiErrorResponse> handleDriveUnavailable(HttpServletRequest request) {
        return ResponseEntity.status(HttpStatus.SERVICE_UNAVAILABLE)
                .body(ApiErrorResponse.of(
                        "DRIVE_IMPORT_UNAVAILABLE",
                        "Google Drive import is not configured.",
                        request.getRequestURI()
                ));
    }
}
