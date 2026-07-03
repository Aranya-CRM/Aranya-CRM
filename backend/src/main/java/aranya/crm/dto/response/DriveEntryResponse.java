package aranya.crm.dto.response;

import lombok.Builder;
import lombok.Data;

/** Drive 浏览返回的一条目(文件或文件夹)。 */
@Data
@Builder
public class DriveEntryResponse {
    private String id;
    private String name;
    private String mimeType;
    private Long size;
    private String modifiedTime;
    private boolean folder;
    /** Google 原生文档导入时会被导出为该格式(如 PDF);普通文件为空。 */
    private String exportAs;
}
