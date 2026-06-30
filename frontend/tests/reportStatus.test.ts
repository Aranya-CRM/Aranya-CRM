import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { isCurrentReportStatus, isSubmittedReport, reportStatusKey } from '../src/features/reports/reportStatus.ts'

describe('report status helpers', () => {
  it('keeps report status display on the two current statuses', () => {
    assert.equal(reportStatusKey('DRAFT'), 'DRAFT')
    assert.equal(reportStatusKey('SUBMITTED'), 'SUBMITTED')
    assert.equal(reportStatusKey(null), 'SUBMITTED')
    assert.equal(reportStatusKey('unexpected'), 'SUBMITTED')
  })

  it('filters persisted reports to draft and submitted statuses only', () => {
    assert.equal(isCurrentReportStatus('DRAFT'), true)
    assert.equal(isCurrentReportStatus('SUBMITTED'), true)
    assert.equal(isCurrentReportStatus(null), true)
    assert.equal(isCurrentReportStatus('unexpected'), false)
  })

  it('treats only submitted reports as visible on case report tabs', () => {
    assert.equal(isSubmittedReport('SUBMITTED'), true)
    assert.equal(isSubmittedReport(null), true)
    assert.equal(isSubmittedReport('DRAFT'), false)
    assert.equal(isSubmittedReport('unexpected'), false)
  })
})
