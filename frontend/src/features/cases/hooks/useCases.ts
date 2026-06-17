import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { createCase, createCaseNote, createServiceEvent, deleteCase, deleteCaseNote, deleteServiceEvent, fetchCaseAuditLog, fetchCaseById, fetchCaseFlags, fetchCaseNotes, fetchCases, updateCase, updateCaseServices } from '../api/case.api'
import type { CreateCaseNotePayload, CreateCasePayload, CreateServiceEventPayload, UpdateCasePayload } from '../api/case.api'
import type { CaseServices } from '../types'

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

export function useOwnCaseNotes(caseId: string | undefined) {
  return useQuery({
    queryKey: caseId ? [...caseQueryKeys.detail(caseId), 'notes', 'mine'] : ['cases', 'notes', 'mine'],
    queryFn: () => fetchCaseNotes(caseId!, true),
    enabled: Boolean(caseId),
  })
}

export function useCreateCaseNote() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: CreateCaseNotePayload) => createCaseNote(data),
    onSuccess: (_item, variables) => {
      queryClient.invalidateQueries({ queryKey: [...caseQueryKeys.detail(variables.caseId), 'notes'] })
      queryClient.invalidateQueries({ queryKey: [...caseQueryKeys.detail(variables.caseId), 'notes', 'mine'] })
    },
  })
}

export function useDeleteCaseNote(caseId: string | undefined) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (noteId: string) => deleteCaseNote(caseId!, noteId),
    onSuccess: () => {
      if (!caseId) return
      queryClient.invalidateQueries({ queryKey: [...caseQueryKeys.detail(caseId), 'notes'] })
      queryClient.invalidateQueries({ queryKey: [...caseQueryKeys.detail(caseId), 'notes', 'mine'] })
    },
  })
}

export function useCaseAuditLog(caseId: string | undefined) {
  return useQuery({
    queryKey: caseId ? [...caseQueryKeys.detail(caseId), 'audit-log'] : ['cases', 'audit-log'],
    queryFn: () => fetchCaseAuditLog(caseId!),
    enabled: Boolean(caseId),
  })
}

export function useCaseFlags(caseId: string | undefined) {
  return useQuery({
    queryKey: caseId ? [...caseQueryKeys.detail(caseId), 'flags'] : ['cases', 'flags'],
    queryFn: () => fetchCaseFlags(caseId!),
    enabled: Boolean(caseId),
  })
}

export function useCreateCase() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: CreateCasePayload) => createCase(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: caseQueryKeys.lists() })
    },
  })
}

export function useDeleteCase() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: string) => deleteCase(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: caseQueryKeys.lists() })
    },
  })
}

export function useUpdateCaseServices(caseId: string | undefined) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (services: Array<keyof CaseServices>) => updateCaseServices(caseId!, services),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: caseQueryKeys.lists() })
      if (!caseId) return
      queryClient.invalidateQueries({ queryKey: caseQueryKeys.detail(caseId) })
    },
  })
}

export function useCreateServiceEvent(caseId: string | undefined) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: CreateServiceEventPayload) => createServiceEvent(caseId!, data),
    onSuccess: () => {
      if (!caseId) return
      queryClient.invalidateQueries({ queryKey: caseQueryKeys.detail(caseId) })
    },
  })
}

export function useDeleteServiceEvent(caseId: string | undefined) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (eventId: string | number) => deleteServiceEvent(caseId!, eventId),
    onSuccess: () => {
      if (!caseId) return
      queryClient.invalidateQueries({ queryKey: caseQueryKeys.detail(caseId) })
    },
  })
}

export function useUpdateCase() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateCasePayload }) => updateCase(id, data),
    onSuccess: (item) => {
      queryClient.invalidateQueries({ queryKey: caseQueryKeys.lists() })
      queryClient.setQueryData(caseQueryKeys.detail(item.id), item)
    },
  })
}
