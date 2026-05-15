package aranya.crm.dto.response;

import com.fasterxml.jackson.annotation.JsonInclude;
import lombok.Builder;
import lombok.Data;

import java.time.OffsetDateTime;
import java.util.List;

@Data
@Builder
@JsonInclude(JsonInclude.Include.NON_NULL)
public class DashboardResponse {
    private DesignSystem designSystem;
    private Screen screen;
    private List<Section> sections;
    private Metadata metadata;

    @Data
    @Builder
    @JsonInclude(JsonInclude.Include.NON_NULL)
    public static class DesignSystem {
        private String name;
        private String version;
    }

    @Data
    @Builder
    @JsonInclude(JsonInclude.Include.NON_NULL)
    public static class Screen {
        private String id;
        private String version;
    }

    @Data
    @Builder
    @JsonInclude(JsonInclude.Include.NON_NULL)
    public static class Section {
        private String id;
        private List<Stat> stats;
        private List<Item> items;
        private List<Action> actions;
    }

    @Data
    @Builder
    @JsonInclude(JsonInclude.Include.NON_NULL)
    public static class Stat {
        private String id;
        private String value;
    }

    @Data
    @Builder
    @JsonInclude(JsonInclude.Include.NON_NULL)
    public static class Item {
        private String id;
        private String clientId;
        private String clientNameChn;
        private String clientNameEn;
        private String caseCode;
        private String statusCode;
        private String colorCode;
        private String openedAt;
        private String reportType;
        private String dateOfVisit;
        private String createdAt;
        private String createdById;
        private String createdByName;
    }

    @Data
    @Builder
    @JsonInclude(JsonInclude.Include.NON_NULL)
    public static class Action {
        private String id;
        private String targetId;
    }

    @Data
    @Builder
    @JsonInclude(JsonInclude.Include.NON_NULL)
    public static class Metadata {
        private String generatedAt;

        public static Metadata now() {
            return Metadata.builder()
                    .generatedAt(OffsetDateTime.now().toString())
                    .build();
        }
    }
}
