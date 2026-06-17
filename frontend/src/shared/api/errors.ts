import axios from 'axios'

/**
 * 从抛出的错误中提取后端 ApiErrorResponse 的 `code` 字段(若存在)。
 * 用于把同一 HTTP 状态下的不同业务错误(如 ALREADY_INVITED / ALREADY_EXISTS)映射到不同提示。
 */
export function getApiErrorCode(error: unknown): string | undefined {
  if (axios.isAxiosError(error)) {
    const data = error.response?.data
    if (data && typeof data === 'object' && 'code' in data) {
      const code = (data as { code?: unknown }).code
      return typeof code === 'string' ? code : undefined
    }
  }
  return undefined
}
