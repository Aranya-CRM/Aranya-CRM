export type UserStatus = 'ACTIVE' | 'INACTIVE'

export type UserRole = 'MANAGER' | 'SOCIAL_WORKER' | 'VOLUNTEER' | string

export interface UserSummary {
  id: number
  username: string
  email: string
  fullName: string
  status: UserStatus
  roles: UserRole[]
}

export interface InviteUserPayload {
  username: string
  fullName: string
  email: string
  phone?: string
  roles: UserRole[]
}

export interface UpdateUserRolesPayload {
  roles: UserRole[]
}

export interface UpdateUserStatusPayload {
  status: UserStatus
}
