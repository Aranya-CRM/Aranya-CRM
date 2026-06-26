import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '../../../contexts/AuthContext'
import { removeLocalPendingApproval, useLocalPendingApprovals } from '../../../shared/approvals/localPendingApprovals'
import { useAccess } from '../../../shared/auth'
import { PageHeader } from '../../../shared/ui'
import { useApproveRequest, usePendingApprovals, useRejectRequest } from '../../approvals/api/approval.api'
import { useUsers } from '../../users/hooks/useUsers'
import {
  CaseTable,
  CaseToolbar,
  type CaseListRow,
} from '../components'
import { useCases } from '../hooks'
import type { Case, CaseColorCode, CaseStatus } from '../types'
import { mergePendingCaseApprovals, staleLocalCaseApprovalIds } from './caseApprovalUtils'
import './cases.css'

const COLOR_ORDER: Record<CaseColorCode, number> = {
  RED: 1,
  ORANGE: 2,
  YELLOW: 3,
  GREEN: 4,
  GREY: 5,
  BLACK: 6,
}

interface CaseApprovalView {
  id: number
  type: string
  targetId?: number | string | null
  targetLabel?: string | null
  payloadJson?: string | null
  requestedById?: number | null
  requestedByName?: string | null
  assignedApproverId?: number | null
  createdAt?: string | null
}

export function CaseListPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const { resolve } = useAccess()
  const { user } = useAuth()
  const { data: cases = [], isLoading } = useCases()
  const { data: users = [] } = useUsers()
  const { data: pendingApprovals = [], dataUpdatedAt: pendingApprovalsUpdatedAt } = usePendingApprovals()
  const localPendingApprovals = useLocalPendingApprovals()
  const approveRequest = useApproveRequest()
  const rejectRequest = useRejectRequest()
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const selectedApprovalId = searchParams.get('approval')

  const caseApprovalItems = useMemo(() => {
    return mergePendingCaseApprovals(pendingApprovals, localPendingApprovals, pendingApprovalsUpdatedAt)
  }, [localPendingApprovals, pendingApprovals, pendingApprovalsUpdatedAt])

  const userNameById = useMemo(() => {
    return new Map(users.map((item) => [String(item.id), item.fullName || item.username || item.email || String(item.id)]))
  }, [users])

  useEffect(() => {
    if (pendingApprovalsUpdatedAt <= 0) return
    staleLocalCaseApprovalIds(pendingApprovals, localPendingApprovals, pendingApprovalsUpdatedAt).forEach(removeLocalPendingApproval)
  }, [localPendingApprovals, pendingApprovals, pendingApprovalsUpdatedAt])

  const pendingCloseApprovalByCaseId = useMemo(() => {
    const map = new Map<string, CaseApprovalView>()
    caseApprovalItems
      .filter((approval) => approval.type === 'DELETE_CASE' && approval.targetId != null)
      .forEach((approval) => {
        const caseId = String(approval.targetId)
        if (!map.has(caseId)) map.set(caseId, approval)
      })
    return map
  }, [caseApprovalItems])

  const createApprovalRows = useMemo(() => {
    return caseApprovalItems
      .filter((approval) => approval.type === 'CASE_CREATE')
      .map((approval) => toPendingCreateCaseRow(approval, userNameById))
  }, [caseApprovalItems, userNameById])

  const rows = useMemo(() => {
    return [
      ...createApprovalRows,
      ...cases.map((item) => toCaseListRow(item, pendingCloseApprovalByCaseId.get(item.id))),
    ].sort((a, b) => {
      const colorDiff = COLOR_ORDER[a.colorCode] - COLOR_ORDER[b.colorCode]
      if (colorDiff !== 0) return colorDiff
      return b.dateOpened.localeCompare(a.dateOpened)
    })
  }, [cases, createApprovalRows, pendingCloseApprovalByCaseId])

  const statuses = useMemo(() => unique(rows.map((item) => item.status)), [rows])

  const filteredRows = useMemo(() => {
    const q = search.trim().toLowerCase()

    return rows.filter((item) => {
      const matchesSearch =
        !q ||
        item.caseNo.toLowerCase().includes(q) ||
        (item.clientAbbr ?? '').toLowerCase().includes(q) ||
        item.clientNameChn.includes(q) ||
        item.clientNameEn.toLowerCase().includes(q)
      const matchesStatus = statusFilter === 'all' || item.status === statusFilter
      return matchesSearch && matchesStatus
    })
  }, [rows, search, statusFilter])

  const selectedCreateApproval = useMemo(() => {
    if (!selectedApprovalId) return undefined
    return caseApprovalItems.find((approval) => (
      approval.type === 'CASE_CREATE' && String(approval.id) === selectedApprovalId
    ))
  }, [caseApprovalItems, selectedApprovalId])

  const serverSelectedCreateApproval = selectedCreateApproval
    ? pendingApprovals.find((approval) => approval.id === selectedCreateApproval.id)
    : undefined

  return (
    <div className="case-page">
      <PageHeader
        title={t('nav.cases')}
        subtitle={t('cases.list.count', { count: filteredRows.length })}
        actions={resolve('cases:create') ? (
          <button className="btn-primary" type="button" onClick={() => navigate('/cases/new')}>
            {t('cases.list.newCase')}
          </button>
        ) : undefined}
      />

      <CaseToolbar
        search={search}
        status={statusFilter}
        statuses={statuses}
        onSearchChange={setSearch}
        onStatusChange={setStatusFilter}
      />

      <CaseTable
        cases={filteredRows}
        loading={isLoading}
        onView={(caseId) => {
          if (caseId.startsWith('approval:')) {
            setSearchParams({ approval: caseId.slice('approval:'.length) })
            return
          }
          navigate(`/cases/${caseId}`)
        }}
      />

      {selectedCreateApproval ? (
        <CaseApprovalDetailPanel
          approval={selectedCreateApproval}
          userNameById={userNameById}
          canDecideApproval={canDecideApproval(serverSelectedCreateApproval, user?.id)}
          deciding={approveRequest.isPending || rejectRequest.isPending}
          onApprove={() => serverSelectedCreateApproval ? void approveRequest.mutateAsync({ id: serverSelectedCreateApproval.id, data: {} }) : undefined}
          onReject={() => serverSelectedCreateApproval ? void rejectRequest.mutateAsync({ id: serverSelectedCreateApproval.id, data: {} }) : undefined}
        />
      ) : null}
    </div>
  )
}

function toCaseListRow(item: Case, pendingApproval?: CaseApprovalView): CaseListRow {
  return {
    id: item.id,
    caseNo: item.caseNo.replaceAll('_', '/'),
    dateOpened: item.dateOpened,
    lastModifiedAt: item.lastModifiedAt,
    clientAbbr: item.clientAbbr,
    clientNameChn: item.clientNameChn,
    clientNameEn: item.clientNameEn,
    tradition: item.tradition,
    socialWorker: item.socialWorker,
    status: item.status,
    colorCode: item.colorCode,
    approvalOperation: pendingApproval ? 'close' : undefined,
  }
}

function toPendingCreateCaseRow(approval: CaseApprovalView, userNameById: Map<string, string>): CaseListRow {
  const payload = parseApprovalPayload(approval.payloadJson)
  const clientId = stringValue(payload.clientId ?? approval.targetId)
  const targetLabel = approval.targetLabel?.trim()
  const openedAt = stringValue(payload.openedAt) || approval.createdAt?.slice(0, 10) || ''
  const socialWorkerId = stringValue(payload.socialWorkerId)
  return {
    id: `approval:${approval.id}`,
    caseNo: tFallbackTarget(targetLabel, clientId),
    dateOpened: openedAt,
    lastModifiedAt: approval.createdAt ?? openedAt,
    clientAbbr: targetLabel || (clientId ? `Client #${clientId}` : undefined),
    clientNameChn: '',
    clientNameEn: '',
    tradition: '',
    socialWorker: resolveUserName(socialWorkerId, userNameById),
    status: (stringValue(payload.status) as CaseStatus | undefined) ?? 'OPEN',
    colorCode: normalizeColorCode(stringValue(payload.colorCode)),
    approvalOperation: 'create',
  }
}

function CaseApprovalDetailPanel({
  approval,
  userNameById,
  canDecideApproval,
  deciding,
  onApprove,
  onReject,
}: {
  approval: CaseApprovalView
  userNameById: Map<string, string>
  canDecideApproval: boolean
  deciding: boolean
  onApprove: () => void
  onReject: () => void
}) {
  const { t } = useTranslation()
  const payload = parseApprovalPayload(approval.payloadJson)
  const services = Array.isArray(payload.services) ? payload.services.map(String) : []
  const socialWorkerId = stringValue(payload.socialWorkerId)
  const comments = stringValue(payload.comments)
  const remarks = stringValue(payload.remarks)
  return (
    <section className="case-approval-detail-panel">
      <div className="case-approval-detail-header">
        <div>
          <h2>{t('cases.approvals.createCase')}</h2>
          <p>{approval.targetLabel ?? tFallbackTarget(undefined, stringValue(payload.clientId ?? approval.targetId))}</p>
        </div>
        <span className="case-approval-badge create">{t('cases.approvals.badge.create')}</span>
      </div>
      <dl className="case-approval-detail-grid">
        <div>
          <dt>{t('approvals.fields.requestedBy')}</dt>
          <dd>{approval.requestedByName ?? '-'}</dd>
        </div>
        <div>
          <dt>{t('approvals.fields.createdAt')}</dt>
          <dd>{formatDateTime(approval.createdAt)}</dd>
        </div>
        <div>
          <dt>{t('cases.form.openedAt')}</dt>
          <dd>{stringValue(payload.openedAt) || '-'}</dd>
        </div>
        <div>
          <dt>{t('cases.form.status')}</dt>
          <dd>{stringValue(payload.status) || '-'}</dd>
        </div>
        <div>
          <dt>{t('cases.form.caseworker')}</dt>
          <dd>{resolveUserName(socialWorkerId, userNameById)}</dd>
        </div>
        <div>
          <dt>{t('cases.form.intensity')}</dt>
          <dd>{stringValue(payload.colorCode) || '-'}</dd>
        </div>
        <div className="wide">
          <dt>{t('cases.form.comments')}</dt>
          <dd>{comments || '-'}</dd>
        </div>
        <div className="wide">
          <dt>{t('cases.form.remarks')}</dt>
          <dd>{remarks || '-'}</dd>
        </div>
      </dl>
      <details className="case-approval-reason">
        <summary>{t('cases.approvals.reason')}</summary>
        <p>{approvalReason(payload) || t('cases.approvals.noReason')}</p>
      </details>
      {services.length > 0 ? (
        <div className="case-approval-service-list">
          {services.map((serviceKey) => (
            <span key={serviceKey} className="case-service-chip">{t(`cases.service.${serviceKey}`, { defaultValue: serviceKey })}</span>
          ))}
        </div>
      ) : null}
      {canDecideApproval ? (
        <div className="case-approval-detail-actions">
          <button className="btn-secondary" type="button" disabled={deciding} onClick={onReject}>
            {t('approvals.reject')}
          </button>
          <button className="btn-primary" type="button" disabled={deciding} onClick={onApprove}>
            {t('approvals.approve')}
          </button>
        </div>
      ) : null}
    </section>
  )
}

function canDecideApproval(approval: CaseApprovalView | undefined, currentUserId: number | undefined) {
  if (!approval || currentUserId === undefined) return false
  if (approval.requestedById === currentUserId) return false
  return approval.assignedApproverId == null || approval.assignedApproverId === currentUserId
}

function parseApprovalPayload(payloadJson?: string | null): Record<string, unknown> {
  if (!payloadJson) return {}
  try {
    const parsed = JSON.parse(payloadJson)
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed as Record<string, unknown> : {}
  } catch {
    return {}
  }
}

function approvalReason(payload: Record<string, unknown>): string {
  const meta = payload._approval
  if (!meta || typeof meta !== 'object' || Array.isArray(meta)) return ''
  const reason = (meta as Record<string, unknown>).reason
  return typeof reason === 'string' ? reason.trim() : ''
}

function formatDateTime(value?: string | null): string {
  if (!value) return '-'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')} ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`
}

function normalizeColorCode(value?: string): CaseColorCode {
  const normalized = value?.toUpperCase()
  if (normalized === 'RED' || normalized === 'ORANGE' || normalized === 'YELLOW' || normalized === 'GREEN' || normalized === 'GREY' || normalized === 'BLACK') {
    return normalized
  }
  return 'GREEN'
}

function stringValue(value: unknown): string | undefined {
  if (value === undefined || value === null) return undefined
  return String(value)
}

function resolveUserName(userId: string | undefined, userNameById: Map<string, string>) {
  if (!userId) return '-'
  return userNameById.get(userId) ?? userId
}

function tFallbackTarget(targetLabel?: string, clientId?: string) {
  if (targetLabel) return targetLabel
  return clientId ? `Client #${clientId}` : '-'
}

function unique<T extends string>(items: T[]): T[] {
  return Array.from(new Set(items))
}
