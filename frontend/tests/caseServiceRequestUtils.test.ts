import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { serviceSelectionsForMode } from '../src/features/cases/components/caseServiceRequestUtils.js'

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
})
