/**
 * Words for the codes the underwriting agent writes into its output.
 *
 * The agent names fields by path ("borrower.full_name",
 * "derived.monthly_operating_cash_flow_stress_test") and sources by code
 * ("BORROWER_REPORTED", "NOT_PROVIDED"). Neither is meant for a person to
 * read (BUG-061; same helper as the borrower portal), so anything shaped like one is turned into words; ordinary
 * text - names, amounts, sentences, "FICO", "U.S." - is left exactly as written.
 */

const SOURCE_LABELS: Record<string, string> = {
  BORROWER_REPORTED: 'Borrower Reported',
  DERIVED_FROM_SUPPLIED_DATA: 'Derived Data',
  NOT_PROVIDED: 'Not Provided',
}

/** "borrower.full_name": lower-case segments joined by dots. */
const FIELD_PATH = /^[a-z][a-z0-9_]*(\.[a-z0-9_]+)+$/

/** "NOT_PROVIDED": upper-case words joined by underscores (a lone "FICO" is not one). */
const SOURCE_CODE = /^[A-Z][A-Z0-9]*(_[A-Z0-9]+)+$/

const titleCase = (words: string): string =>
  words
    .toLowerCase()
    .replace(/_+/g, ' ')
    .trim()
    .replace(/\b\w/g, c => c.toUpperCase())

export const readableLabel = (text: string | null | undefined): string => {
  if (text == null) return ''
  const value = text.trim()

  if (FIELD_PATH.test(value)) {
    return titleCase(value.slice(value.lastIndexOf('.') + 1))
  }

  if (SOURCE_CODE.test(value)) {
    return SOURCE_LABELS[value] ?? titleCase(value)
  }

  return text
}
