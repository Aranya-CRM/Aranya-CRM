package aranya.crm.common.dto;


import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.time.OffsetDateTime;

/**
 * 统一的 API 错误响应格式。
 * 所有错误响应(401 / 403 / 428 / 500 等)都用这个 DTO 序列化成 JSON。
 */

@Getter
@NoArgsConstructor
@AllArgsConstructor
public class ApiErrorResponse {
    private String code;

    private String message;

    private OffsetDateTime timestamp;

    private String path;

    public static ApiErrorResponse of(String code, String message, String path) {
        return new ApiErrorResponse(code,message,OffsetDateTime.now(),path);
    }
}
