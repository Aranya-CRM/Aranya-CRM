package aranya.crm.service;

import aranya.crm.config.FileStorageProperties;
import aranya.crm.entity.DocumentCategory;
import com.google.cloud.storage.BlobId;
import com.google.cloud.storage.BlobInfo;
import com.google.cloud.storage.Storage;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.net.URL;
import java.time.Duration;
import java.util.Map;
import java.util.concurrent.TimeUnit;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class GcsFileStorageServiceTest {

    @Mock
    private Storage storage;

    @Test
    @DisplayName("storeCaseDocument writes bytes under readable case/category object key")
    void storeCaseDocument_writesBytesUnderReadableCaseCategoryObjectKey() {
        GcsFileStorageService service = new GcsFileStorageService(storage, properties());

        GcsFileStorageService.StoredFile stored = service.storeCaseDocument(
                "ASDFL/2026/C/006",
                DocumentCategory.ORDINATION,
                99L,
                "  Ordination Certificate 2026.pdf  ",
                "application/pdf",
                "pdf-bytes".getBytes()
        );

        ArgumentCaptor<BlobInfo> blobInfo = ArgumentCaptor.forClass(BlobInfo.class);
        ArgumentCaptor<byte[]> bytes = ArgumentCaptor.forClass(byte[].class);
        org.mockito.Mockito.verify(storage).create(blobInfo.capture(), bytes.capture());

        assertThat(stored.bucketName()).isEqualTo("aranya-case-files-dev");
        assertThat(stored.objectKey())
                .startsWith("cases/ASDFL-2026-C-006/Ordination Certificate/")
                .endsWith("-99-Ordination_Certificate_2026.pdf");
        assertThat(blobInfo.getValue().getBucket()).isEqualTo("aranya-case-files-dev");
        assertThat(blobInfo.getValue().getName()).isEqualTo(stored.objectKey());
        assertThat(blobInfo.getValue().getContentType()).isEqualTo("application/pdf");
        assertThat(bytes.getValue()).isEqualTo("pdf-bytes".getBytes());
    }

    @Test
    @DisplayName("createReadUrl signs GCS object URL with configured TTL")
    void createReadUrl_signsGcsObjectUrlWithConfiguredTtl() throws Exception {
        FileStorageProperties properties = properties();
        GcsFileStorageService service = new GcsFileStorageService(storage, properties);
        URL signed = new URL("https://storage.googleapis.com/signed/document.pdf");
        when(storage.signUrl(
                any(BlobInfo.class),
                eq(10L),
                eq(TimeUnit.MINUTES),
                any(Storage.SignUrlOption[].class)))
                .thenReturn(signed);

        java.net.URI uri = service.createReadUrl("cases/7/documents/99/file.pdf", "application/pdf", "Medical Report.pdf");

        assertThat(uri).isEqualTo(signed.toURI());
        ArgumentCaptor<BlobInfo> blobInfo = ArgumentCaptor.forClass(BlobInfo.class);
        verify(storage).signUrl(
                blobInfo.capture(),
                eq(10L),
                eq(TimeUnit.MINUTES),
                any(Storage.SignUrlOption[].class));
        assertThat(blobInfo.getValue().getBucket()).isEqualTo("aranya-case-files-dev");
        assertThat(blobInfo.getValue().getName()).isEqualTo("cases/7/documents/99/file.pdf");
        assertThat(blobInfo.getValue().getContentType()).isNull();
    }

    @Test
    @DisplayName("downloadQueryParams force browser download with original file name")
    void downloadQueryParams_forceBrowserDownloadWithOriginalFileName() {
        Map<String, String> params = GcsFileStorageService.downloadQueryParams(
                "application/pdf",
                "医疗 Report.pdf"
        );

        assertThat(params.get("response-content-type")).isEqualTo("application/pdf");
        assertThat(params.get("response-content-disposition"))
                .startsWith("attachment; filename=\"")
                .contains("Report.pdf")
                .contains("filename*=UTF-8''%E5%8C%BB%E7%96%97%20Report.pdf");
    }

    @Test
    @DisplayName("signedUrlQueryParams keep preview URLs inline")
    void signedUrlQueryParams_keepPreviewUrlsInline() {
        Map<String, String> params = GcsFileStorageService.signedUrlQueryParams(
                "image/png",
                "Client Photo.png",
                false
        );

        assertThat(params.get("response-content-type")).isEqualTo("image/png");
        assertThat(params.get("response-content-disposition"))
                .startsWith("inline; filename=\"Client Photo.png\"");
    }

    @Test
    @DisplayName("deleteObject deletes GCS object from configured bucket")
    void deleteObject_deletesGcsObjectFromConfiguredBucket() {
        GcsFileStorageService service = new GcsFileStorageService(storage, properties());

        service.deleteObject("cases/7/documents/99/file.pdf");

        verify(storage).delete(BlobId.of("aranya-case-files-dev", "cases/7/documents/99/file.pdf"));
    }

    private static FileStorageProperties properties() {
        FileStorageProperties properties = new FileStorageProperties();
        properties.setMaxUploadSizeMb(25);
        properties.getGcs().setBucketName("aranya-case-files-dev");
        properties.getGcs().setSignedUrlTtlMinutes((int) Duration.ofMinutes(10).toMinutes());
        return properties;
    }
}
