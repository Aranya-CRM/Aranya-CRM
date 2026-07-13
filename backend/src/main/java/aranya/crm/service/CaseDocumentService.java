package aranya.crm.service;

import aranya.crm.config.FileStorageProperties;
import aranya.crm.dto.response.CaseDocumentResponse;
import aranya.crm.dto.response.DocumentDownloadResponse;
import aranya.crm.entity.CaseDocument;
import aranya.crm.entity.ClientCase;
import aranya.crm.entity.Document;
import aranya.crm.entity.DocumentCategory;
import aranya.crm.entity.User;
import aranya.crm.repository.CaseDocumentRepository;
import aranya.crm.repository.CaseRepository;
import aranya.crm.repository.DocumentRepository;
import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.net.URI;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.time.LocalDateTime;
import java.util.HexFormat;
import java.util.List;
import java.util.Locale;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class CaseDocumentService {

    private static final String ACTIVE = "ACTIVE";
    private static final String DELETED = "DELETED";

    private final CaseRepository caseRepository;
    private final DocumentRepository documentRepository;
    private final CaseDocumentRepository caseDocumentRepository;
    private final GcsFileStorageService fileStorageService;
    private final FileStorageProperties fileStorageProperties;

    public List<CaseDocumentResponse> listCaseDocuments(Long caseId) {
        requireActiveCase(caseId);
        return caseDocumentRepository.findByClientCase_IdAndStatusOrderByCategoryAscLinkedAtDescIdDesc(caseId, ACTIVE)
                .stream()
                .map(this::toResponse)
                .toList();
    }

    @Transactional
    public CaseDocumentResponse uploadCaseDocument(
            Long caseId,
            DocumentCategory category,
            MultipartFile file,
            User currentUser
    ) {
        return uploadCaseDocument(caseId, category, file, null, currentUser);
    }

    @Transactional
    public CaseDocumentResponse uploadCaseDocument(
            Long caseId,
            DocumentCategory category,
            MultipartFile file,
            String displayName,
            User currentUser
    ) {
        ClientCase clientCase = requireActiveCase(caseId);
        if (category == null) {
            throw new IllegalArgumentException("Document category is required");
        }
        if (file == null || file.isEmpty()) {
            throw new IllegalArgumentException("File must not be empty");
        }
        enforceUploadSize(file);

        byte[] bytes = readBytes(file);
        String originalFileName = normalizeFileName(file.getOriginalFilename());
        String fileName = resolveFileName(displayName, originalFileName);
        String contentType = normalizeContentType(file.getContentType());

        Document document = new Document();
        document.setFileName(fileName);
        document.setStoreName(originalFileName);
        document.setMimeType(contentType);
        document.setFileSize((long) bytes.length);
        document.setUploadedBy(currentUser);
        document.setUploadedAt(LocalDateTime.now());
        document.setChecksumSha256(sha256(bytes));
        document = documentRepository.save(document);

        GcsFileStorageService.StoredFile stored = fileStorageService.storeCaseDocument(
                clientCase.getCaseCode(),
                category,
                document.getId(),
                fileName,
                contentType,
                bytes
        );
        document.setBucketName(stored.bucketName());
        document.setObjectKey(stored.objectKey());
        document.setMimeType(stored.contentType());
        document.setFileSize(stored.size());
        document = documentRepository.save(document);

        CaseDocument caseDocument = new CaseDocument();
        caseDocument.setClientCase(clientCase);
        caseDocument.setDocument(document);
        caseDocument.setLinkedBy(currentUser);
        caseDocument.setCategory(category);
        caseDocument.setStatus(ACTIVE);
        caseDocument = caseDocumentRepository.save(caseDocument);
        return toResponse(caseDocument);
    }

    public DocumentDownloadResponse createDownloadUrl(Long caseId, Long documentId) {
        return createDownloadUrl(caseId, documentId, true);
    }

    public DocumentDownloadResponse createDownloadUrl(Long caseId, Long documentId, boolean forceDownload) {
        requireActiveCase(caseId);
        CaseDocument caseDocument = findActiveCaseDocument(caseId, documentId);
        Document document = caseDocument.getDocument();
        URI uri = fileStorageService.createReadUrl(
                document.getObjectKey(),
                document.getMimeType(),
                document.getFileName(),
                forceDownload
        );
        return DocumentDownloadResponse.builder()
                .url(uri.toString())
                .fileName(document.getFileName())
                .expiresInSeconds(fileStorageProperties.getGcs().getSignedUrlTtl().toSeconds())
                .build();
    }

    /**
     * 移除个案文档 —— 遵循数据治理政策(retain by default):
     * - 所有分类均为软删除:仅标记 status=DELETED,保留 GCS 对象与数据库记录以便日后恢复,
     *   绝不做物理删除(既不删 GCS blob,也不删表行)。
     */
    @Transactional
    public void deleteCaseDocument(Long caseId, Long documentId) {
        requireActiveCase(caseId);
        CaseDocument caseDocument = findActiveCaseDocument(caseId, documentId);
        caseDocument.setStatus(DELETED);
        caseDocumentRepository.save(caseDocument);
    }

    private ClientCase requireActiveCase(Long caseId) {
        ClientCase clientCase = caseRepository.findById(caseId)
                .orElseThrow(() -> new EntityNotFoundException("Case not found: " + caseId));
        if (DELETED.equalsIgnoreCase(clientCase.getStatus())) {
            throw new EntityNotFoundException("Case not found: " + caseId);
        }
        return clientCase;
    }

    private CaseDocument findActiveCaseDocument(Long caseId, Long documentId) {
        return caseDocumentRepository.findByClientCase_IdAndDocument_IdAndStatus(caseId, documentId, ACTIVE)
                .orElseThrow(() -> new EntityNotFoundException("Case document not found: " + documentId));
    }

    private CaseDocumentResponse toResponse(CaseDocument caseDocument) {
        Document document = caseDocument.getDocument();
        User uploadedBy = document.getUploadedBy();
        return CaseDocumentResponse.builder()
                .id(caseDocument.getId())
                .documentId(document.getId())
                .caseId(caseDocument.getClientCase().getId())
                .category(caseDocument.getCategory())
                .fileName(document.getFileName())
                .mimeType(document.getMimeType())
                .fileSize(document.getFileSize())
                .uploadedByName(uploadedBy != null ? uploadedBy.getFullName() : null)
                .uploadedAt(document.getUploadedAt())
                .build();
    }

    private void enforceUploadSize(MultipartFile file) {
        long maxBytes = fileStorageProperties.getMaxUploadSizeMb() * 1024L * 1024L;
        if (file.getSize() > maxBytes) {
            throw new IllegalArgumentException("File exceeds maximum upload size");
        }
    }

    private byte[] readBytes(MultipartFile file) {
        try {
            return file.getBytes();
        } catch (IOException e) {
            throw new IllegalArgumentException("Failed to read uploaded file", e);
        }
    }

    private String normalizeFileName(String originalFileName) {
        if (originalFileName == null || originalFileName.isBlank()) {
            return "file";
        }
        return originalFileName.trim();
    }

    private String normalizeContentType(String contentType) {
        if (contentType == null || contentType.isBlank()) {
            return "application/octet-stream";
        }
        return contentType.trim().toLowerCase(Locale.ROOT);
    }

    private String sha256(byte[] bytes) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            return HexFormat.of().formatHex(digest.digest(bytes));
        } catch (NoSuchAlgorithmException e) {
            throw new IllegalStateException("SHA-256 digest is not available", e);
        }
    }

    public String resolveFileName(
        String displayName,
        String originalFileName
    ) {
        if (displayName == null || displayName.isBlank()) {
            return originalFileName;
        }

        String extension = "";
        int index = originalFileName.lastIndexOf('.');

        if (index >= 0) {
            extension = originalFileName.substring(index);
        }

        String name = displayName.trim();
        if(!name.toLowerCase().endsWith(extension.toLowerCase())) {
            name += extension;
        }
        return name;
    }
}

