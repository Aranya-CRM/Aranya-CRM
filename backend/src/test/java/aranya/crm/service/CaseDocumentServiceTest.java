package aranya.crm.service;

import aranya.crm.dto.response.CaseDocumentResponse;
import aranya.crm.dto.response.DocumentDownloadResponse;
import aranya.crm.config.FileStorageProperties;
import aranya.crm.entity.CaseDocument;
import aranya.crm.entity.Client;
import aranya.crm.entity.ClientCase;
import aranya.crm.entity.Document;
import aranya.crm.entity.DocumentCategory;
import aranya.crm.entity.User;
import aranya.crm.repository.CaseDocumentRepository;
import aranya.crm.repository.CaseRepository;
import aranya.crm.repository.DocumentRepository;
import jakarta.persistence.EntityNotFoundException;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.mock.web.MockMultipartFile;

import java.net.URI;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.aryEq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class CaseDocumentServiceTest {

    @Mock
    private CaseRepository caseRepository;

    @Mock
    private DocumentRepository documentRepository;

    @Mock
    private CaseDocumentRepository caseDocumentRepository;

    @Mock
    private GcsFileStorageService fileStorageService;

    @Test
    @DisplayName("listCaseDocuments maps active case documents")
    void listCaseDocuments_mapsActiveCaseDocuments() {
        ClientCase clientCase = clientCase(7L, "OPEN");
        CaseDocument caseDocument = caseDocument(55L, clientCase, document(99L), DocumentCategory.MEDICAL, "ACTIVE");
        when(caseRepository.findById(7L)).thenReturn(Optional.of(clientCase));
        when(caseDocumentRepository.findByClientCase_IdAndStatusOrderByCategoryAscLinkedAtDescIdDesc(7L, "ACTIVE"))
                .thenReturn(List.of(caseDocument));

        CaseDocumentService service = service();
        List<CaseDocumentResponse> response = service.listCaseDocuments(7L);

        assertThat(response).hasSize(1);
        assertThat(response.get(0).getId()).isEqualTo(55L);
        assertThat(response.get(0).getDocumentId()).isEqualTo(99L);
        assertThat(response.get(0).getCategory()).isEqualTo(DocumentCategory.MEDICAL);
        assertThat(response.get(0).getFileName()).isEqualTo("Medical_Report.pdf");
        assertThat(response.get(0).getUploadedByName()).isEqualTo("Social Worker");
    }

    @Test
    @DisplayName("uploadCaseDocument stores metadata then writes file to storage")
    void uploadCaseDocument_storesMetadataThenWritesFileToStorage() {
        ClientCase clientCase = clientCase(7L, "OPEN");
        User uploader = user(10L, "Social Worker");
        MockMultipartFile file = new MockMultipartFile(
                "file",
                "Ordination Certificate.pdf",
                "application/pdf",
                "pdf-bytes".getBytes()
        );
        when(caseRepository.findById(7L)).thenReturn(Optional.of(clientCase));
        when(documentRepository.save(any(Document.class))).thenAnswer(invocation -> {
            Document document = invocation.getArgument(0);
            if (document.getId() == null) {
                document.setId(99L);
            }
            return document;
        });
        when(fileStorageService.storeCaseDocument(
                org.mockito.ArgumentMatchers.eq("ASDFL/2026/C/006"),
                org.mockito.ArgumentMatchers.eq(DocumentCategory.ORDINATION),
                org.mockito.ArgumentMatchers.eq(99L),
                org.mockito.ArgumentMatchers.eq("Ordination Certificate.pdf"),
                org.mockito.ArgumentMatchers.eq("application/pdf"),
                aryEq("pdf-bytes".getBytes())))
                .thenReturn(new GcsFileStorageService.StoredFile(
                        "case-files-dev",
                        "cases/ASDFL-2026-C-006/Ordination Certificate/20260706T101530Z-99-Ordination_Certificate.pdf",
                        "application/pdf",
                        9L
                ));
        when(caseDocumentRepository.save(any(CaseDocument.class))).thenAnswer(invocation -> {
            CaseDocument caseDocument = invocation.getArgument(0);
            caseDocument.setId(55L);
            caseDocument.setLinkedAt(LocalDateTime.of(2026, 7, 2, 10, 0));
            return caseDocument;
        });

        CaseDocumentResponse response = service().uploadCaseDocument(7L, DocumentCategory.ORDINATION, file, uploader);

        assertThat(response.getId()).isEqualTo(55L);
        assertThat(response.getCategory()).isEqualTo(DocumentCategory.ORDINATION);
        assertThat(response.getFileName()).isEqualTo("Ordination Certificate.pdf");
        ArgumentCaptor<Document> documentCaptor = ArgumentCaptor.forClass(Document.class);
        verify(documentRepository, org.mockito.Mockito.times(2)).save(documentCaptor.capture());
        assertThat(documentCaptor.getAllValues().get(1).getBucketName()).isEqualTo("case-files-dev");
        assertThat(documentCaptor.getAllValues().get(1).getObjectKey())
                .isEqualTo("cases/ASDFL-2026-C-006/Ordination Certificate/20260706T101530Z-99-Ordination_Certificate.pdf");
        assertThat(documentCaptor.getAllValues().get(1).getChecksumSha256()).hasSize(64);
    }

    @Test
    @DisplayName("uploadCaseDocument rejects empty file")
    void uploadCaseDocument_rejectsEmptyFile() {
        when(caseRepository.findById(7L)).thenReturn(Optional.of(clientCase(7L, "OPEN")));
        MockMultipartFile empty = new MockMultipartFile("file", "empty.pdf", "application/pdf", new byte[0]);

        assertThatThrownBy(() -> service().uploadCaseDocument(7L, DocumentCategory.LEGAL, empty, user(1L, "Manager")))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessage("File must not be empty");

        verify(documentRepository, never()).save(any());
        verify(fileStorageService, never()).storeCaseDocument(any(), any(), any(), any(), any(), any());
    }

    @Test
    @DisplayName("deleteCaseDocument soft-deletes non-sensitive docs (keeps GCS object and rows)")
    void deleteCaseDocument_softDeletesNonSensitive() {
        CaseDocument caseDocument = caseDocument(55L, clientCase(7L, "OPEN"), document(99L), DocumentCategory.FINANCIAL, "ACTIVE");
        when(caseRepository.findById(7L)).thenReturn(Optional.of(clientCase(7L, "OPEN")));
        when(caseDocumentRepository.findByClientCase_IdAndDocument_IdAndStatus(7L, 99L, "ACTIVE"))
                .thenReturn(Optional.of(caseDocument));

        service().deleteCaseDocument(7L, 99L);

        assertThat(caseDocument.getStatus()).isEqualTo("DELETED");
        verify(caseDocumentRepository).save(caseDocument);
        verify(fileStorageService, never()).deleteObject(any());
        verify(caseDocumentRepository, never()).delete(any());
        verify(documentRepository, never()).delete(any());
    }

    @Test
    @DisplayName("deleteCaseDocument rejects sensitive (medical/legal) documents — never physically deleted")
    void deleteCaseDocument_rejectsSensitive() {
        CaseDocument caseDocument = caseDocument(55L, clientCase(7L, "OPEN"), document(99L), DocumentCategory.MEDICAL, "ACTIVE");
        when(caseRepository.findById(7L)).thenReturn(Optional.of(clientCase(7L, "OPEN")));
        when(caseDocumentRepository.findByClientCase_IdAndDocument_IdAndStatus(7L, 99L, "ACTIVE"))
                .thenReturn(Optional.of(caseDocument));

        assertThatThrownBy(() -> service().deleteCaseDocument(7L, 99L))
                .isInstanceOf(org.springframework.web.server.ResponseStatusException.class);

        assertThat(caseDocument.getStatus()).isEqualTo("ACTIVE");
        verify(fileStorageService, never()).deleteObject(any());
        verify(caseDocumentRepository, never()).delete(any());
        verify(caseDocumentRepository, never()).save(any());
    }

    @Test
    @DisplayName("createDownloadUrl returns signed URL for active case document")
    void createDownloadUrl_returnsSignedUrlForActiveCaseDocument() {
        CaseDocument caseDocument = caseDocument(55L, clientCase(7L, "OPEN"), document(99L), DocumentCategory.MEDICAL, "ACTIVE");
        when(caseRepository.findById(7L)).thenReturn(Optional.of(clientCase(7L, "OPEN")));
        when(caseDocumentRepository.findByClientCase_IdAndDocument_IdAndStatus(7L, 99L, "ACTIVE"))
                .thenReturn(Optional.of(caseDocument));
        when(fileStorageService.createReadUrl("cases/7/documents/99/medical.pdf", "application/pdf", "Medical_Report.pdf", true))
                .thenReturn(URI.create("https://signed.example.test/medical.pdf"));

        DocumentDownloadResponse response = service().createDownloadUrl(7L, 99L);

        assertThat(response.getUrl()).isEqualTo("https://signed.example.test/medical.pdf");
        assertThat(response.getFileName()).isEqualTo("Medical_Report.pdf");
    }

    @Test
    @DisplayName("createDownloadUrl can request inline preview URL")
    void createDownloadUrl_canRequestInlinePreviewUrl() {
        CaseDocument caseDocument = caseDocument(55L, clientCase(7L, "OPEN"), document(99L), DocumentCategory.MEDICAL, "ACTIVE");
        when(caseRepository.findById(7L)).thenReturn(Optional.of(clientCase(7L, "OPEN")));
        when(caseDocumentRepository.findByClientCase_IdAndDocument_IdAndStatus(7L, 99L, "ACTIVE"))
                .thenReturn(Optional.of(caseDocument));
        when(fileStorageService.createReadUrl("cases/7/documents/99/medical.pdf", "application/pdf", "Medical_Report.pdf", false))
                .thenReturn(URI.create("https://signed.example.test/medical-preview.pdf"));

        DocumentDownloadResponse response = service().createDownloadUrl(7L, 99L, false);

        assertThat(response.getUrl()).isEqualTo("https://signed.example.test/medical-preview.pdf");
    }

    @Test
    @DisplayName("listCaseDocuments rejects deleted cases")
    void listCaseDocuments_rejectsDeletedCases() {
        when(caseRepository.findById(7L)).thenReturn(Optional.of(clientCase(7L, "DELETED")));

        assertThatThrownBy(() -> service().listCaseDocuments(7L))
                .isInstanceOf(EntityNotFoundException.class)
                .hasMessage("Case not found: 7");
    }

    private CaseDocumentService service() {
        return new CaseDocumentService(
                caseRepository,
                documentRepository,
                caseDocumentRepository,
                fileStorageService,
                new FileStorageProperties()
        );
    }

    private static CaseDocument caseDocument(
            Long id,
            ClientCase clientCase,
            Document document,
            DocumentCategory category,
            String status
    ) {
        CaseDocument caseDocument = new CaseDocument();
        caseDocument.setId(id);
        caseDocument.setClientCase(clientCase);
        caseDocument.setDocument(document);
        caseDocument.setCategory(category);
        caseDocument.setStatus(status);
        caseDocument.setLinkedBy(document.getUploadedBy());
        caseDocument.setLinkedAt(LocalDateTime.of(2026, 7, 2, 9, 30));
        return caseDocument;
    }

    private static Document document(Long id) {
        Document document = new Document();
        document.setId(id);
        document.setFileName("Medical_Report.pdf");
        document.setStoreName("Medical_Report.pdf");
        document.setBucketName("case-files-dev");
        document.setObjectKey("cases/7/documents/99/medical.pdf");
        document.setMimeType("application/pdf");
        document.setFileSize(1024L);
        document.setUploadedBy(user(10L, "Social Worker"));
        document.setUploadedAt(LocalDateTime.of(2026, 7, 1, 11, 0));
        return document;
    }

    private static ClientCase clientCase(Long id, String status) {
        Client client = new Client();
        client.setId(5L);
        client.setAbbr("VXA");
        client.setNameEn("Venerable X");
        client.setMembershipStatus("ACTIVE");

        ClientCase clientCase = new ClientCase();
        clientCase.setId(id);
        clientCase.setClient(client);
        clientCase.setCaseCode("ASDFL/2026/C/006");
        clientCase.setTitle("VXA - Case");
        clientCase.setStatus(status);
        clientCase.setCreatedBy(user(1L, "Manager"));
        clientCase.setOpenedAt(LocalDateTime.of(2026, 6, 1, 9, 0));
        return clientCase;
    }

    private static User user(Long id, String fullName) {
        User user = new User();
        user.setId(id);
        user.setUsername("user-" + id);
        user.setEmail("user" + id + "@test.com");
        user.setFullName(fullName);
        user.setStatus("ACTIVE");
        return user;
    }
}
