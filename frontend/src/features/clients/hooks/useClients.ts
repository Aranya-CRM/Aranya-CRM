import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  createClient,
  deleteClient,
  fetchClientById,
  fetchClientsAvailableForCase,
  fetchClients,
  restoreClient,
  updateClient,
} from '../api/client.api'
import type { Client } from '../types'
import type { ApprovalOptions, ClientWriteResult } from '../api/client.api'

export const clientQueryKeys = {
  all: ['clients'] as const,
  lists: () => [...clientQueryKeys.all, 'list'] as const,
  list: () => [...clientQueryKeys.lists()] as const,
  availableForCase: () => [...clientQueryKeys.lists(), 'available-for-case'] as const,
  details: () => [...clientQueryKeys.all, 'detail'] as const,
  detail: (id: string) => [...clientQueryKeys.details(), id] as const,
}

export function isClientResult(result: ClientWriteResult): result is Client {
  return 'nameEn' in result && 'abbr' in result
}

export function useClients() {
  return useQuery({
    queryKey: clientQueryKeys.list(),
    queryFn: fetchClients,
  })
}

export function useClientsAvailableForCase() {
  return useQuery({
    queryKey: clientQueryKeys.availableForCase(),
    queryFn: fetchClientsAvailableForCase,
  })
}

export function useClient(id: string | undefined) {
  return useQuery({
    queryKey: id ? clientQueryKeys.detail(id) : clientQueryKeys.details(),
    queryFn: () => fetchClientById(id!),
    enabled: Boolean(id),
  })
}

export function useCreateClient() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ data, approverId, reason }: { data: Omit<Client, 'id'> } & ApprovalOptions) =>
      createClient(data, { approverId, reason }),
    onSuccess: (client) => {
      queryClient.invalidateQueries({ queryKey: clientQueryKeys.lists() })
      if (!isClientResult(client)) {
        queryClient.invalidateQueries({ queryKey: ['approvals'] })
        return
      }
      queryClient.setQueryData(clientQueryKeys.detail(client.id), client)
    },
  })
}

export function useUpdateClient() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, data, approverId, reason }: { id: string; data: Partial<Client> } & ApprovalOptions) =>
      updateClient(id, data, { approverId, reason }),
    onSuccess: (client) => {
      queryClient.invalidateQueries({ queryKey: clientQueryKeys.lists() })
      if (!isClientResult(client)) {
        queryClient.invalidateQueries({ queryKey: ['approvals'] })
        return
      }
      queryClient.setQueryData(clientQueryKeys.detail(client.id), client)
    },
  })
}

export function useDeleteClient() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, approverId, reason }: { id: string } & ApprovalOptions) => deleteClient(id, { approverId, reason }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: clientQueryKeys.lists() })
      queryClient.invalidateQueries({ queryKey: ['cases'] })
      queryClient.invalidateQueries({ queryKey: ['approvals'] })
    },
  })
}

export function useRestoreClient() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, approverId, reason }: { id: string } & ApprovalOptions) => restoreClient(id, { approverId, reason }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: clientQueryKeys.lists() })
      queryClient.invalidateQueries({ queryKey: clientQueryKeys.availableForCase() })
      queryClient.invalidateQueries({ queryKey: ['cases'] })
      queryClient.invalidateQueries({ queryKey: clientQueryKeys.details() })
      queryClient.invalidateQueries({ queryKey: ['approvals'] })
    },
  })
}
