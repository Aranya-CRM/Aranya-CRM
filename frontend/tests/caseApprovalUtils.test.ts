import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { mergePendingCaseApprovals, type CaseApprovalLike } from '../src/features/cases/pages/caseApprovalUtils.js'

describe('mergePendingCaseApprovals', () => {
  it('drops old local case approvals that are absent from a newer server pending list', () => {
    const server: CaseApprovalLike[] = [
      { id: 10, type: 'CASE_CREATE', targetId: 1 },
    ]
    const local: CaseApprovalLike[] = [
      { id: 10, type: 'CASE_CREATE', targetId: 1 },
      { id: 11, type: 'DELETE_CASE', targetId: 2, createdAt: '2026-06-25T09:00:00.000Z' },
    ]

    assert.deepEqual(mergePendingCaseApprovals(server, local, Date.parse('2026-06-25T10:00:00.000Z')).map((approval) => approval.id), [10])
  })

  it('keeps new local case approvals until a later server pending list confirms they are gone', () => {
    const local: CaseApprovalLike[] = [
      { id: 11, type: 'DELETE_CASE', targetId: 2, createdAt: '2026-06-25T10:05:00.000Z' },
    ]

    assert.deepEqual(mergePendingCaseApprovals([], local, Date.parse('2026-06-25T10:00:00.000Z')).map((approval) => approval.id), [11])
  })

  it('keeps local case approvals before the server pending list has loaded', () => {
    const local: CaseApprovalLike[] = [
      { id: 11, type: 'CASE_CREATE', targetId: 2 },
    ]

    assert.deepEqual(mergePendingCaseApprovals([], local, 0).map((approval) => approval.id), [11])
  })
})
