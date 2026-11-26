/**
 * Rules for Underwriting Logic (Edit Lender > Underwriting Logic; it was a
 * funding sequence grid until 2026-11-26), kept out of the component so they
 * can be tested alone.
 */

import { lenderDisplayName, lenderOptionLabel, lenderOptionParts } from '../lender/displayName'

type Option = { label: string; value: string }

/**
 * The options not already picked in the other list - a state cannot be both
 * allowed and restricted (R2 BUG-010). The API refuses the overlap too.
 */
export const optionsWithout = <T extends Option>(options: T[], pickedElsewhere: string[] | null | undefined): T[] => {
  if (!pickedElsewhere || pickedElsewhere.length === 0) return options
  return options.filter(option => !pickedElsewhere.includes(option.value))
}

type LenderRef = { id: number | string; name: string; legal_name?: string | null; display_name?: string | null; lender_code?: string | null }
type Rule = { lender_id?: number | string | null; lender?: { id: number | string; name?: string; legal_name?: string | null; display_name?: string | null; lender_code?: string | null; status?: string } | null }

/**
 * The lender's name for a rule row. The active-lender list does not hold a
 * lender set to Inactive, so its rule showed "Unknown Lender" (R2 BUG-030);
 * the rule carries its own lender from the API, which is used instead.
 */
export const lenderLabelFor = (rule: Rule, activeLenders: LenderRef[]): { name: string; inactive: boolean } => {
  const active = activeLenders.find(l => String(l.id) === String(rule.lender_id))
  // "Lender Name - Legal Name" (R2 BUG-008): two lenders may share a name.
  if (active) return { name: lenderDisplayName(active), inactive: false }

  if (rule.lender?.name) {
    return { name: lenderDisplayName(rule.lender), inactive: rule.lender.status !== undefined && rule.lender.status !== 'Active' }
  }

  return { name: 'Unknown Lender', inactive: false }
}

/**
 * A "Filter by Lender" option. `name` ("Lender Name - Lender Code") is what the
 * dropdown search matches; the dropdown shows `lenderName` and `code` apart.
 */
export type LenderFilterOption = { id: number | string; name: string; lenderName: string; code: string | null; inactive: boolean }

const filterOption = (lender: LenderRef | NonNullable<Rule['lender']>, inactive: boolean): LenderFilterOption => {
  const { name, code } = lenderOptionParts(lender)
  return { id: lender.id, name: `${lenderOptionLabel(lender)}${inactive ? ' (Inactive)' : ''}`, lenderName: name, code, inactive }
}

/**
 * "Filter by Lender": the active lenders, then any inactive lender that still
 * has a rule here, tagged - so its rules can be found and fixed.
 */
export const lenderFilterOptions = (activeLenders: LenderRef[], rules: Rule[]): LenderFilterOption[] => {
  const options: LenderFilterOption[] = activeLenders.map(l => filterOption(l, false))
  const known = new Set(activeLenders.map(l => String(l.id)))

  rules.forEach(rule => {
    const lender = rule.lender
    if (!lender?.name || known.has(String(lender.id))) return
    known.add(String(lender.id))
    options.push(filterOption(lender, true))
  })

  return options
}
