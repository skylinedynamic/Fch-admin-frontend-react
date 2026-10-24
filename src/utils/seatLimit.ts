import { ENTITY_TYPE_PARTNER } from '../config/appConfig'

/** What /common/user-count answers (the fields this rule reads). */
export type SeatCount = {
  count?: number | string | null
  seat_limit?: number | string | null
  user_seats?: number | string | null
  per_user_price?: number | string | null
}

export type SeatLimitStatus =
  /** A seat is free: the user can be added. */
  | 'available'
  /** At the limit on a free trial: more seats are a paid feature, none can be bought. */
  | 'free_trial'
  /** At the limit on a paid plan: a seat can be bought. */
  | 'purchase'

export type SeatLimitCheck = {
  status: SeatLimitStatus
  count: number
  limit: number
  price: number
}

const DEFAULT_SEAT_LIMIT = 3

const toNumber = (value: unknown): number => {
  const n = Number(value)
  return Number.isFinite(n) ? n : 0
}

/**
 * Whether another login can be added - one rule for the Users page's Add User
 * and the employee form's "Create account", so the two never disagree.
 */
export function checkSeatLimit(
  seats: SeatCount | null | undefined,
  user: { entity_type?: string | null } | null | undefined,
  subscription: { is_free_trail?: boolean | number | null; user_seats?: number | string | null } | null | undefined,
): SeatLimitCheck {
  const count = toNumber(seats?.count)
  const limit = toNumber(seats?.seat_limit || seats?.user_seats || subscription?.user_seats || DEFAULT_SEAT_LIMIT)
  const price = toNumber(seats?.per_user_price)

  if (count < limit) {
    return { status: 'available', count, limit, price }
  }

  const isFreeTrialPartner = user?.entity_type === ENTITY_TYPE_PARTNER && !!subscription?.is_free_trail

  return { status: isFreeTrialPartner ? 'free_trial' : 'purchase', count, limit, price }
}
