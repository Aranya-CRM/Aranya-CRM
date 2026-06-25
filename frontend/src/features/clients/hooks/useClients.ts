import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  createClient,
  deleteClient,
  fetchClientById,
  fetchClients,
  updateClient,
} from '../api/client.api'
import type { Client } from '../types'
import type { ApprovalOptions, ClientWriteResult } from '../api/client.api'

export const clientQueryKeys = {
  all: ['clients'] as const,
  lists: () => [...clientQueryKeys.all, 'list'] as const,
  list: () => [...clientQueryKeys.lists()] as const,
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
      if (!isClientResult(client)) return
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
      if (!isClientResult(client)) return
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
    },
  })
}
