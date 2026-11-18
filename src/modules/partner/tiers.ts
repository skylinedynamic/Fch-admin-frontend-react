/**
 * Partner profile › Commissions: Funding commission tiers (0-10, 11-20,
 * 21 and up), as the tier table edits them: counts may still be strings
 * while typed, and a blank end means "and up".
 */
export type TierRange = {
  min_count: number | string | null
  max_count: number | string | null
}

const toCount = (value: number | string | null | undefined): number | null => {
  if (value === null || value === undefined || value === '') return null
  const n = Number(value)
  return Number.isInteger(n) ? n : null
}

/** A new tier that starts right after the last one ends (blank if it can't tell). */
export const nextTierRow = <T extends Record<string, unknown>>(rows: TierRange[], template: T): T & TierRange => {
  if (rows.length === 0) {
    return { min_count: 0, max_count: '', ...template }
  }

  const lastMax = toCount(rows[rows.length - 1].max_count)

  return { min_count: lastMax === null ? '' : lastMax + 1, max_count: '', ...template }
}

/** Index of the tier holding deal #position (1-based), or -1. */
export const tierForPosition = (rows: TierRange[], position: number): number =>
  rows.findIndex((row) => {
    const min = toCount(row.min_count)
    const max = toCount(row.max_count)
    return min !== null && position >= min && (max === null || position <= max)
  })

/** "0–10", or "21+" for the open-ended last tier. */
export const tierRangeLabel = (row: TierRange): string => {
  const max = toCount(row.max_count)
  return max === null ? `${row.min_count}+` : `${row.min_count}–${max}`
}

/** A count as the API takes it: a whole number, or null when blank. */
export const tierCountValue = toCount

/**
 * Commission type Flat Amount: a flat $ for the deal as the partner's share
 * (%) of its success fee ($), to the hundredth and at most `max` (the admin
 * keeps at least 1%). 0 while there is no success fee to share.
 */
export const flatCommissionRate = (amount: number, successFeeAmount: number, max = 100): number => {
  if (!Number.isFinite(amount) || !Number.isFinite(successFeeAmount) || successFeeAmount <= 0 || amount <= 0) return 0
  return Math.min(max, +((amount / successFeeAmount) * 100).toFixed(2))
}
