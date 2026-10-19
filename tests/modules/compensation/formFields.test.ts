import { describe, expect, it } from 'vitest'
import { buildCompensationRows, compensationRowsToFields } from '../../../src/modules/compensation/formFields'

describe('buildCompensationRows', () => {
  it('returns no rows when nothing (or None) is selected', () => {
    expect(buildCompensationRows({})).toEqual([])
    expect(buildCompensationRows({ paid_by: 'None' })).toEqual([])
  })

  it('builds a single amount row for Hourly', () => {
    expect(buildCompensationRows({ paid_by: 'Hourly', hourly_rate: 25 })).toEqual([{ amount: 25 }])
  })

  it('builds a single amount row for Salary', () => {
    expect(buildCompensationRows({ paid_by: 'Salary', annual_salary: '60000' })).toEqual([{ amount: '60000' }])
  })

  it('uses null rather than undefined for a missing amount', () => {
    expect(buildCompensationRows({ paid_by: 'Hourly' })).toEqual([{ amount: null }])
  })

  it('Per Deal / All services / Commission takes the percentage', () => {
    const rows = buildCompensationRows({
      paid_by: 'Per Deal',
      per_deal_applicable_services: ['All'],
      per_deal_payout_type: 'Commission',
      per_deal_percentage: 10,
      per_deal_flat_amount: 999,
    })
    expect(rows).toEqual([{ service: 'All', payout_type: 'Commission', amount: 10 }])
  })

  it('Per Deal / All services / Flat Amount takes the flat amount', () => {
    const rows = buildCompensationRows({
      paid_by: 'Per Deal',
      per_deal_applicable_services: ['All'],
      per_deal_payout_type: 'Flat Amount',
      per_deal_percentage: 10,
      per_deal_flat_amount: 500,
    })
    expect(rows).toEqual([{ service: 'All', payout_type: 'Flat Amount', amount: 500 }])
  })

  it('"All" wins even when other services are also ticked', () => {
    const rows = buildCompensationRows({
      paid_by: 'Per Deal',
      per_deal_applicable_services: ['Credit Builder', 'All'],
      per_deal_payout_type: 'Commission',
      per_deal_percentage: 5,
    })
    expect(rows).toHaveLength(1)
    expect(rows[0].service).toBe('All')
  })

  it('builds one row per service from its own keyed fields', () => {
    const rows = buildCompensationRows({
      paid_by: 'Per Deal',
      per_deal_applicable_services: ['Credit Builder', 'Funding'],
      per_deal_payout_type_credit_builder: 'Commission',
      per_deal_percentage_credit_builder: 7,
      per_deal_payout_type_funding: 'Flat Amount',
      per_deal_flat_amount_funding: 250,
    })
    expect(rows).toEqual([
      { service: 'Credit Builder', payout_type: 'Commission', amount: 7 },
      { service: 'Funding', payout_type: 'Flat Amount', amount: 250 },
    ])
  })

  it('keeps a row for a ticked service with nothing filled in, so the selection survives a save', () => {
    const rows = buildCompensationRows({ paid_by: 'Per Deal', per_deal_applicable_services: ['Funding'] })
    expect(rows).toEqual([{ service: 'Funding', payout_type: null, amount: null }])
  })

  it('returns no rows for Per Deal with no services ticked', () => {
    expect(buildCompensationRows({ paid_by: 'Per Deal' })).toEqual([])
  })
})

describe('compensationRowsToFields', () => {
  const blank = {
    hourly_rate: '',
    annual_salary: '',
    per_deal_applicable_services: [],
    per_deal_payout_type: '',
    per_deal_percentage: '',
    per_deal_flat_amount: '',
  }

  it('returns blank fields for no compensation', () => {
    expect(compensationRowsToFields(null)).toEqual({ paid_by: '', ...blank })
    expect(compensationRowsToFields('None', [])).toEqual({ paid_by: 'None', ...blank })
  })

  it('maps an Hourly row to hourly_rate', () => {
    expect(compensationRowsToFields('Hourly', [{ amount: 25 }])).toEqual({ paid_by: 'Hourly', ...blank, hourly_rate: 25 })
  })

  it('maps a Salary row to annual_salary', () => {
    expect(compensationRowsToFields('Salary', [{ amount: 60000 }])).toEqual({ paid_by: 'Salary', ...blank, annual_salary: 60000 })
  })

  it('leaves the amount blank when Hourly has no row yet', () => {
    expect(compensationRowsToFields('Hourly', []).hourly_rate).toBe('')
  })

  it('maps an All-services commission row to the shared percentage field', () => {
    const fields = compensationRowsToFields('Per Deal', [{ service: 'All', payout_type: 'Commission', amount: 10 }])
    expect(fields).toMatchObject({
      per_deal_applicable_services: ['All'],
      per_deal_payout_type: 'Commission',
      per_deal_percentage: 10,
      per_deal_flat_amount: '',
    })
  })

  it('maps an All-services flat row to the shared flat amount field', () => {
    const fields = compensationRowsToFields('Per Deal', [{ service: 'All', payout_type: 'Flat Amount', amount: 500 }])
    expect(fields).toMatchObject({ per_deal_payout_type: 'Flat Amount', per_deal_flat_amount: 500, per_deal_percentage: '' })
  })

  it('maps per-service rows to their own keyed fields', () => {
    const fields = compensationRowsToFields('Per Deal', [
      { service: 'Credit Builder', payout_type: 'Commission', amount: 7 },
      { service: 'Funding', payout_type: 'Flat Amount', amount: 250 },
    ])
    expect(fields.per_deal_applicable_services).toEqual(['Credit Builder', 'Funding'])
    expect(fields.per_deal_payout_type_credit_builder).toBe('Commission')
    expect(fields.per_deal_percentage_credit_builder).toBe(7)
    expect(fields.per_deal_payout_type_funding).toBe('Flat Amount')
    expect(fields.per_deal_flat_amount_funding).toBe(250)
  })

  it('drops rows that carry no service from the selection', () => {
    const fields = compensationRowsToFields('Per Deal', [{ payout_type: 'Commission', amount: 1 }, { service: 'Funding', payout_type: null, amount: null }])
    expect(fields.per_deal_applicable_services).toEqual(['Funding'])
  })
})

describe('round trip', () => {
  it.each([
    ['Hourly', { paid_by: 'Hourly', hourly_rate: 30 }],
    ['Salary', { paid_by: 'Salary', annual_salary: 80000 }],
    ['Per Deal - All', { paid_by: 'Per Deal', per_deal_applicable_services: ['All'], per_deal_payout_type: 'Commission', per_deal_percentage: 12 }],
    ['Per Deal - per service', {
      paid_by: 'Per Deal',
      per_deal_applicable_services: ['Credit Builder'],
      per_deal_payout_type_credit_builder: 'Flat Amount',
      per_deal_flat_amount_credit_builder: 100,
    }],
  ])('form -> rows -> form keeps what was entered (%s)', (_label, form) => {
    const rows = buildCompensationRows(form)
    const back = compensationRowsToFields(form.paid_by, rows)
    expect(back).toMatchObject(form)
  })
})
