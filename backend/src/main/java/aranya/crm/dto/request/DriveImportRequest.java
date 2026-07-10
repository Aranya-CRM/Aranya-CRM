package aranya.crm.dto.request;

import aranya.crm.entity.DocumentCategory;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;

import java.util.List;

/** 批量把选中的 Drive 文件导入到指定 case + 分类。 */
public class DriveImportRequest {

    @NotEmpty
    private List<Item> items;

    public List<Item> getItems() {
        return items;
    }

    public void setItems(List<Item> items) {
        this.items = items;
    }

    public static class Item {
        @NotNull
        private String driveFileId;
        @NotNull
        private Long caseId;
        @NotNull
        private DocumentCategory category;
        /** 可选:覆盖文件名(留空则用 Drive 原名) */
        private String displayName;

        public String getDriveFileId() {
            return driveFileId;
        }

        public void setDriveFileId(String driveFileId) {
            this.driveFileId = driveFileId;
        }

        public Long getCaseId() {
            return caseId;
        }

        public void setCaseId(Long caseId) {
            this.caseId = caseId;
        }

        public DocumentCategory getCategory() {
            return category;
        }

        public void setCategory(DocumentCategory category) {
            this.category = category;
        }

        public String getDisplayName() {
            return displayName;
        }

        public void setDisplayName(String displayName) {
            this.displayName = displayName;
        }
    }
}
