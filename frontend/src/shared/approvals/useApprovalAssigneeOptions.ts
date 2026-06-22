import { useMemo } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { useUsers } from '../../features/users/hooks'

export interface ApprovalAssigneeOption {
  id: number
  label: string
}

export function useApprovalAssigneeOptions() {
  const { user: currentUser } = useAuth()
  const usersQuery = useUsers()

  const options = useMemo<ApprovalAssigneeOption[]>(() => {
    const users = usersQuery.data ?? []
    const current = users.find((item) => (
      item.id === currentUser?.id || item.email === currentUser?.email
    ))
    const currentRoles = new Set(current?.roles ?? [])
    const requesterIsManager = currentRoles.has('MANAGER')
    const requesterIsSocialWorker = currentRoles.has('SOCIAL_WORKER')

    if (!requesterIsManager && !requesterIsSocialWorker) {
      return []
    }

    return users
      .filter((item) => {
        if (item.status !== 'ACTIVE') return false
        if (!item.roles.includes('MANAGER')) return false
        if (requesterIsManager && item.id === currentUser?.id) return false
        return true
      })
      .map((item) => ({
        id: item.id,
        label: `${item.fullName} (${item.email})`,
      }))
  }, [currentUser?.email, currentUser?.id, usersQuery.data])

  return {
    options,
    isLoading: usersQuery.isLoading,
    isError: usersQuery.isError,
  }
}
