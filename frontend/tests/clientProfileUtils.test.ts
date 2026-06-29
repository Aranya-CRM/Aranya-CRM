import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import {
  applyClientCaseFilter,
  calculateCompletedYears,
  countActiveClientFilters,
  deriveClientDateFields,
  mapBackendClientResponse,
  type ClientCaseFilter,
  type ClientDateFields,
} from '../src/features/clients/pages/clientProfileUtils.ts'

describe('client profile date utilities', () => {
  const referenceDate = new Date('2026-06-29T12:00:00+08:00')

  it('calculates completed years from birth and ordination dates', () => {
    assert.equal(calculateCompletedYears('1956-12-03', referenceDate), 69)
    assert.equal(calculateCompletedYears('2014-11-04', referenceDate), 11)
  })

  it('derives age and ordination years from editable date fields', () => {
    const fields: ClientDateFields = {
      dateOfBirth: '1956-12-03',
      dateOfOrdination: '2014-11-04',
    }

    assert.deepEqual(deriveClientDateFields(fields, referenceDate), {
      age: 69,
      ordinationYears: 11,
    })
  })
})

describe('client case filters', () => {
  const clients = [
    { id: '1', abbr: 'VXA' },
    { id: '2', abbr: 'VKB' },
    { id: '3', abbr: 'VKC' },
  ]
  const withoutCaseIds = new Set(['2'])

  it('returns only clients with an active case when the case filter is with_case', () => {
    assert.deepEqual(
      applyClientCaseFilter(clients, withoutCaseIds, 'with_case' satisfies ClientCaseFilter).map((client) => client.abbr),
      ['VXA', 'VKC'],
    )
  })

  it('returns only clients without an active case when the case filter is without_case', () => {
    assert.deepEqual(
      applyClientCaseFilter(clients, withoutCaseIds, 'without_case' satisfies ClientCaseFilter).map((client) => client.abbr),
      ['VKB'],
    )
  })

  it('counts active directory filters for the collapsed filter button', () => {
    assert.equal(countActiveClientFilters('all', 'all'), 0)
    assert.equal(countActiveClientFilters('Mahayana', 'all'), 1)
    assert.equal(countActiveClientFilters('Mahayana', 'without_case'), 2)
  })
})

describe('backend client mapping', () => {
  it('maps a direct PATCH client detail response into the frontend Client shape', () => {
    const mapped = mapBackendClientResponse({
      id: 12,
      abbr: 'VXA',
      nameEn: 'Venerable Xian Ai Updated',
      nameChn: '显碍师父',
      ordinationCertificateStatus: 'Completed',
      dateOfBirth: '1956-12-03',
      dateOfOrdination: '2014-11-04',
      buddhistTradition: 'Mahayana',
      wellbeingPhysicalHealth: true,
      specialNeeds: 'hearing,visual',
    }, new Date('2026-06-29T12:00:00+08:00'))

    assert.equal(mapped.id, '12')
    assert.equal(mapped.nameEn, 'Venerable Xian Ai Updated')
    assert.equal(mapped.ordinationCertificate, 'Completed')
    assert.equal(mapped.age, 69)
    assert.equal(mapped.ordinationYears, 11)
    assert.equal(mapped.wellbeingIssues.physicalHealth, true)
    assert.equal(mapped.specialNeeds.hearing, true)
    assert.equal(mapped.specialNeeds.visual, true)
  })
})
