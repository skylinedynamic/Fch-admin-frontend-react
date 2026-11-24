import { describe, expect, it } from 'vitest'
import { toApiColumnFilters } from '../../src/utils/columnFilters'

/**
 * R3-BUG-054: a DataTable date column filter holds a Date. Sent as JSON it
 * becomes a UTC ISO string, which east of UTC is the previous day - so the
 * filters go to the API with each date as the viewer's local "YYYY-MM-DD".
 */
describe('toApiColumnFilters', () => {
  it('sends a date constraint as the local calendar day', () => {
    const picked = new Date(2026, 10, 12) // local midnight, 12 Nov 2026

    const out = toApiColumnFilters({
      date: { operator: 'and', constraints: [{ value: picked, matchMode: 'dateIs' }] },
    })

    expect(out.date.constraints[0]).toEqual({ value: '2026-11-12', matchMode: 'dateIs' })
  })

  it('leaves text, number and empty constraints as they are', () => {
    const filters = {
      full_name: { operator: 'and', constraints: [{ value: 'QA-TEST Run2', matchMode: 'contains' }] },
      requested_amount: { operator: 'and', constraints: [{ value: 80000, matchMode: 'gte' }] },
      status: { operator: 'and', constraints: [{ value: null, matchMode: 'equals' }] },
      global: { value: null, matchMode: 'contains' },
    }

    expect(toApiColumnFilters(filters)).toEqual(filters)
  })

  it('does not change the filters it was given', () => {
    const picked = new Date(2026, 10, 12)
    const filters = { date: { operator: 'and', constraints: [{ value: picked, matchMode: 'dateIs' }] } }

    toApiColumnFilters(filters)

    expect(filters.date.constraints[0].value).toBe(picked)
  })

  it('handles no filters', () => {
    expect(toApiColumnFilters(undefined)).toEqual({})
    expect(toApiColumnFilters(null)).toEqual({})
  })
})
