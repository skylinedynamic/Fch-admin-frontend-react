import { describe, expect, it } from 'vitest'
import { filterLenders } from '../../../../src/components/Common/Lender/lenderFilter'
import type { MatchedLender } from '../../../../src/modules/application/types'

/**
 * Lender Information search and filters (funding request and funding
 * application pages): a search finds what the table shows, whichever way the
 * lenders were matched - one funding type (from a funding request) or several
 * (a loan application's Preferred + Additional Funding Types).
 */
const lender = (overrides: Partial<MatchedLender>): MatchedLender => ({
  id: 1,
  name: 'Fundbox Financing',
  phone: '(888) 555-0102',
  email: 'deals@fundbox.example',
  product_category: 'Term Loan',
  requirements: { min_fico: 450, min_business_credit_score: null, min_revenue: 4500, min_tib: 6, min_deposit: 2700 },
  checks: { fico: true, business_credit: true, revenue: true, tib: true, deposit: false },
  score: 75,
  score_text: 'Good Match',
  score_hex: '#d97706',
  matches_fraction: '3/4',
  ...overrides,
})

const lenders = [
  lender({ id: 1 }),
  lender({ id: 2, name: 'LendingClub', phone: '(888) 555-0105', email: 'deals@lendingclub.example', product_category: 'Business Line of Credit', requirements: { min_fico: 650, min_business_credit_score: null, min_revenue: 10000, min_tib: 24, min_deposit: null }, score: 100, score_text: 'Excellent Match', matches_fraction: '4/4' }),
  lender({ id: 3, name: 'Balboa Capital', phone: '(888) 555-0106', email: 'deals@balboa.example', product_category: 'Equipment Financing' }),
]

const none = { search: '', category: '', lenderName: '' }
const ids = (list: MatchedLender[]) => list.map((l) => l.id)

describe('filterLenders', () => {
  it('shows every lender with no filters', () => {
    expect(ids(filterLenders(lenders, none))).toEqual([1, 2, 3])
  })

  it('searches the category case-insensitively, ignoring extra spaces', () => {
    expect(ids(filterLenders(lenders, { ...none, search: '  term LOAN ' }))).toEqual([1])
  })

  it('needs every word of the search somewhere in the row', () => {
    expect(ids(filterLenders(lenders, { ...none, search: 'line credit' }))).toEqual([2])
    // A typo matches nothing rather than something wrong.
    expect(ids(filterLenders(lenders, { ...none, search: 'term load' }))).toEqual([])
  })

  it('finds requirements as the table shows them', () => {
    expect(ids(filterLenders(lenders, { ...none, search: '$10,000+' }))).toEqual([2])
    expect(ids(filterLenders(lenders, { ...none, search: '24 mo' }))).toEqual([2])
    expect(ids(filterLenders(lenders, { ...none, search: '650+' }))).toEqual([2])
  })

  it('finds the match analysis and contact', () => {
    expect(ids(filterLenders(lenders, { ...none, search: 'excellent' }))).toEqual([2])
    expect(ids(filterLenders(lenders, { ...none, search: '555-0106' }))).toEqual([3])
  })

  it('filters by category and by lender, combined with the search', () => {
    expect(ids(filterLenders(lenders, { ...none, category: 'Equipment Financing' }))).toEqual([3])
    expect(ids(filterLenders(lenders, { ...none, lenderName: 'LendingClub' }))).toEqual([2])
    expect(ids(filterLenders(lenders, { search: 'fundbox', category: 'Equipment Financing', lenderName: '' }))).toEqual([])
  })
})

// R2 BUG-008: two lenders may share a name; each is shown, filtered and
// searched as "Lender Name - Legal Name".
describe('filterLenders - lenders that share a name', () => {
  const kabbage = [
    lender({ id: 5, name: 'Kabbage', legal_name: 'Kabbage Inc.', display_name: 'Kabbage - Kabbage Inc.' }),
    lender({ id: 6, name: 'Kabbage', legal_name: 'Kabbage Funding LLC', display_name: 'Kabbage - Kabbage Funding LLC' }),
  ]

  it('filters to the one lender chosen by its display name', () => {
    expect(ids(filterLenders(kabbage, { ...none, lenderName: 'Kabbage - Kabbage Funding LLC' }))).toEqual([6])
  })

  it('finds a lender by its legal name', () => {
    expect(ids(filterLenders(kabbage, { ...none, search: 'funding llc' }))).toEqual([6])
  })
})
