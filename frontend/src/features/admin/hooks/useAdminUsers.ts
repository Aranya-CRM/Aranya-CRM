import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  deleteUser,
  fetchAdminUsers,
  inviteUser,
  updateUserRoles,
  updateUserStatus,
} from '../api/adminUser.api'
import type {
  InviteUserPayload,
  UpdateUserRolesPayload,
  UpdateUserStatusPayload,
} from '../../users/types'

export const adminUserQueryKeys = {
  all: ['admin', 'users'] as const,
  list: () => [...adminUserQueryKeys.all, 'list'] as const,
}

export function useAdminUsers() {
  return useQuery({
    queryKey: adminUserQueryKeys.list(),
    queryFn: fetchAdminUsers,
  })
}

export function useInviteUser() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: InviteUserPayload) => inviteUser(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: adminUserQueryKeys.all })
    },
  })
}

export function useUpdateUserRoles() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: UpdateUserRolesPayload }) => updateUserRoles(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: adminUserQueryKeys.all })
    },
  })
}

export function useUpdateUserStatus() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: UpdateUserStatusPayload }) => updateUserStatus(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: adminUserQueryKeys.all })
    },
  })
}

export function useDeleteUser() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => deleteUser(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: adminUserQueryKeys.all })
    },
  })
}
