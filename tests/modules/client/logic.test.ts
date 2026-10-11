import { describe, expect, it } from 'vitest'
import { mapClientPayload, mapClientUpdatePayload, calculateEnrollmentDetails } from '../../../src/modules/client/logic'
import type { Client, BorrowerPlan } from '../../../src/modules/client/types'

const baseClient = (overrides: Partial<Client> = {}): Client =>
  ({
    entity_type: 'Borrower',
    status: 'active',
    city: 'Austin',
    business_city: 'Austin',
    country: 'United States',
    business_country: 'United States',
    ...overrides,
  }) as Client

describe('mapClientPayload — enrollment/billing construction (financial logic)', () => {
  it('sends no enrollment object at all when the client is on a free trial', () => {
    const payload = mapClientPayload(baseClient({ is_free_trail: true, plan_id: 5, amount: 800 } as any), true)
    expect(payload).not.toHaveProperty('enrollment')
  })

  it('recognizes legacy free-trial wire formats (1, "1", "true") the same as boolean true', () => {
    for (const legacyValue of [1, '1', 'true'] as any[]) {
      const payload = mapClientPayload(baseClient({ is_free_trail: legacyValue, plan_id: 5 } as any), true)
      expect(payload).not.toHaveProperty('enrollment')
    }
  })

  it('builds a one-time enrollment object for a host with an explicit plan/amount', () => {
    const payload = mapClientPayload(
      baseClient({ is_free_trail: false, plan_id: 3, enrollment_payment: '1200' } as any),
      true
    )
    expect(payload.enrollment).toMatchObject({ plan_id: 3, amount: 1200 })
    expect(payload.enrollment.down_payment).toBeUndefined()
  })

  it('builds an installment enrollment sub-object with down payment / remaining balance', () => {
    const payload = mapClientPayload(
      baseClient({
        is_free_trail: false,
        plan_id: 3,
        enrollment_type: 'Installment',
        enrollment_payment: '1000',
        installment_down_payment: 200,
        installment_months: 6,
        installment_monthly_amount: 133.33,
      } as any),
      true
    )
    expect(payload.enrollment).toMatchObject({
      amount: 1000,
      down_payment: 200,
      months: 6,
      monthly_amount: 133.33,
      remaining_balance: 800,
    })
  })

  it('falls back to the non-host plan default (or $800) when a non-host has no plan_id', () => {
    const nonHostPlan: BorrowerPlan = { total_amount: '650', enrollment_type: 'Fixed Enrollment' } as any
    const withPlan = mapClientPayload(baseClient({ is_free_trail: false } as any), false, nonHostPlan)
    expect(withPlan.enrollment.amount).toBe(650)
    expect(withPlan.enrollment.enrollment_type).toBe('Fixed Enrollment')

    const withoutPlan = mapClientPayload(baseClient({ is_free_trail: false } as any), false)
    expect(withoutPlan.enrollment.amount).toBe(800)
  })

  it('strips flat enrollment/billing fields from the top-level payload', () => {
    const payload = mapClientPayload(
      baseClient({ is_free_trail: false, plan_id: 1, amount: 500, installment_applied: true } as any),
      true
    )
    expect(payload).not.toHaveProperty('plan_id')
    expect(payload).not.toHaveProperty('amount')
    expect(payload).not.toHaveProperty('installment_applied')
  })

  it('normalizes date_of_birth from YYYY-MM-DD to MM-DD-YYYY', () => {
    const payload = mapClientPayload(baseClient({ is_free_trail: true, date_of_birth: '1990-05-15' } as any), true)
    expect(payload.date_of_birth).toBe('05-15-1990')
  })

  it('resolves an "Others" city selection to the free-text other_city value', () => {
    const payload = mapClientPayload(baseClient({ is_free_trail: true, city: 'Others', other_city: 'Round Rock' } as any), true)
    expect(payload.city).toBe('Round Rock')
  })
})

describe('mapClientUpdatePayload — free-trial-to-paid conversion', () => {
  it('adds no enrollment object when not converting from a free trial', () => {
    const payload = mapClientUpdatePayload(baseClient({ is_free_trail: false } as any), true, false)
    expect(payload).not.toHaveProperty('enrollment')
  })

  it('builds an enrollment object when converting a free-trial client to paid', () => {
    const payload = mapClientUpdatePayload(
      baseClient({ is_free_trail: false, plan_id: 2, enrollment_payment: '900' } as any),
      true,
      true // wasFreeTrial
    )
    expect(payload.enrollment).toMatchObject({ plan_id: 2, amount: 900 })
  })

  it('does not convert when is_free_trail is still truthy (including legacy formats)', () => {
    const payload = mapClientUpdatePayload(baseClient({ is_free_trail: '1' } as any), true, true)
    expect(payload).not.toHaveProperty('enrollment')
  })

  it('filters out empty bank account rows before sending', () => {
    const payload = mapClientUpdatePayload(
      baseClient({
        is_free_trail: false,
        bank_accounts: [
          { id: 1, bank_name: 'Chase' },
          { bank_name: '', account_open_date: '' },
        ],
      } as any),
      true
    )
    expect(payload.bank_accounts).toEqual([{ id: 1, bank_name: 'Chase' }])
  })
})

describe('calculateEnrollmentDetails', () => {
  it('treats a one-time plan as a single installment', () => {
    const result = calculateEnrollmentDetails({ total_amount: '500', enrollment_type: 'One Time Payment' } as any, true)
    expect(result).toEqual({ installments: 1, totalAmount: '500', price: 500, isOneTime: true })
  })

  it('defaults a host installment plan to 6 installments when not specified', () => {
    const result = calculateEnrollmentDetails({ total_amount: 1200, enrollment_type: 'Installment' } as any, true)
    expect(result.installments).toBe(6)
    expect(result.isOneTime).toBe(false)
  })

  it('defaults a non-host installment plan to 1 installment when not specified', () => {
    const result = calculateEnrollmentDetails({ total_amount: 1200, enrollment_type: 'Installment' } as any, false)
    expect(result.installments).toBe(1)
  })
})
