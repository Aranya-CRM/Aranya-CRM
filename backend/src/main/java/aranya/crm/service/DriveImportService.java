package aranya.crm.service;

import aranya.crm.config.GoogleDriveProperties;
import aranya.crm.dto.request.DriveImportRequest;
import aranya.crm.dto.response.DriveEntryResponse;
import aranya.crm.dto.response.DriveImportResultResponse;
import aranya.crm.entity.User;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Map;

/**
 * Drive 迁移编排:浏览文件夹、批量导入(逐条独立事务,单条失败不影响其他)。
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class DriveImportService {

    private static final String GOOGLE_APPS_PREFIX = "application/vnd.google-apps.";
    private static final Map<String, String> EXPORT_LABEL = Map.of(
            "application/vnd.google-apps.spreadsheet", "XLSX",
            "application/vnd.google-apps.drawing", "PNG"
    );

    private final GoogleDriveService driveService;
    private final DriveDocumentImporter importer;
    private final GoogleDriveProperties driveProperties;

    public List<DriveEntryResponse> listFolder(String folderId) {
        String target = folderId == null || folderId.isBlank() ? driveProperties.getRootFolderId() : folderId.trim();
        return driveService.listFolder(target).stream()
                .map(this::toResponse)
                .toList();
    }

    public List<DriveImportResultResponse> importBatch(DriveImportRequest request, User actor) {
        return request.getItems().stream()
                .map((item) -> importOneSafely(item, actor))
                .toList();
    }

    private DriveImportResultResponse importOneSafely(DriveImportRequest.Item item, User actor) {
        try {
            return importer.importOne(item, actor);
        } catch (Exception e) {
            log.warn("Drive import failed for file {} -> case {}: {}",
                    item.getDriveFileId(), item.getCaseId(), e.getMessage());
            return DriveImportResultResponse.builder()
                    .driveFileId(item.getDriveFileId())
                    .status("FAILED")
                    .caseId(item.getCaseId())
                    .message(e.getMessage())
                    .build();
        }
    }

    private DriveEntryResponse toResponse(GoogleDriveService.DriveEntry entry) {
        String exportAs = null;
        if (!entry.folder() && entry.mimeType() != null && entry.mimeType().startsWith(GOOGLE_APPS_PREFIX)) {
            exportAs = EXPORT_LABEL.getOrDefault(entry.mimeType(), "PDF");
        }
        return DriveEntryResponse.builder()
                .id(entry.id())
                .name(entry.name())
                .mimeType(entry.mimeType())
                .size(entry.size())
                .modifiedTime(entry.modifiedTime())
                .folder(entry.folder())
                .exportAs(exportAs)
                .build();
    }
}
