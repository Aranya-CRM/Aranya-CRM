import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import {
  AUDIT_ENTRY_MUTATION_POLICY,
  auditCategoryForEntry,
  buildAuditTrail,
  filterAuditTrail,
  isApprovalAuditableAction,
  summarizeAuditTrail,
} from '../src/features/audit-history/auditHistoryUtils.ts'
import type { AuditTrailEntry } from '../src/features/audit-history/types.ts'

const entries: AuditTrailEntry[] = [
  {
    id: 'ordinary-note',
    action: 'CASE_NOTE_CREATE',
    targetType: 'CASE',
    targetId: 'case-1',
    caseId: 'case-1',
    targetLabel: 'ASDFL/2026/C/003',
    actorName: 'Social Worker',
    occurredAt: '2026-07-10T03:00:00+08:00',
    approvalRequired: false,
    lifecycleStatus: 'active',
    decisionStatus: 'not_required',
    summary: '普通笔记创建',
  },
  {
    id: 'service-requested',
    action: 'CASE_SERVICE_UPDATE',
    targetType: 'CASE',
    targetId: 'case-1',
    caseId: 'case-1',
    targetLabel: 'ASDFL/2026/C/003',
    actorName: 'Social Worker',
    occurredAt: '2026-07-10T04:00:00+08:00',
    approvalRequired: true,
    lifecycleStatus: 'active',
    decisionStatus: 'pending',
    summary: '申请移除服务模块',
  },
  {
    id: 'file-archived',
    action: 'SENSITIVE_FILE_ARCHIVE',
    targetType: 'SENSITIVE_FILE',
    targetId: 'doc-7',
    caseId: 'case-1',
    targetLabel: 'fyfy',
    actorName: 'Manager',
    occurredAt: '2026-07-10T05:00:00+08:00',
    approvalRequired: true,
    lifecycleStatus: 'archived',
    decisionStatus: 'approved',
    summary: '归档敏感文件',
  },
]

describe('audit history utilities', () => {
  it('keeps approval and ordinary business operations and sorts newest first', () => {
    const result = buildAuditTrail(entries, { targetType: 'CASE', targetId: 'case-1' })

    assert.deepEqual(result.map((entry) => entry.id), ['file-archived', 'service-requested', 'ordinary-note'])
  })

  it('treats sensitive file replacement as versioned history, not physical deletion', () => {
    const result = buildAuditTrail([
      ...entries,
      {
        id: 'file-superseded',
        action: 'SENSITIVE_FILE_SUPERSEDE',
        targetType: 'SENSITIVE_FILE',
        targetId: 'doc-8',
        caseId: 'case-1',
        targetLabel: '产品.txt',
        actorName: 'Manager',
        occurredAt: '2026-07-10T06:00:00+08:00',
        approvalRequired: true,
        lifecycleStatus: 'superseded',
        decisionStatus: 'approved',
        summary: '被新版本取代',
        version: 2,
        previousVersionId: 'doc-6',
      },
    ], { targetType: 'CASE', targetId: 'case-1' })

    const summary = summarizeAuditTrail(result)
    assert.equal(summary.sensitiveFileEvents, 2)
    assert.equal(summary.archivedEvents, 1)
    assert.equal(summary.supersededEvents, 1)
  })

  it('never exposes edit or delete affordances for audit entries', () => {
    assert.equal(AUDIT_ENTRY_MUTATION_POLICY.businessUserCanEdit, false)
    assert.equal(AUDIT_ENTRY_MUTATION_POLICY.businessUserCanDelete, false)
    assert.equal(AUDIT_ENTRY_MUTATION_POLICY.adminCanEditThroughApp, false)
    assert.equal(AUDIT_ENTRY_MUTATION_POLICY.adminCanDeleteThroughApp, false)
  })

  it('recognizes all approval-backed operation types as auditable', () => {
    assert.equal(isApprovalAuditableAction('CASE_CREATE'), true)
    assert.equal(isApprovalAuditableAction('DELETE_CASE'), true)
    assert.equal(isApprovalAuditableAction('CASE_SERVICE_UPDATE'), true)
    assert.equal(isApprovalAuditableAction('SENSITIVE_FILE_ARCHIVE'), true)
    assert.equal(isApprovalAuditableAction('SENSITIVE_FILE_SUPERSEDE'), true)
    assert.equal(isApprovalAuditableAction('CASE_NOTE_CREATE'), false)
  })

  it('classifies audit entries so the UI can filter member, service, case, and file approvals', () => {
    assert.equal(auditCategoryForEntry({ ...entries[1], action: 'CASE_SERVICE_UPDATE' }), 'service')
    assert.equal(auditCategoryForEntry({ ...entries[1], action: 'DELETE_CASE' }), 'case')
    assert.equal(auditCategoryForEntry({ ...entries[1], action: 'DELETE_CLIENT', targetType: 'CLIENT' }), 'member')
    assert.equal(auditCategoryForEntry(entries[2]), 'file')
  })

  it('filters audit trail by category without changing the current sort order', () => {
    const result = filterAuditTrail(buildAuditTrail(entries, { targetType: 'CASE', targetId: 'case-1' }), 'file')

    assert.deepEqual(result.map((entry) => entry.id), ['file-archived'])
  })
})
