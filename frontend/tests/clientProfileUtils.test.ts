import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import {
  applyClientCaseFilter,
  applyClientGenderFilter,
  applyClientOrdinationStatusFilter,
  applyClientStatusFilter,
  calculateCompletedYears,
  countActiveClientFilters,
  deriveClientDateFields,
  isClientClosed,
  mapBackendClientResponse,
  profileActionGroups,
  sortClientDirectory,
  type ClientArchiveFilter,
  type ClientCaseFilter,
  type ClientDirectorySort,
  type ClientGenderFilter,
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
    { id: '1', abbr: 'VXA', membershipStatus: 'ACTIVE' },
    { id: '2', abbr: 'VKB', membershipStatus: 'ACTIVE' },
    { id: '3', abbr: 'VKC', membershipStatus: 'ACTIVE' },
    { id: '4', abbr: 'VKD', membershipStatus: 'CLOSED' },
  ]
  const withCaseIds = new Set(['1', '3', '4'])

  it('returns only clients with an active case when the case filter is with_case', () => {
    assert.deepEqual(
      applyClientCaseFilter(clients, withCaseIds, 'with_case' satisfies ClientCaseFilter).map((client) => client.abbr),
      ['VXA', 'VKC', 'VKD'],
    )
  })

  it('returns only clients without an active case when the case filter is without_case', () => {
    assert.deepEqual(
      applyClientCaseFilter(clients, withCaseIds, 'without_case' satisfies ClientCaseFilter).map((client) => client.abbr),
      ['VKB'],
    )
  })

  it('returns current or closed clients from the status filter', () => {
    assert.deepEqual(
      applyClientStatusFilter(clients, 'current' satisfies ClientArchiveFilter).map((client) => client.abbr),
      ['VXA', 'VKB', 'VKC'],
    )
    assert.deepEqual(
      applyClientStatusFilter(clients, 'closed' satisfies ClientArchiveFilter).map((client) => client.abbr),
      ['VKD'],
    )
  })

  it('counts active directory filters for the collapsed filter button', () => {
    assert.equal(countActiveClientFilters([], 'all', 'current'), 0)
    assert.equal(countActiveClientFilters(['Mahayana'], 'all', 'current'), 1)
    assert.equal(countActiveClientFilters(['Mahayana'], 'without_case', 'current'), 2)
    assert.equal(countActiveClientFilters(['Mahayana'], 'without_case', 'closed'), 3)
    assert.equal(countActiveClientFilters(['Mahayana'], 'without_case', 'closed', 'Female', ['Bhikkhuni'], 'age_desc'), 6)
    // 同一组多选仍按“该组是否激活”计一次
    assert.equal(countActiveClientFilters(['Mahayana', 'Theravada'], 'all', 'current', 'all', ['Bhikkhu', 'Bhikkhuni']), 2)
  })

  it('filters clients by gender and ordination status', () => {
    const fullClients = [
      { id: '1', abbr: 'VXA', gender: 'Female', ordinationStatus: 'Bhikkhuni' },
      { id: '2', abbr: 'VKB', gender: 'Male', ordinationStatus: 'Bhikkhu' },
      { id: '3', abbr: 'VKC', gender: 'Female', ordinationStatus: 'Samaneri' },
    ]

    assert.deepEqual(
      applyClientGenderFilter(fullClients, 'Female' satisfies ClientGenderFilter).map((client) => client.abbr),
      ['VXA', 'VKC'],
    )
    assert.deepEqual(
      applyClientOrdinationStatusFilter(fullClients, ['Bhikkhu']).map((client) => client.abbr),
      ['VKB'],
    )
    // 多选取并集(OR)
    assert.deepEqual(
      applyClientOrdinationStatusFilter(fullClients, ['Bhikkhu', 'Samaneri']).map((client) => client.abbr),
      ['VKB', 'VKC'],
    )
    // 空数组表示不筛选
    assert.deepEqual(
      applyClientOrdinationStatusFilter(fullClients, []).map((client) => client.abbr),
      ['VXA', 'VKB', 'VKC'],
    )
  })

  it('sorts clients by age or ordination years while keeping missing values last', () => {
    const sortableClients = [
      { id: '1', abbr: 'A', age: 62, ordinationYears: 24, dateOfBirth: '1964-01-01', dateOfOrdination: '2002-01-01' },
      { id: '2', abbr: 'B', age: 48, ordinationYears: 8, dateOfBirth: '1978-01-01', dateOfOrdination: '2018-01-01' },
      { id: '3', abbr: 'C', age: 70, ordinationYears: 8, dateOfBirth: '1956-01-01', dateOfOrdination: '2018-01-01' },
      { id: '4', abbr: 'D', age: 0, ordinationYears: 0, dateOfBirth: '', dateOfOrdination: '' },
    ]

    assert.deepEqual(
      sortClientDirectory(sortableClients, 'age_asc' satisfies ClientDirectorySort).map((client) => client.abbr),
      ['B', 'A', 'C', 'D'],
    )
    assert.deepEqual(
      sortClientDirectory(sortableClients, 'ordination_years_desc' satisfies ClientDirectorySort).map((client) => client.abbr),
      ['A', 'B', 'C', 'D'],
    )
  })
})

describe('client closed profile behavior', () => {
  it('maps closed membership status and treats legacy deleted profiles as closed', () => {
    assert.equal(isClientClosed({ id: '1', membershipStatus: 'CLOSED' }), true)
    assert.equal(isClientClosed({ id: '2', membershipStatus: 'DELETED' }), true)
    assert.equal(isClientClosed({ id: '3', membershipStatus: 'ACTIVE' }), false)
  })

  it('separates frequent edit action from secondary close and convert actions', () => {
    assert.deepEqual(profileActionGroups({
      canEdit: true,
      canConvertToCase: true,
      canCloseProfile: true,
      canCloseCase: false,
      closed: false,
    }), {
      primary: ['editProfile'],
      secondary: ['convertToCase', 'closeProfile'],
    })
  })

  it('hides all profile actions for closed clients', () => {
    assert.deepEqual(profileActionGroups({
      canEdit: true,
      canConvertToCase: true,
      canCloseProfile: true,
      canCloseCase: true,
      closed: true,
    }), {
      primary: [],
      secondary: [],
    })
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
      gender: 'F',
      membershipStatus: 'CLOSED',
      wellbeingPhysicalHealth: true,
      specialNeeds: 'hearing,visual',
    }, new Date('2026-06-29T12:00:00+08:00'))

    assert.equal(mapped.id, '12')
    assert.equal(mapped.nameEn, 'Venerable Xian Ai Updated')
    assert.equal(mapped.ordinationCertificate, 'Completed')
    assert.equal(mapped.gender, 'Female')
    assert.equal(mapped.age, 69)
    assert.equal(mapped.ordinationYears, 11)
    assert.equal(mapped.membershipStatus, 'CLOSED')
    assert.equal(mapped.wellbeingIssues.physicalHealth, true)
    assert.equal(mapped.specialNeeds.hearing, true)
    assert.equal(mapped.specialNeeds.visual, true)
  })
})
