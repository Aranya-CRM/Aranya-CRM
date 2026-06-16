/**
 * 把后端邀请接口返回的业务错误 code 映射到 i18n key。
 * DashboardPage 与 UsersPage 共用,保证提示一致。
 */
export function inviteErrorKey(code: string | undefined): string {
  switch (code) {
    case 'ALREADY_INVITED':
      return 'users.error.alreadyInvited'
    case 'ALREADY_EXISTS':
      return 'users.error.alreadyExists'
    default:
      return 'users.error.invite'
  }
}
