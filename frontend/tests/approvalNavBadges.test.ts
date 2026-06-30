import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { countApprovalNavBadges } from '../src/features/approvals/approvalNavBadges.ts'

describe('approval nav badges', () => {
  it('counts pending member and case approvals for the approver', () => {
    const counts = countApprovalNavBadges([
      { id: 1, type: 'CLIENT_CREATE', status: 'PENDING', requestedById: 10, assignedApproverId: 7 },
      { id: 2, type: 'DELETE_CLIENT', status: 'PENDING', requestedById: 11, assignedApproverId: 7 },
      { id: 3, type: 'CASE_CREATE', status: 'PENDING', requestedById: 12, assignedApproverId: 7 },
    ], 7)

    assert.deepEqual(counts, { clients: 2, cases: 1 })
  })

  it('does not count approved requests, own requests, or requests assigned to someone else', () => {
    const counts = countApprovalNavBadges([
      { id: 1, type: 'CLIENT_CREATE', status: 'APPROVED', requestedById: 10, assignedApproverId: 7 },
      { id: 2, type: 'DELETE_CLIENT', status: 'PENDING', requestedById: 7, assignedApproverId: 7 },
      { id: 3, type: 'CASE_CREATE', status: 'PENDING', requestedById: 12, assignedApproverId: 8 },
      { id: 4, type: 'CASE_SERVICE_UPDATE', status: 'PENDING', requestedById: 12, assignedApproverId: null },
    ], 7)

    assert.deepEqual(counts, { clients: 0, cases: 1 })
  })
})
