import { useMemo } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { useUsers } from '../../features/users/hooks'

export interface ApprovalAssigneeOption {
  id: number
  label: string
}

interface ApprovalAssigneeOptionsConfig {
  allowSelfAssignment?: boolean
}

export function useApprovalAssigneeOptions(config: ApprovalAssigneeOptionsConfig = {}) {
  const { user: currentUser } = useAuth()
  const usersQuery = useUsers()
  const allowSelfAssignment = config.allowSelfAssignment === true

  const options = useMemo<ApprovalAssigneeOption[]>(() => {
    const users = usersQuery.data ?? []
    const current = users.find((item) => (
      item.id === currentUser?.id || item.email === currentUser?.email
    ))
    const currentRoles = new Set(current?.roles ?? [])
    const requesterIsManager = hasApprovalManagerRole(currentRoles)
    const requesterIsSocialWorker = currentRoles.has('SOCIAL_WORKER')

    if (!requesterIsManager && !requesterIsSocialWorker) {
      return []
    }

    return users
      .filter((item) => {
        if (item.status !== 'ACTIVE') return false
        if (!item.roles.some(isApprovalManagerRole)) return false
        const isCurrentUser = item.id === current?.id || item.id === currentUser?.id || item.email === currentUser?.email
        if (isCurrentUser && !(allowSelfAssignment && currentRoles.has('MANAGER'))) return false
        return true
      })
      .map((item) => ({
        id: item.id,
        label: `${item.fullName} (${item.email})`,
      }))
  }, [allowSelfAssignment, currentUser?.email, currentUser?.id, usersQuery.data])

  return {
    options,
    isLoading: usersQuery.isLoading,
    isError: usersQuery.isError,
  }
}

function hasApprovalManagerRole(roles: Set<string>): boolean {
  return Array.from(roles).some(isApprovalManagerRole)
}

function isApprovalManagerRole(role: string): boolean {
  return role === 'MANAGER' || role === 'ADMIN' || role === 'FULL_MANAGER' || role === 'TEAM_LEAD'
}
