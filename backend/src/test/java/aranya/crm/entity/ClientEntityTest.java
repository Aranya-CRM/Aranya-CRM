package aranya.crm.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Table;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.lang.reflect.Field;

import static org.assertj.core.api.Assertions.assertThat;

class ClientEntityTest {

    @Test
    @DisplayName("Client maps to the client table with core schema fields")
    void client_mapsToClientTableWithCoreSchemaFields() throws Exception {
        Table table = Client.class.getAnnotation(Table.class);

        assertThat(table).isNotNull();
        assertThat(table.name()).isEqualTo("client");
        assertColumn("abbr", "abbr", 20, false, true);
        assertColumn("nameEn", "name_en", 150, false, false);
        assertColumn("whatsappEnabled", "whatsapp_enabled", 255, false, false);
        assertColumn("nextOfKinContact", "next_of_kin_contact", 100, true, false);
    }

    @Test
    @DisplayName("Client initializes database defaults used by the schema")
    void client_initializesDatabaseDefaults() {
        Client client = new Client();

        assertThat(client.isWhatsappEnabled()).isFalse();
        assertThat(client.isWellbeingLivingConditions()).isFalse();
        assertThat(client.isWellbeingMentalHealth()).isFalse();
        assertThat(client.isWellbeingPhysicalHealth()).isFalse();
        assertThat(client.isWellbeingFinancialStability()).isFalse();
        assertThat(client.isWellbeingSocialSupport()).isFalse();
        assertThat(client.isWellbeingLegalIssues()).isFalse();
        assertThat(client.isWellbeingSpiritual()).isFalse();
        assertThat(client.getMembershipStatus()).isEqualTo("ACTIVE");
    }

    private static void assertColumn(
            String fieldName,
            String columnName,
            int length,
            boolean nullable,
            boolean unique
    ) throws Exception {
        Field field = Client.class.getDeclaredField(fieldName);
        Column column = field.getAnnotation(Column.class);

        assertThat(column).isNotNull();
        assertThat(column.name()).isEqualTo(columnName);
        assertThat(column.length()).isEqualTo(length);
        assertThat(column.nullable()).isEqualTo(nullable);
        assertThat(column.unique()).isEqualTo(unique);
    }
}
