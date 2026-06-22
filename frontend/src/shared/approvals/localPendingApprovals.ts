import { useEffect, useState } from 'react'

export interface LocalPendingApproval {
  id: number
  type: string
  status?: string
  targetType?: string | null
  targetId?: number | string | null
  targetLabel?: string | null
  payloadJson?: string | null
  createdAt?: string | null
}

const STORAGE_KEY = 'aranya.localPendingApprovals'
const EVENT_NAME = 'aranya:local-pending-approvals'

export function addLocalPendingApproval(approval: LocalPendingApproval): void {
  if (typeof window === 'undefined') return
  const next = [
    { ...approval, status: approval.status ?? 'PENDING', createdAt: approval.createdAt ?? new Date().toISOString() },
    ...readLocalPendingApprovals().filter((item) => item.id !== approval.id),
  ]
  writeLocalPendingApprovals(next)
}

export function removeLocalPendingApproval(id: number): void {
  if (typeof window === 'undefined') return
  writeLocalPendingApprovals(readLocalPendingApprovals().filter((item) => item.id !== id))
}

export function useLocalPendingApprovals(targetType?: string, targetId?: number | string) {
  const [approvals, setApprovals] = useState(() => filterApprovals(readLocalPendingApprovals(), targetType, targetId))

  useEffect(() => {
    function sync() {
      setApprovals(filterApprovals(readLocalPendingApprovals(), targetType, targetId))
    }

    sync()
    window.addEventListener(EVENT_NAME, sync)
    window.addEventListener('storage', sync)
    return () => {
      window.removeEventListener(EVENT_NAME, sync)
      window.removeEventListener('storage', sync)
    }
  }, [targetType, targetId])

  return approvals
}

function filterApprovals(approvals: LocalPendingApproval[], targetType?: string, targetId?: number | string) {
  return approvals.filter((approval) => {
    if (approval.status && approval.status !== 'PENDING') return false
    if (targetType && approval.targetType !== targetType) return false
    if (targetId !== undefined && String(approval.targetId) !== String(targetId)) return false
    return true
  })
}

function readLocalPendingApprovals(): LocalPendingApproval[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function writeLocalPendingApprovals(approvals: LocalPendingApproval[]): void {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(approvals.slice(0, 80)))
  window.dispatchEvent(new Event(EVENT_NAME))
}
