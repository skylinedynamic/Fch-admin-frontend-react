import { describe, expect, it } from 'vitest'
import { checkSeatLimit } from '../../src/utils/seatLimit'

/**
 * One rule for "can another login be added?", used by the Users page and by
 * the employee form's "Create account": under the limit a user can be added;
 * at the limit a partner on a free trial is told it is a paid feature, and
 * anyone else is offered a seat to buy.
 */
const partner = { entity_type: 'Partner' }
const employeeLogin = { entity_type: 'App\\Models\\Employee\\Employee' }
const freeTrial = { is_free_trail: true, user_seats: 3 }
const paid = { is_free_trail: false, user_seats: 3 }

describe('checkSeatLimit', () => {
  it('allows another user while seats are left', () => {
    expect(checkSeatLimit({ count: 2, seat_limit: 3, per_user_price: 49 }, partner, paid)).toEqual({
      status: 'available', count: 2, limit: 3, price: 49,
    })
  })

  it('tells a partner on a free trial that more seats are a paid feature', () => {
    expect(checkSeatLimit({ count: 3, seat_limit: 3, per_user_price: 49 }, partner, freeTrial).status).toBe('free_trial')
  })

  it('offers a seat to buy to a partner on a paid plan', () => {
    expect(checkSeatLimit({ count: 3, seat_limit: 3, per_user_price: 49 }, partner, paid)).toEqual({
      status: 'purchase', count: 3, limit: 3, price: 49,
    })
  })

  it('offers a seat to buy when the signed-in user is not the partner itself', () => {
    expect(checkSeatLimit({ count: 3, seat_limit: 3 }, employeeLogin, freeTrial).status).toBe('purchase')
  })

  it('falls back to user_seats, then the subscription, then 3', () => {
    expect(checkSeatLimit({ count: 4, user_seats: 5 }, partner, paid).limit).toBe(5)
    expect(checkSeatLimit({ count: 1 }, partner, { user_seats: 7 }).limit).toBe(7)
    expect(checkSeatLimit({ count: 1 }, partner, null).limit).toBe(3)
  })

  it('reads string numbers and a missing count as zero', () => {
    expect(checkSeatLimit({ count: '3', seat_limit: '3' }, partner, paid).status).toBe('purchase')
    expect(checkSeatLimit({}, partner, paid)).toMatchObject({ status: 'available', count: 0 })
  })
})
