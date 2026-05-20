import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { createCase, fetchCaseById, fetchCaseNotes, fetchCases } from '../api/case.api'
import type { Case } from '../types'

export const caseQueryKeys = {
  all: ['cases'] as const,
  lists: () => [...caseQueryKeys.all, 'list'] as const,
  list: () => [...caseQueryKeys.lists()] as const,
  details: () => [...caseQueryKeys.all, 'detail'] as const,
  detail: (id: string) => [...caseQueryKeys.details(), id] as const,
}

export function useCases() {
  return useQuery({
    queryKey: caseQueryKeys.list(),
    queryFn: fetchCases,
  })
}

export function useCase(id: string | undefined) {
  return useQuery({
    queryKey: id ? caseQueryKeys.detail(id) : caseQueryKeys.details(),
    queryFn: () => fetchCaseById(id!),
    enabled: Boolean(id),
  })
}

export function useCaseNotes(caseId: string | undefined) {
  return useQuery({
    queryKey: caseId ? [...caseQueryKeys.detail(caseId), 'notes'] : ['cases', 'notes'],
    queryFn: () => fetchCaseNotes(caseId!),
    enabled: Boolean(caseId),
  })
}

export function useCreateCase() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: Omit<Case, 'id'>) => createCase(data),
    onSuccess: (item) => {
      queryClient.invalidateQueries({ queryKey: caseQueryKeys.lists() })
      queryClient.setQueryData(caseQueryKeys.detail(item.id), item)
    },
  })
}
