import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { createCase, createServiceEvent, deleteCase, deleteCaseDocument, deleteServiceEvent, fetchCaseById, fetchCaseDocumentDownloadUrl, fetchCaseDocuments, fetchCases, restoreCase, syncServiceEvent, updateCase, updateCaseParticipants, updateCaseServices, updateServiceEvent, uploadCaseDocument } from '../api/case.api'
import type { ApprovalOptions, CaseDocumentUrlDisposition, CreateCasePayload, CreateServiceEventPayload, UpdateCasePayload, UploadCaseDocumentPayload } from '../api/case.api'
import type { AssignmentUser, Case, CaseServices } from '../types'
import { auditHistoryQueryKeys } from '../../audit-history/api'

type CaseDocumentUrlRequest = number | { documentId: number; disposition?: CaseDocumentUrlDisposition }

export const caseQueryKeys = {
  all: ['cases'] as const,
  lists: () => [...caseQueryKeys.all, 'list'] as const,
  list: () => [...caseQueryKeys.lists()] as const,
  details: () => [...caseQueryKeys.all, 'detail'] as const,
  detail: (id: string) => [...caseQueryKeys.details(), id] as const,
  documents: (id: string) => [...caseQueryKeys.detail(id), 'documents'] as const,
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

export function useCaseDocuments(caseId: string | undefined) {
  return useQuery({
    queryKey: caseId ? caseQueryKeys.documents(caseId) : ['cases', 'documents'],
    queryFn: () => fetchCaseDocuments(caseId!),
    enabled: Boolean(caseId),
  })
}

export function useUploadCaseDocument(caseId: string | undefined) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: Omit<UploadCaseDocumentPayload, 'caseId'>) => uploadCaseDocument({ ...data, caseId: caseId! }),
    onSuccess: () => {
      if (!caseId) return
      queryClient.invalidateQueries({ queryKey: caseQueryKeys.documents(caseId) })
      queryClient.invalidateQueries({ queryKey: auditHistoryQueryKeys.case(caseId) })
    },
  })
}

export function useCaseDocumentDownloadUrl(caseId: string | undefined) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (request: CaseDocumentUrlRequest) => {
      const documentId = typeof request === 'number' ? request : request.documentId
      const disposition = typeof request === 'number' ? 'attachment' : request.disposition
      return fetchCaseDocumentDownloadUrl(caseId!, documentId, disposition)
    },
    onSuccess: () => {
      if (!caseId) return
      queryClient.invalidateQueries({ queryKey: auditHistoryQueryKeys.case(caseId) })
    },
  })
}

export function useDeleteCaseDocument(caseId: string | undefined) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (documentId: number) => deleteCaseDocument(caseId!, documentId),
    onSuccess: () => {
      if (!caseId) return
      queryClient.invalidateQueries({ queryKey: caseQueryKeys.documents(caseId) })
      queryClient.invalidateQueries({ queryKey: auditHistoryQueryKeys.case(caseId) })
    },
  })
}

export function useCreateCase() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ data, approverId, reason }: { data: CreateCasePayload } & ApprovalOptions) =>
      createCase(data, { approverId, reason }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: caseQueryKeys.lists() })
      queryClient.invalidateQueries({ queryKey: ['approvals'] })
    },
  })
}

export function useDeleteCase() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, approverId, reason }: { id: string } & ApprovalOptions) => deleteCase(id, { approverId, reason }),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: caseQueryKeys.lists() })
      queryClient.invalidateQueries({ queryKey: ['approvals'] })
      queryClient.invalidateQueries({ queryKey: auditHistoryQueryKeys.case(variables.id) })
    },
  })
}

export function useRestoreCase() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, approverId, reason }: { id: string } & ApprovalOptions) => restoreCase(id, { approverId, reason }),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: caseQueryKeys.lists() })
      queryClient.invalidateQueries({ queryKey: caseQueryKeys.details() })
      queryClient.invalidateQueries({ queryKey: ['approvals'] })
      queryClient.invalidateQueries({ queryKey: auditHistoryQueryKeys.case(variables.id) })
    },
  })
}

export function useUpdateCaseServices(caseId: string | undefined) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ services, approverId, reason }: { services: Array<keyof CaseServices> } & ApprovalOptions) =>
      updateCaseServices(caseId!, services, { approverId, reason }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: caseQueryKeys.lists() })
      queryClient.invalidateQueries({ queryKey: ['approvals'] })
      if (!caseId) return
      queryClient.invalidateQueries({ queryKey: caseQueryKeys.detail(caseId) })
      queryClient.invalidateQueries({ queryKey: auditHistoryQueryKeys.case(caseId) })
    },
  })
}

export function useUpdateCaseParticipants(caseId: string | undefined) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (userIds: Array<string | number>) => updateCaseParticipants(caseId!, userIds),
    onSuccess: (participants: AssignmentUser[]) => {
      queryClient.invalidateQueries({ queryKey: caseQueryKeys.lists() })
      if (!caseId) return
      queryClient.setQueryData<Case | undefined>(caseQueryKeys.detail(caseId), (current) => (
        current ? { ...current, participantUsers: participants } : current
      ))
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
      queryClient.invalidateQueries({ queryKey: auditHistoryQueryKeys.case(caseId) })
    },
  })
}

export function useUpdateServiceEvent(caseId: string | undefined) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ eventId, data }: { eventId: string | number; data: CreateServiceEventPayload }) =>
      updateServiceEvent(caseId!, eventId, data),
    onSuccess: () => {
      if (!caseId) return
      queryClient.invalidateQueries({ queryKey: caseQueryKeys.detail(caseId) })
      queryClient.invalidateQueries({ queryKey: auditHistoryQueryKeys.case(caseId) })
    },
  })
}

export function useSyncServiceEvent(caseId: string | undefined) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (eventId: string | number) => syncServiceEvent(caseId!, eventId),
    onSuccess: () => {
      if (!caseId) return
      queryClient.invalidateQueries({ queryKey: caseQueryKeys.detail(caseId) })
      queryClient.invalidateQueries({ queryKey: auditHistoryQueryKeys.case(caseId) })
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
      queryClient.invalidateQueries({ queryKey: auditHistoryQueryKeys.case(caseId) })
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
      queryClient.invalidateQueries({ queryKey: auditHistoryQueryKeys.case(item.id) })
    },
  })
}
