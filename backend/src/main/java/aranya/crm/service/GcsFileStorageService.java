package aranya.crm.service;

import aranya.crm.config.FileStorageProperties;
import com.google.cloud.storage.BlobId;
import com.google.cloud.storage.BlobInfo;
import com.google.cloud.storage.Storage;
import org.springframework.context.annotation.Lazy;
import org.springframework.stereotype.Service;

import java.net.URI;
import java.net.URISyntaxException;
import java.net.URLEncoder;
import java.net.URL;
import java.nio.charset.StandardCharsets;
import java.util.Locale;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.TimeUnit;

@Service
public class GcsFileStorageService {

    private final Storage storage;
    private final FileStorageProperties properties;

    public GcsFileStorageService(@Lazy Storage storage, FileStorageProperties properties) {
        this.storage = storage;
        this.properties = properties;
    }

    public StoredFile storeCaseDocument(
            Long caseId,
            Long documentId,
            String originalFileName,
            String contentType,
            byte[] bytes
    ) {
        String bucketName = requireBucketName();
        String objectKey = objectKey(caseId, documentId, originalFileName);
        String resolvedContentType = normalizeContentType(contentType);
        BlobInfo blobInfo = BlobInfo.newBuilder(BlobId.of(bucketName, objectKey))
                .setContentType(resolvedContentType)
                .build();
        storage.create(blobInfo, bytes);
        return new StoredFile(bucketName, objectKey, resolvedContentType, bytes.length);
    }

    public URI createReadUrl(String objectKey, String contentType, String fileName) {
        return createReadUrl(objectKey, contentType, fileName, true);
    }

    public URI createReadUrl(String objectKey, String contentType, String fileName, boolean forceDownload) {
        String bucketName = requireBucketName();
        BlobInfo blobInfo = BlobInfo.newBuilder(BlobId.of(bucketName, objectKey)).build();
        URL url = storage.signUrl(
                blobInfo,
                properties.getGcs().getSignedUrlTtl().toMinutes(),
                TimeUnit.MINUTES,
                Storage.SignUrlOption.withQueryParams(signedUrlQueryParams(contentType, fileName, forceDownload)),
                Storage.SignUrlOption.withV4Signature()
        );
        try {
            return url.toURI();
        } catch (URISyntaxException e) {
            throw new IllegalStateException("Generated signed URL is invalid", e);
        }
    }

    public record StoredFile(
            String bucketName,
            String objectKey,
            String contentType,
            long size
    ) {
    }

    public void deleteObject(String objectKey) {
        storage.delete(BlobId.of(requireBucketName(), objectKey));
    }

    static Map<String, String> downloadQueryParams(String contentType, String fileName) {
        return signedUrlQueryParams(contentType, fileName, true);
    }

    static Map<String, String> signedUrlQueryParams(String contentType, String fileName, boolean forceDownload) {
        String resolvedFileName = fileName == null || fileName.isBlank() ? "file" : fileName.trim();
        String encodedFileName = URLEncoder.encode(resolvedFileName, StandardCharsets.UTF_8)
                .replace("+", "%20");
        return Map.of(
                "response-content-type", normalizeDownloadContentType(contentType),
                "response-content-disposition",
                contentDisposition(forceDownload, resolvedFileName, encodedFileName)
        );
    }

    private String objectKey(Long caseId, Long documentId, String originalFileName) {
        return "cases/%d/documents/%d/%s-%s".formatted(
                caseId,
                documentId,
                UUID.randomUUID(),
                safeFileName(originalFileName)
        );
    }

    private String safeFileName(String originalFileName) {
        String name = originalFileName == null || originalFileName.isBlank() ? "file" : originalFileName.trim();
        String normalized = name.replaceAll("\\s+", "_")
                .replaceAll("[^A-Za-z0-9._-]", "_")
                .replaceAll("_+", "_");
        return normalized.isBlank() ? "file" : normalized;
    }

    private String normalizeContentType(String contentType) {
        return normalizeDownloadContentType(contentType);
    }

    private static String normalizeDownloadContentType(String contentType) {
        if (contentType == null || contentType.isBlank()) {
            return "application/octet-stream";
        }
        return contentType.trim().toLowerCase(Locale.ROOT);
    }

    private static String safeDownloadFileName(String fileName) {
        String normalized = fileName
                .replaceAll("[\\\\/\\r\\n\"]", "_")
                .replaceAll("[^\\x20-\\x7E]", "_")
                .replaceAll("_+", "_")
                .replaceAll("^[_ .-]+(?=.)", "");
        return normalized.isBlank() ? "file" : normalized;
    }

    private static String contentDisposition(boolean forceDownload, String fileName, String encodedFileName) {
        String disposition = forceDownload ? "attachment" : "inline";
        return disposition + "; filename=\"" + safeDownloadFileName(fileName) + "\"; filename*=UTF-8''" + encodedFileName;
    }

    private String requireBucketName() {
        String bucketName = properties.getGcs().getBucketName();
        if (bucketName == null || bucketName.isBlank()) {
            throw new StorageNotConfiguredException("GCS bucket name is not configured");
        }
        return bucketName.trim();
    }

    public static class StorageNotConfiguredException extends IllegalStateException {
        public StorageNotConfiguredException(String message) {
            super(message);
        }
    }
}
