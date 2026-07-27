import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { countApprovalNavBadges } from '../src/features/approvals/approvalNavBadges.ts'

describe('approval nav badges', () => {
  it('counts pending member and case approvals for the approver', () => {
    const counts = countApprovalNavBadges([
      { id: 1, type: 'CLIENT_CREATE', status: 'PENDING', requestedById: 10, assignedApproverId: 7, payloadJson: '{}' },
      { id: 2, type: 'DELETE_CLIENT', status: 'PENDING', requestedById: 11, assignedApproverId: 7, payloadJson: '{}' },
      { id: 3, type: 'CASE_CREATE', status: 'PENDING', requestedById: 12, assignedApproverId: 7, payloadJson: '{}' },
    ], 7)

    assert.deepEqual(counts, { clients: 2, cases: 1 })
  })

  it('does not count approved requests, own requests, or requests assigned to someone else', () => {
    const counts = countApprovalNavBadges([
      { id: 1, type: 'CLIENT_CREATE', status: 'APPROVED', requestedById: 10, assignedApproverId: 7, payloadJson: '{}' },
      { id: 2, type: 'DELETE_CLIENT', status: 'PENDING', requestedById: 7, assignedApproverId: 7, payloadJson: '{}' },
      { id: 3, type: 'CASE_CREATE', status: 'PENDING', requestedById: 12, assignedApproverId: 8, payloadJson: '{}' },
      { id: 4, type: 'CASE_SERVICE_UPDATE', status: 'PENDING', requestedById: 12, assignedApproverId: null, payloadJson: '{}' },
    ], 7)

    assert.deepEqual(counts, { clients: 0, cases: 1 })
  })

  it('counts only allowed self-assigned manager approval types', () => {
    const counts = countApprovalNavBadges([
      { id: 1, type: 'CLIENT_CREATE', status: 'PENDING', requestedById: 7, assignedApproverId: 7, payloadJson: '{}' },
      { id: 2, type: 'CASE_CREATE', status: 'PENDING', requestedById: 7, assignedApproverId: 7, payloadJson: '{}' },
      {
        id: 3,
        type: 'CASE_SERVICE_UPDATE',
        status: 'PENDING',
        requestedById: 7,
        assignedApproverId: 7,
        payloadJson: '{"addServiceKeys":["legalAid"],"removeServiceKeys":[]}',
      },
      {
        id: 4,
        type: 'CASE_SERVICE_UPDATE',
        status: 'PENDING',
        requestedById: 7,
        assignedApproverId: 7,
        payloadJson: '{"addServiceKeys":[],"removeServiceKeys":["legalAid"]}',
      },
    ], 7)

    assert.deepEqual(counts, { clients: 1, cases: 2 })
  })
})
