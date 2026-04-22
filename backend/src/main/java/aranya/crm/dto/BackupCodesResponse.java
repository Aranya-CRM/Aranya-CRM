package aranya.crm.dto;

import lombok.AllArgsConstructor;
import lombok.Data;

import java.util.List;

@Data
@AllArgsConstructor
public class BackupCodesResponse {
    private List<String> codes;
}
