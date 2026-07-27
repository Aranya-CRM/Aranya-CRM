package aranya.crm.entity;

import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import jakarta.persistence.Column;
import jakarta.persistence.Enumerated;
import jakarta.persistence.EnumType;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.lang.reflect.Field;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;

class BusinessEntityMappingTest {

    @Test
    @DisplayName("All database tables have matching JPA entities")
    void allDatabaseTables_haveMatchingJpaEntities() {
        Map<Class<?>, String> mappings = Map.ofEntries(
                Map.entry(Invitation.class, "invitation"),
                Map.entry(EmailNotificationLog.class, "email_notification_log"),
                Map.entry(RelatedContact.class, "related_contact"),
                Map.entry(ClientCase.class, "\"case\""),
                Map.entry(ServiceCategory.class, "service_category"),
                Map.entry(ServiceType.class, "service_type"),
                Map.entry(CaseAssignment.class, "case_assignment"),
                Map.entry(CaseNote.class, "case_note"),
                Map.entry(ServiceAppointment.class, "service_appointment"),
                Map.entry(Document.class, "document"),
                Map.entry(CaseChangeLog.class, "case_change_log"),
                Map.entry(OperationAuditLog.class, "operation_audit_log"),
                Map.entry(CaseDocument.class, "case_document"),
                Map.entry(VisitReport.class, "visit_report"),
                Map.entry(ApprovalRequest.class, "approval_request")
        );

        mappings.forEach((entityClass, tableName) -> {
            Table table = entityClass.getAnnotation(Table.class);
            assertThat(table).as(entityClass.getSimpleName()).isNotNull();
            assertThat(table.name()).as(entityClass.getSimpleName()).isEqualTo(tableName);
        });
    }

    @Test
    @DisplayName("Foreign key fields use lazy many-to-one associations")
    void foreignKeyFields_useLazyManyToOneAssociations() throws Exception {
        assertManyToOne(RelatedContact.class, "client", "client_id", false);
        assertManyToOne(ClientCase.class, "client", "client_id", false);
        assertManyToOne(ClientCase.class, "createdBy", "created_by", false);
        assertManyToOne(ServiceType.class, "category", "category_id", false);
        assertManyToOne(CaseAssignment.class, "clientCase", "case_id", false);
        assertManyToOne(CaseAssignment.class, "user", "user_id", false);
        assertManyToOne(ServiceAppointment.class, "serviceType", "service_type_id", false);
        assertManyToOne(CaseDocument.class, "document", "document_id", false);
        assertManyToOne(ApprovalRequest.class, "requestedBy", "requested_by", false);
        assertManyToOne(ApprovalRequest.class, "decidedBy", "decided_by", true);
        assertManyToOne(OperationAuditLog.class, "clientCase", "case_id", false);
        assertManyToOne(OperationAuditLog.class, "actor", "actor_id", true);
    }

    @Test
    @DisplayName("Entities initialize schema defaults")
    void entities_initializeSchemaDefaults() {
        assertThat(new ClientCase().getPriority()).isEqualTo("NORMAL");
        assertThat(new ClientCase().getStatus()).isEqualTo("OPEN");
        assertThat(new ServiceCategory().isActive()).isTrue();
        assertThat(new ServiceType().isActive()).isTrue();
        assertThat(new CaseAssignment().isPrimary()).isFalse();
        assertThat(new CaseAssignment().getStatus()).isEqualTo("ACTIVE");
        assertThat(new CaseNote().getVisibility()).isEqualTo("INTERNAL");
        assertThat(new ServiceAppointment().getStatus()).isEqualTo("SCHEDULED");
        assertThat(new Document().getStatus()).isEqualTo("ACTIVE");
        assertThat(new CaseDocument().getStatus()).isEqualTo("ACTIVE");
        assertThat(new ApprovalRequest().getStatus()).isEqualTo("PENDING");
    }

    @Test
    @DisplayName("Document entities store GCS metadata and fixed case categories")
    void documentEntities_storeGcsMetadataAndFixedCaseCategories() throws Exception {
        assertColumn(Document.class, "bucketName", "bucket_name", true);
        assertColumn(Document.class, "objectKey", "object_key", true);
        assertColumn(Document.class, "checksumSha256", "checksum_sha256", true);
        assertThat(Document.class.getDeclaredFields())
                .extracting(Field::getName)
                .doesNotContain("s3Bucket", "s3Key");

        Field category = CaseDocument.class.getDeclaredField("category");
        Column categoryColumn = category.getAnnotation(Column.class);
        assertThat(categoryColumn).isNotNull();
        assertThat(categoryColumn.name()).isEqualTo("category");
        assertThat(categoryColumn.nullable()).isFalse();
        assertThat(category.getAnnotation(Enumerated.class)).isNotNull();
        assertThat(category.getAnnotation(Enumerated.class).value()).isEqualTo(EnumType.STRING);

        assertThat(DocumentCategory.values())
                .extracting(Enum::name)
                .containsExactly("ORDINATION", "MEDICAL", "FINANCIAL", "LEGAL");
    }

    private static void assertManyToOne(
            Class<?> entityClass,
            String fieldName,
            String joinColumnName,
            boolean nullable
    ) throws Exception {
        Field field = entityClass.getDeclaredField(fieldName);
        assertThat(field.getAnnotation(ManyToOne.class)).isNotNull();

        JoinColumn joinColumn = field.getAnnotation(JoinColumn.class);
        assertThat(joinColumn).isNotNull();
        assertThat(joinColumn.name()).isEqualTo(joinColumnName);
        assertThat(joinColumn.nullable()).isEqualTo(nullable);
    }

    private static void assertColumn(
            Class<?> entityClass,
            String fieldName,
            String columnName,
            boolean nullable
    ) throws Exception {
        Field field = entityClass.getDeclaredField(fieldName);
        Column column = field.getAnnotation(Column.class);
        assertThat(column).isNotNull();
        assertThat(column.name()).isEqualTo(columnName);
        assertThat(column.nullable()).isEqualTo(nullable);
    }
}
