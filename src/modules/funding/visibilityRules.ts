/**
 * Rules for a funding sequence's Underwriting Logic grid (a lender's
 * visibility rules), kept out of the component so they can be tested alone.
 */

/** The FICO scale the API enforces on Min FICO (App\Rules\FicoScore) - R2 BUG-011. */
export const FICO_MIN = 300
export const FICO_MAX = 850

type Option = { label: string; value: string }

/**
 * The options not already picked in the other list - a state cannot be both
 * allowed and restricted (R2 BUG-012). The API refuses the overlap too.
 */
export const optionsWithout = <T extends Option>(options: T[], pickedElsewhere: string[] | null | undefined): T[] => {
  if (!pickedElsewhere || pickedElsewhere.length === 0) return options
  return options.filter(option => !pickedElsewhere.includes(option.value))
}

type LenderRef = { id: number | string; name: string }
type Rule = { lender_id?: number | string | null; lender?: { id: number | string; name?: string; status?: string } | null }

/**
 * The lender's name for a rule row. The active-lender list does not hold a
 * lender set to Inactive, so its rule showed "Unknown Lender" (R2 BUG-038);
 * the rule carries its own lender from the API, which is used instead.
 */
export const lenderLabelFor = (rule: Rule, activeLenders: LenderRef[]): { name: string; inactive: boolean } => {
  const active = activeLenders.find(l => String(l.id) === String(rule.lender_id))
  if (active) return { name: active.name, inactive: false }

  if (rule.lender?.name) {
    return { name: rule.lender.name, inactive: rule.lender.status !== undefined && rule.lender.status !== 'Active' }
  }

  return { name: 'Unknown Lender', inactive: false }
}

/**
 * "Filter by Lender": the active lenders, then any inactive lender that still
 * has a rule here, tagged - so its rules can be found and fixed.
 */
export const lenderFilterOptions = (activeLenders: LenderRef[], rules: Rule[]): LenderRef[] => {
  const options = [...activeLenders]
  const known = new Set(activeLenders.map(l => String(l.id)))

  rules.forEach(rule => {
    const lender = rule.lender
    if (!lender?.name || known.has(String(lender.id))) return
    known.add(String(lender.id))
    options.push({ id: lender.id, name: `${lender.name} (Inactive)` })
  })

  return options
}
