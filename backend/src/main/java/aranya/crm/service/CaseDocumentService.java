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
import java.util.Set;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class CaseDocumentService {

    private static final String ACTIVE = "ACTIVE";
    private static final String CLOSED = "CLOSED";
    private static final String DELETED = "DELETED";

    private final CaseRepository caseRepository;
    private final DocumentRepository documentRepository;
    private final CaseDocumentRepository caseDocumentRepository;
    private final GcsFileStorageService fileStorageService;
    private final FileStorageProperties fileStorageProperties;

    /**
     * 列出个案文档,仅返回调用者有权查看的类别(cases:documents.view.&lt;category&gt;)。
     * 类别可见性由 controller 依据 role_cap ∪ user_cap 计算后传入。
     */
    public List<CaseDocumentResponse> listCaseDocuments(Long caseId, Set<DocumentCategory> viewableCategories) {
        requireVisibleCase(caseId);
        return caseDocumentRepository.findByClientCase_IdAndStatusOrderByCategoryAscLinkedAtDescIdDesc(caseId, ACTIVE)
                .stream()
                .filter(caseDocument -> viewableCategories.contains(caseDocument.getCategory()))
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
        ClientCase clientCase = requireMutableCase(caseId);
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

    public DocumentDownloadResponse createDownloadUrl(Long caseId, Long documentId, Set<DocumentCategory> viewableCategories) {
        return createDownloadUrl(caseId, documentId, true, viewableCategories);
    }

    public DocumentDownloadResponse createDownloadUrl(Long caseId, Long documentId, boolean forceDownload, Set<DocumentCategory> viewableCategories) {
        requireVisibleCase(caseId);
        CaseDocument caseDocument = findActiveCaseDocument(caseId, documentId);
        // 无该类别查看权限时按"不存在"处理,不泄露文件存在性
        if (!viewableCategories.contains(caseDocument.getCategory())) {
            throw new EntityNotFoundException("Case document not found: " + documentId);
        }
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
        requireMutableCase(caseId);
        CaseDocument caseDocument = findActiveCaseDocument(caseId, documentId);
        caseDocument.setStatus(DELETED);
        caseDocumentRepository.save(caseDocument);
    }

    private ClientCase requireVisibleCase(Long caseId) {
        ClientCase clientCase = caseRepository.findById(caseId)
                .orElseThrow(() -> new EntityNotFoundException("Case not found: " + caseId));
        if (DELETED.equalsIgnoreCase(clientCase.getStatus())) {
            throw new EntityNotFoundException("Case not found: " + caseId);
        }
        return clientCase;
    }

    private ClientCase requireMutableCase(Long caseId) {
        ClientCase clientCase = requireVisibleCase(caseId);
        if (CLOSED.equalsIgnoreCase(clientCase.getStatus())) {
            throw new IllegalStateException("Closed cases are read-only");
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

