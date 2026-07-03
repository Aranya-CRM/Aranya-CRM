package aranya.crm.service;

import aranya.crm.dto.request.DriveImportRequest;
import aranya.crm.dto.response.DriveImportResultResponse;
import aranya.crm.entity.CaseDocument;
import aranya.crm.entity.ClientCase;
import aranya.crm.entity.Document;
import aranya.crm.entity.User;
import aranya.crm.repository.CaseDocumentRepository;
import aranya.crm.repository.CaseRepository;
import aranya.crm.repository.DocumentRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.time.LocalDateTime;
import java.util.HexFormat;

/**
 * 单个 Drive 文件的导入(各自独立事务,便于批量中一条失败不连累其他)。
 */
@Service
@RequiredArgsConstructor
public class DriveDocumentImporter {

    private static final String ACTIVE = "ACTIVE";
    private static final String DELETED = "DELETED";
    private static final String SOURCE_DRIVE = "DRIVE_IMPORT";

    private final CaseRepository caseRepository;
    private final DocumentRepository documentRepository;
    private final CaseDocumentRepository caseDocumentRepository;
    private final GcsFileStorageService fileStorageService;
    private final GoogleDriveService driveService;

    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public DriveImportResultResponse importOne(DriveImportRequest.Item item, User actor) {
        Long caseId = item.getCaseId();
        String driveFileId = item.getDriveFileId();

        ClientCase clientCase = caseRepository.findById(caseId).orElse(null);
        if (clientCase == null || DELETED.equalsIgnoreCase(clientCase.getStatus())) {
            return result(driveFileId, "FAILED", caseId, null, null, "Case not found: " + caseId);
        }
        if (caseDocumentRepository.existsByClientCase_IdAndStatusAndDocument_DriveFileId(caseId, ACTIVE, driveFileId)) {
            return result(driveFileId, "SKIPPED", caseId, null, null, "Already imported");
        }

        GoogleDriveService.DriveDownload download = driveService.download(driveFileId);
        String driveName = download.fileName();
        String fileName = resolveFileName(item.getDisplayName(), driveName);
        byte[] bytes = download.bytes();
        String contentType = download.mimeType();

        Document document = new Document();
        document.setFileName(fileName);
        document.setStoreName(driveName);
        document.setMimeType(contentType);
        document.setFileSize((long) bytes.length);
        document.setUploadedBy(actor);
        document.setUploadedAt(LocalDateTime.now());
        document.setChecksumSha256(sha256(bytes));
        document.setSource(SOURCE_DRIVE);
        document.setDriveFileId(driveFileId);
        document = documentRepository.save(document);

        GcsFileStorageService.StoredFile stored = fileStorageService.storeCaseDocument(
                caseId, document.getId(), fileName, contentType, bytes);
        document.setBucketName(stored.bucketName());
        document.setObjectKey(stored.objectKey());
        document.setMimeType(stored.contentType());
        document.setFileSize(stored.size());
        document = documentRepository.save(document);

        CaseDocument caseDocument = new CaseDocument();
        caseDocument.setClientCase(clientCase);
        caseDocument.setDocument(document);
        caseDocument.setLinkedBy(actor);
        caseDocument.setCategory(item.getCategory());
        caseDocument.setStatus(ACTIVE);
        caseDocumentRepository.save(caseDocument);

        return result(driveFileId, "IMPORTED", caseId, fileName, document.getId(), null);
    }

    private String resolveFileName(String displayName, String driveName) {
        if (displayName == null || displayName.isBlank()) {
            return driveName;
        }
        String name = displayName.trim();
        int dot = driveName.lastIndexOf('.');
        if (dot > 0) {
            String ext = driveName.substring(dot);
            if (!name.toLowerCase().endsWith(ext.toLowerCase())) {
                return name + ext;
            }
        }
        return name;
    }

    private DriveImportResultResponse result(String driveFileId, String status, Long caseId,
                                             String fileName, Long documentId, String message) {
        return DriveImportResultResponse.builder()
                .driveFileId(driveFileId)
                .status(status)
                .caseId(caseId)
                .fileName(fileName)
                .documentId(documentId)
                .message(message)
                .build();
    }

    private String sha256(byte[] bytes) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            return HexFormat.of().formatHex(digest.digest(bytes));
        } catch (NoSuchAlgorithmException e) {
            throw new IllegalStateException("SHA-256 digest is not available", e);
        }
    }
}
