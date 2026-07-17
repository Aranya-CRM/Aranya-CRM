import type { UserSummary } from '../users/types'

const PRIMARY_ASSIGNEE_ROLES = new Set(['MANAGER', 'FULL_MANAGER', 'TEAM_LEAD', 'SOCIAL_WORKER'])

export function canBePrimaryCaseAssignee(user: Pick<UserSummary, 'roles' | 'status'>): boolean {
  return user.status === 'ACTIVE' && user.roles.some((role) => PRIMARY_ASSIGNEE_ROLES.has(role))
}
