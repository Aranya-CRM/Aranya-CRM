package aranya.crm.service;

import aranya.crm.config.FileStorageProperties;
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
import java.util.concurrent.TimeUnit;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class GcsFileStorageServiceTest {

    @Mock
    private Storage storage;

    @Test
    @DisplayName("storeCaseDocument writes bytes under case/document object key")
    void storeCaseDocument_writesBytesUnderCaseDocumentObjectKey() {
        GcsFileStorageService service = new GcsFileStorageService(storage, properties());

        GcsFileStorageService.StoredFile stored = service.storeCaseDocument(
                7L,
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
                .startsWith("cases/7/documents/99/")
                .endsWith("-Ordination_Certificate_2026.pdf");
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
        when(storage.signUrl(any(BlobInfo.class), eq(10L), eq(TimeUnit.MINUTES), any(Storage.SignUrlOption.class)))
                .thenReturn(signed);

        java.net.URI uri = service.createReadUrl("cases/7/documents/99/file.pdf", "application/pdf");

        assertThat(uri).isEqualTo(signed.toURI());
    }

    private static FileStorageProperties properties() {
        FileStorageProperties properties = new FileStorageProperties();
        properties.setMaxUploadSizeMb(25);
        properties.getGcs().setBucketName("aranya-case-files-dev");
        properties.getGcs().setSignedUrlTtlMinutes((int) Duration.ofMinutes(10).toMinutes());
        return properties;
    }
}
