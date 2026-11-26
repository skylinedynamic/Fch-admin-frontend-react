/**
 * Edit Lender > Underwriting Logic (moved from Funding Sequence, 2026-11-26).
 * A lender has one rule per funding type it offers; every funding sequence of
 * that funding type uses it. Kept out of the component so it can be tested alone.
 */

type Id = number | string

/** One rule: a funding type of the lender and what it requires. */
export interface UnderwritingRule {
  id?: number
  lender_product_category_id: number
  min_fico: number | string | null
  min_business_credit_score: number | string | null
  min_tib_months: number | string | null
  min_monthly_revenue: number | string | null
  min_monthly_deposits: number | string | null
  min_deposit_count: number | string | null
  min_average_daily_balance: number | string | null
  max_nsf_count: number | string | null
  max_negative_days: number | string | null
  min_dscr: number | string | null
  allowed_states: string[]
  restricted_states: string[]
  allowed_industries: string[]
  restricted_industries: string[]
}

const LIST_FIELDS = ['allowed_states', 'restricted_states', 'allowed_industries', 'restricted_industries'] as const

/** A new, empty rule for a funding type. */
export const blankRule = (fundingTypeId: number): UnderwritingRule => ({
  lender_product_category_id: fundingTypeId,
  min_fico: '',
  min_business_credit_score: '',
  min_tib_months: null,
  min_monthly_revenue: '',
  min_monthly_deposits: '',
  min_deposit_count: '',
  min_average_daily_balance: '',
  max_nsf_count: '',
  max_negative_days: '',
  min_dscr: '',
  allowed_states: [],
  restricted_states: [],
  allowed_industries: [],
  restricted_industries: [],
})

/** The tab's Funding Types: the lender's own, in its order, by name. */
export const fundingTypeOptions = (lenderFundingTypes: Id[] | null | undefined, categories: { id: Id; name: string }[]) =>
  (lenderFundingTypes || []).flatMap((id) => {
    const category = categories.find((c) => String(c.id) === String(id))
    return category ? [{ label: category.name, value: Number(category.id) }] : []
  })

/**
 * One row per funding type of the lender, in its order: a saved rule kept as
 * it is, an empty row for a funding type without one. A funding type taken
 * off the lender takes its row with it (its rule is removed on Update).
 * The same rows come back when nothing changed.
 */
export const rowsForFundingTypes = (rules: UnderwritingRule[], lenderFundingTypes: Id[] | null | undefined): UnderwritingRule[] => {
  const ids = Array.from(new Set((lenderFundingTypes || []).map(Number).filter((id) => !Number.isNaN(id))))
  const rows = ids.map((id) => rules.find((r) => Number(r.lender_product_category_id) === id) ?? blankRule(id))
  const same = rows.length === rules.length && rows.every((row, i) => row === rules[i])
  return same ? rules : rows
}

/**
 * The grid shows only the funding types picked in Funding Types: those with
 * logic to start with, and one picked without logic as an empty row to fill
 * in. Taking a type out only hides its row - each keeps its index, so its
 * edits, errors and save are unchanged.
 */
export const filterRows = (rows: UnderwritingRule[], picked: Id[]): { row: UnderwritingRule; index: number }[] => {
  const show = new Set(picked.map(Number))
  return rows
    .map((row, index) => ({ row, index }))
    .filter(({ row }) => show.has(Number(row.lender_product_category_id)))
}

/** The funding types that have logic (saved or filled in): shown to start with. */
export const configuredTypeIds = (rows: UnderwritingRule[]): number[] =>
  rows.filter((row) => row.id || !isRuleBlank(row)).map((row) => Number(row.lender_product_category_id))

/** Nothing filled in: the funding type has no underwriting logic. */
export const isRuleBlank = (rule: UnderwritingRule): boolean =>
  Object.entries(rule).every(([field, value]) => {
    if (field === 'id' || field === 'lender_product_category_id') return true
    if (Array.isArray(value)) return value.filter((v) => v !== '' && v !== null).length === 0
    return value === '' || value === null || value === undefined
  })

/**
 * The rows Update saves, and which row each one is: those filled in, and an
 * empty one that is shown (picked to add) - so its required fields are
 * refused with a message instead of the pick being dropped quietly.
 */
export const configuredRows = (rows: UnderwritingRule[], shownTypeIds: Id[] = []) => {
  const shown = new Set(shownTypeIds.map(Number))
  const indexes = rows.flatMap((row, index) =>
    (isRuleBlank(row) && !shown.has(Number(row.lender_product_category_id)) ? [] : [index]))
  return { rows: indexes.map((i) => rows[i]), indexes }
}

/** An API error on sent rule N (underwriting_logic.N.*) belongs to row indexes[N]. */
export const remapUnderwritingErrors = (errors: Record<string, any>, indexes: number[]): Record<string, any> =>
  Object.fromEntries(Object.entries(errors).map(([key, message]) => {
    const match = key.match(/^underwriting_logic\.(\d+)\.(.+)$/)
    const row = match ? indexes[Number(match[1])] : undefined
    return [row === undefined ? key : `underwriting_logic.${row}.${match![2]}`, message]
  }))

/** A rule from the API, made ready for the form (lists never null). */
export const ruleFromApi = (rule: any, stateName: (s: string) => string = (s) => s): UnderwritingRule => ({
  ...blankRule(Number(rule.lender_product_category_id)),
  ...rule,
  lender_product_category_id: Number(rule.lender_product_category_id),
  allowed_states: (rule.allowed_states || []).map(stateName),
  restricted_states: (rule.restricted_states || []).map(stateName),
  allowed_industries: rule.allowed_industries || [],
  restricted_industries: rule.restricted_industries || [],
})

/** What Update sends as underwriting_logic: empty fields null, lists without blanks, no ids. */
export const underwritingPayload = (rules: UnderwritingRule[]) =>
  rules.map(({ id: _id, ...rule }) => {
    const sent: Record<string, unknown> = {}
    Object.entries(rule).forEach(([field, value]) => {
      if ((LIST_FIELDS as readonly string[]).includes(field)) {
        sent[field] = ((value as string[]) || []).filter((v) => v !== null && v !== undefined && v !== '' && v !== 'null')
      } else {
        sent[field] = value === '' || value === undefined ? null : value
      }
    })
    return sent
  })

/**
 * The toast after Save / Update: what was actually saved - the lender, its
 * Underwriting Logic, or both. Rules are compared as sent (underwritingPayload).
 */
export const lenderSaveMessage = ({ isEdit, detailsChanged, rulesBefore, rulesAfter, fromUnderwriting = false }: {
  isEdit: boolean
  detailsChanged: boolean
  rulesBefore: Record<string, unknown>[]
  rulesAfter: Record<string, unknown>[]
  /** Update was pressed on the Underwriting Logic tab. */
  fromUnderwriting?: boolean
}): string => {
  if (!isEdit) return 'Lender created successfully'

  const rulesChanged = JSON.stringify(rulesBefore) !== JSON.stringify(rulesAfter)
  if (!rulesChanged) return fromUnderwriting && !detailsChanged ? 'Underwriting logic updated successfully' : 'Lender updated successfully'
  if (detailsChanged) return 'Lender and underwriting logic updated successfully'
  if (rulesBefore.length === 0) return 'Underwriting logic saved successfully'
  if (rulesAfter.length === 0) return 'Underwriting logic removed successfully'
  return 'Underwriting logic updated successfully'
}

/** The rows the API refused (errors keyed underwriting_logic.<row>.<field>). */
export const underwritingErrorIndexes = (errors: Record<string, unknown>): number[] =>
  Array.from(new Set(Object.keys(errors || {})
    .map((key) => key.match(/^underwriting_logic\.(\d+)\./)?.[1])
    .filter((i): i is string => i !== undefined)
    .map(Number)))
