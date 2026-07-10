import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { selectedServiceForMode, selectedServicesForMode, serviceSelectionsForMode } from '../src/features/cases/components/caseServiceRequestUtils.ts'

describe('serviceSelectionsForMode', () => {
  it('keeps only add selections in add mode', () => {
    assert.deepEqual(serviceSelectionsForMode('add', ['housing'], ['food']), {
      servicesToAdd: ['housing'],
      servicesToRemove: [],
    })
  })

  it('keeps only remove selections in remove mode', () => {
    assert.deepEqual(serviceSelectionsForMode('remove', ['housing'], ['food']), {
      servicesToAdd: [],
      servicesToRemove: ['food'],
    })
  })

  it('builds a single-service add request from a dropdown selection', () => {
    assert.deepEqual(selectedServiceForMode('add', 'housing'), {
      servicesToAdd: ['housing'],
      servicesToRemove: [],
    })
  })

  it('builds a single-service remove request from a dropdown selection', () => {
    assert.deepEqual(selectedServiceForMode('remove', 'food'), {
      servicesToAdd: [],
      servicesToRemove: ['food'],
    })
  })

  it('ignores an empty dropdown selection', () => {
    assert.deepEqual(selectedServiceForMode('add', ''), {
      servicesToAdd: [],
      servicesToRemove: [],
    })
  })

  it('builds a multi-service remove request from checked services', () => {
    assert.deepEqual(selectedServicesForMode('remove', ['housing', 'food']), {
      servicesToAdd: [],
      servicesToRemove: ['housing', 'food'],
    })
  })
})
