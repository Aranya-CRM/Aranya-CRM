import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  deleteUser,
  fetchUsers,
  inviteUser,
  updateUserRoles,
  updateUserStatus,
} from '../api/userManagement.api'
import type { ApprovalOptions } from '../api/userManagement.api'
import type {
  InviteUserPayload,
  UpdateUserRolesPayload,
  UpdateUserStatusPayload,
} from '../types'

export const userQueryKeys = {
  all: ['users'] as const,
  lists: () => [...userQueryKeys.all, 'list'] as const,
  list: () => [...userQueryKeys.lists()] as const,
}

export function useUsers() {
  return useQuery({
    queryKey: userQueryKeys.list(),
    queryFn: fetchUsers,
  })
}

export function useInviteUser() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: InviteUserPayload) => inviteUser(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: userQueryKeys.lists() })
    },
  })
}

export function useUpdateUserRoles() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: UpdateUserRolesPayload }) =>
      updateUserRoles(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: userQueryKeys.lists() })
    },
  })
}

export function useUpdateUserStatus() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: UpdateUserStatusPayload }) =>
      updateUserStatus(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: userQueryKeys.lists() })
    },
  })
}

export function useDeleteUser() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, approverId }: { id: number } & ApprovalOptions) => deleteUser(id, { approverId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: userQueryKeys.lists() })
    },
  })
}
