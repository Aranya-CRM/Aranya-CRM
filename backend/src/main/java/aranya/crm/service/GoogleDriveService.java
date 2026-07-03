package aranya.crm.service;

import com.google.api.services.drive.Drive;
import com.google.api.services.drive.model.File;
import com.google.api.services.drive.model.FileList;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.stereotype.Service;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;

/**
 * 读取组织 Google Drive(以 infotech 身份),供一次性历史文件迁移用。
 * 未配置/凭证缺失/调用失败时安全降级(抛 DriveNotConfiguredException 或 IOException)。
 */
@Slf4j
@Service
public class GoogleDriveService {

    static final String FOLDER_MIME = "application/vnd.google-apps.folder";
    private static final String GOOGLE_APPS_PREFIX = "application/vnd.google-apps.";

    /** Google 原生文档导出映射:目标 mimeType + 扩展名。默认导出 PDF。 */
    private static final Map<String, ExportTarget> EXPORT_TARGETS = Map.of(
            "application/vnd.google-apps.document",
            new ExportTarget("application/pdf", ".pdf"),
            "application/vnd.google-apps.spreadsheet",
            new ExportTarget("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", ".xlsx"),
            "application/vnd.google-apps.presentation",
            new ExportTarget("application/pdf", ".pdf"),
            "application/vnd.google-apps.drawing",
            new ExportTarget("image/png", ".png")
    );
    private static final ExportTarget DEFAULT_EXPORT = new ExportTarget("application/pdf", ".pdf");

    private final ObjectProvider<Drive> driveProvider;

    public GoogleDriveService(ObjectProvider<Drive> driveProvider) {
        this.driveProvider = driveProvider;
    }

    private Drive client() {
        Drive drive = driveProvider.getIfAvailable();
        if (drive == null) {
            throw new DriveNotConfiguredException("Google Drive integration is not configured");
        }
        return drive;
    }

    /** 列出某文件夹下的文件与子文件夹(文件夹在前),循环 pageToken 拉全。 */
    public List<DriveEntry> listFolder(String folderId) {
        Drive drive = client();
        String query = "'" + folderId.replace("'", "\\'") + "' in parents and trashed = false";
        List<DriveEntry> entries = new ArrayList<>();
        String pageToken = null;
        try {
            do {
                FileList result = drive.files().list()
                        .setQ(query)
                        .setFields("nextPageToken, files(id, name, mimeType, size, modifiedTime)")
                        .setPageSize(1000)
                        .setSupportsAllDrives(true)
                        .setIncludeItemsFromAllDrives(true)
                        .setPageToken(pageToken)
                        .execute();
                for (File file : result.getFiles()) {
                    entries.add(toEntry(file));
                }
                pageToken = result.getNextPageToken();
            } while (pageToken != null);
        } catch (IOException e) {
            throw new DriveAccessException("Failed to list Google Drive folder " + folderId, e);
        }
        entries.sort((a, b) -> {
            if (a.folder() != b.folder()) {
                return a.folder() ? -1 : 1;
            }
            return a.name().compareToIgnoreCase(b.name());
        });
        return entries;
    }

    /** 下载文件内容;Google 原生文档按映射导出为 PDF/xlsx 等,并补正扩展名。 */
    public DriveDownload download(String fileId) {
        Drive drive = client();
        try {
            File meta = drive.files().get(fileId)
                    .setFields("id, name, mimeType")
                    .setSupportsAllDrives(true)
                    .execute();
            String mimeType = meta.getMimeType();
            String name = meta.getName() != null ? meta.getName() : "file";
            ByteArrayOutputStream out = new ByteArrayOutputStream();

            if (mimeType != null && mimeType.startsWith(GOOGLE_APPS_PREFIX)) {
                ExportTarget target = EXPORT_TARGETS.getOrDefault(mimeType, DEFAULT_EXPORT);
                drive.files().export(fileId, target.mimeType()).executeMediaAndDownloadTo(out);
                return new DriveDownload(out.toByteArray(), target.mimeType(), ensureExtension(name, target.extension()));
            }

            drive.files().get(fileId).setSupportsAllDrives(true).executeMediaAndDownloadTo(out);
            String resolvedMime = mimeType != null ? mimeType : "application/octet-stream";
            return new DriveDownload(out.toByteArray(), resolvedMime, name);
        } catch (IOException e) {
            throw new DriveAccessException("Failed to download Google Drive file " + fileId, e);
        }
    }

    private DriveEntry toEntry(File file) {
        boolean folder = FOLDER_MIME.equals(file.getMimeType());
        Long size = file.getSize();
        String modified = file.getModifiedTime() != null ? file.getModifiedTime().toStringRfc3339() : null;
        return new DriveEntry(file.getId(), file.getName(), file.getMimeType(), size, modified, folder);
    }

    private String ensureExtension(String name, String extension) {
        if (name.toLowerCase().endsWith(extension)) {
            return name;
        }
        return name + extension;
    }

    public record DriveEntry(String id, String name, String mimeType, Long size, String modifiedTime, boolean folder) {
    }

    public record DriveDownload(byte[] bytes, String mimeType, String fileName) {
    }

    private record ExportTarget(String mimeType, String extension) {
    }

    public static class DriveNotConfiguredException extends IllegalStateException {
        public DriveNotConfiguredException(String message) {
            super(message);
        }
    }

    public static class DriveAccessException extends RuntimeException {
        public DriveAccessException(String message, Throwable cause) {
            super(message, cause);
        }
    }
}
