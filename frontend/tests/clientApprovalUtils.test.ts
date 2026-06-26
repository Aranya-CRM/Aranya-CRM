import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { mergePendingApprovals, type ClientApprovalLike } from '../src/features/clients/pages/clientApprovalUtils.js'

describe('mergePendingApprovals', () => {
  it('drops old local client approvals that are absent from a newer server pending list', () => {
    const server: ClientApprovalLike[] = [
      { id: 10, type: 'CLIENT_UPDATE', targetId: 1 },
    ]
    const local: ClientApprovalLike[] = [
      { id: 10, type: 'CLIENT_UPDATE', targetId: 1 },
      { id: 11, type: 'DELETE_CLIENT', targetId: 2, createdAt: '2026-06-25T09:00:00.000Z' },
    ]

    assert.deepEqual(mergePendingApprovals(server, local, Date.parse('2026-06-25T10:00:00.000Z')).map((approval) => approval.id), [10])
  })

  it('keeps new local client approvals until a later server pending list confirms they are gone', () => {
    const local: ClientApprovalLike[] = [
      { id: 11, type: 'CLIENT_UPDATE', targetId: 2, createdAt: '2026-06-25T10:05:00.000Z' },
    ]

    assert.deepEqual(mergePendingApprovals([], local, Date.parse('2026-06-25T10:00:00.000Z')).map((approval) => approval.id), [11])
  })

  it('keeps local client approvals before the server pending list has loaded', () => {
    const local: ClientApprovalLike[] = [
      { id: 11, type: 'DELETE_CLIENT', targetId: 2 },
    ]

    assert.deepEqual(mergePendingApprovals([], local, 0).map((approval) => approval.id), [11])
  })
})
