package aranya.crm.common.exception;

import lombok.Getter;

/**
 * 资源冲突(HTTP 409)。携带稳定的机器可读 code,供前端映射到不同的本地化提示。
 * 例如邀请时:ALREADY_INVITED(邮箱已被邀请) / ALREADY_EXISTS(账号已存在)。
 */
@Getter
public class ConflictException extends RuntimeException {

    private final String code;

    public ConflictException(String code, String message) {
        super(message);
        this.code = code;
    }
}
