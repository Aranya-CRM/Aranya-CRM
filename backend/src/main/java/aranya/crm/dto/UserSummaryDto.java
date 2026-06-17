package aranya.crm.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;

import java.time.OffsetDateTime;
import java.util.List;

@Data
@Builder
@AllArgsConstructor
public class UserSummaryDto {
    private Long id;
    private String username;
    private String email;
    private String fullName;
    private String status;
    private List<String> roles;
    private OffsetDateTime invitedAt;
    private boolean inviteStale; // 邀请已超阈值天数仍未接受(提醒 MANAGER 手动清理)
}
