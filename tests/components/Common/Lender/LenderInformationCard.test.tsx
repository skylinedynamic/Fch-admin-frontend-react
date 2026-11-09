import { describe, expect, it, vi } from 'vitest'
import userEvent from '@testing-library/user-event'
import { fireEvent, renderWithProviders, screen, waitFor, within } from '../../../test-utils'
import LenderInformationCard from '../../../../src/components/Common/Lender/LenderInformationCard'
import type { MatchedLender } from '../../../../src/modules/application/types'

/**
 * Lender Information (funding request and funding application details pages,
 * host only): the matched lenders, live search, Assign with a confirm dialog,
 * and - once the lender is fixed - just that lender as a card.
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
  lender({ id: 2, name: 'LendingClub', phone: null, email: null, product_category: 'Business Line of Credit', requirements: { min_fico: null, min_business_credit_score: null, min_revenue: null, min_tib: null, min_deposit: null }, score: 100, score_text: 'Excellent Match', matches_fraction: '4/4' }),
]

const rowFor = (name: string) => screen.getByText(name).closest('tr') as HTMLElement

describe('LenderInformationCard', () => {
  it('lists every matched lender with its requirements', () => {
    renderWithProviders(<LenderInformationCard lenders={lenders} assignedLenderIds={[]} subjectLabel="funding application" onAssign={vi.fn()} />)

    const fundbox = rowFor('Fundbox Financing')
    expect(within(fundbox).getByText('450+')).toBeInTheDocument()
    expect(within(fundbox).getByText('$4,500+')).toBeInTheDocument()
    expect(within(fundbox).getByText('6 mo')).toBeInTheDocument()
    expect(within(fundbox).getByText('$2,700+')).toBeInTheDocument()
    expect(within(rowFor('LendingClub')).getAllByText('N/A').length).toBeGreaterThan(0)
    expect(screen.getByText(/Showing/)).toHaveTextContent('Showing 1 to 2 of 2 lenders')
  })

  it('searches as you type, and Clear shows everyone again', async () => {
    renderWithProviders(<LenderInformationCard lenders={lenders} assignedLenderIds={[]} subjectLabel="funding application" onAssign={vi.fn()} />)

    await userEvent.type(screen.getByPlaceholderText('Search lenders...'), 'line credit')
    expect(screen.queryByText('Fundbox Financing')).not.toBeInTheDocument()
    expect(screen.getByText('LendingClub')).toBeInTheDocument()
    expect(screen.getByText(/Showing/)).toHaveTextContent('Showing 1 to 1 of 2 lenders')

    await userEvent.clear(screen.getByPlaceholderText('Search lenders...'))
    await userEvent.type(screen.getByPlaceholderText('Search lenders...'), 'term load')
    expect(screen.getByText('No lenders match these filters.')).toBeInTheDocument()
    expect(screen.getByText(/Showing/)).toHaveTextContent('Showing 0 to 0 of 2 lenders')

    await userEvent.click(screen.getByRole('button', { name: /clear/i }))
    expect(screen.getByText('Fundbox Financing')).toBeInTheDocument()
    expect(screen.getByText('LendingClub')).toBeInTheDocument()
  })

  it('filters by category and by lender, and a category without the chosen lender resets it', async () => {
    renderWithProviders(<LenderInformationCard lenders={lenders} assignedLenderIds={[]} subjectLabel="funding application" onAssign={vi.fn()} />)
    // As the other PrimeReact dropdown tests: open the dropdown, click the panel item.
    const pick = async (placeholder: string, option: string) => {
      const dropdown = screen.getAllByText(placeholder).map((el) => el.closest('.p-dropdown')).find(Boolean) as HTMLElement
      await userEvent.click(dropdown)
      const item = await waitFor(() => {
        const found = Array.from(document.body.querySelectorAll('.p-dropdown-panel .p-dropdown-item'))
          .find((el) => el.textContent?.trim() === option)
        if (!found) throw new Error(`no "${option}" option`)
        return found as HTMLElement
      })
      await userEvent.click(item)
    }

    const table = () => within(screen.getByRole('table'))

    await pick('All Lenders', 'Fundbox Financing')
    expect(table().getByText('Fundbox Financing')).toBeInTheDocument()
    expect(table().queryByText('LendingClub')).not.toBeInTheDocument()

    // Fundbox is not a Business Line of Credit lender: the lender filter goes.
    await pick('All Categories', 'Business Line of Credit')
    expect(table().queryByText('Fundbox Financing')).not.toBeInTheDocument()
    expect(table().getByText('LendingClub')).toBeInTheDocument()
    expect(screen.getByText(/Showing/)).toHaveTextContent('Showing 1 to 1 of 2 lenders')
  })

  it('keeps the search when Filters or Enter is pressed - filtering is already live', async () => {
    renderWithProviders(<LenderInformationCard lenders={lenders} assignedLenderIds={[]} subjectLabel="funding application" onAssign={vi.fn()} />)

    await userEvent.type(screen.getByPlaceholderText('Search lenders...'), 'lendingclub{Enter}')
    await userEvent.click(screen.getByRole('button', { name: /filters/i }))

    expect(screen.getByPlaceholderText('Search lenders...')).toHaveValue('lendingclub')
    expect(screen.queryByText('Fundbox Financing')).not.toBeInTheDocument()
    expect(screen.getByText('LendingClub')).toBeInTheDocument()
  })

  it('lights a row on hover, but not the assigned one', () => {
    renderWithProviders(<LenderInformationCard lenders={lenders} assignedLenderIds={[2]} subjectLabel="funding application" onAssign={vi.fn()} />)
    const open = rowFor('Fundbox Financing')
    const assigned = rowFor('LendingClub')

    fireEvent.mouseEnter(open)
    expect(open.style.background).not.toBe('rgb(255, 255, 255)')
    fireEvent.mouseLeave(open)
    expect(open.style.background).toBe('rgb(255, 255, 255)')

    const before = assigned.style.background
    fireEvent.mouseEnter(assigned)
    expect(assigned.style.background).toBe(before)
  })

  it('leaves the pulsing first row to its animation on hover', () => {
    renderWithProviders(<LenderInformationCard lenders={lenders} assignedLenderIds={[]} subjectLabel="funding application" onAssign={vi.fn()} highlightFirstRow />)
    const first = rowFor('Fundbox Financing')

    fireEvent.mouseEnter(first)
    expect(first.style.background).toBe('')
    fireEvent.mouseLeave(first)
    expect(first.style.background).toBe('')
  })

  it('closes the confirm dialog with Escape', async () => {
    renderWithProviders(<LenderInformationCard lenders={lenders} assignedLenderIds={[]} subjectLabel="funding application" onAssign={vi.fn()} />)

    await userEvent.click(within(rowFor('LendingClub')).getByRole('button', { name: /assign/i }))
    const dialog = await screen.findByRole('dialog')
    fireEvent.keyDown(dialog, { key: 'Escape', keyCode: 27, which: 27 })
    fireEvent.keyUp(dialog, { key: 'Escape', keyCode: 27, which: 27 })

    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
  })

  it('says so when nothing matched at all', () => {
    renderWithProviders(<LenderInformationCard lenders={[]} assignedLenderIds={[]} subjectLabel="funding application" onAssign={vi.fn()} emptyText="No matched lenders found for the Preferred or Additional Funding Types." />)

    expect(screen.getByText('No matched lenders found for the Preferred or Additional Funding Types.')).toBeInTheDocument()
  })

  it('marks the assigned lender and offers Assign on the others', () => {
    renderWithProviders(<LenderInformationCard lenders={lenders} assignedLenderIds={[1]} subjectLabel="funding application" onAssign={vi.fn()} />)

    expect(within(rowFor('Fundbox Financing')).getByText('Assigned')).toBeInTheDocument()
    expect(within(rowFor('LendingClub')).getByRole('button', { name: /assign/i })).toBeEnabled()
  })

  it('assigns after the confirm dialog, then closes it', async () => {
    const onAssign = vi.fn().mockResolvedValue(undefined)
    renderWithProviders(<LenderInformationCard lenders={lenders} assignedLenderIds={[]} subjectLabel="funding application" onAssign={onAssign} />)

    await userEvent.click(within(rowFor('LendingClub')).getByRole('button', { name: /assign/i }))
    const dialog = await screen.findByRole('dialog')
    expect(dialog).toHaveTextContent('Are you sure you want to assign LendingClub to this funding application?')
    expect(dialog).toHaveTextContent('Business Line of Credit')

    await userEvent.click(within(dialog).getByRole('button', { name: /assign lender/i }))

    expect(onAssign).toHaveBeenCalledWith(expect.objectContaining({ id: 2, name: 'LendingClub' }))
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
  })

  it('keeps the dialog open when assigning fails, and Cancel closes it', async () => {
    const onAssign = vi.fn().mockRejectedValue(new Error('nope'))
    renderWithProviders(<LenderInformationCard lenders={lenders} assignedLenderIds={[]} subjectLabel="funding request" onAssign={onAssign} />)

    await userEvent.click(within(rowFor('Fundbox Financing')).getByRole('button', { name: /assign/i }))
    const dialog = await screen.findByRole('dialog')
    await userEvent.click(within(dialog).getByRole('button', { name: /assign lender/i }))

    expect(onAssign).toHaveBeenCalled()
    expect(screen.getByRole('dialog')).toBeInTheDocument()

    await userEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Cancel' }))
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
  })

  it('shows the match tone in the dialog', async () => {
    renderWithProviders(
      <LenderInformationCard
        lenders={[lender({ id: 3, name: 'Excellent Co', score_text: 'Excellent Match' }), lender({ id: 4, name: 'Poor Co', score_text: 'Poor Match' }), lender({ id: 5, name: 'Plain Co', score_text: '' })]}
        assignedLenderIds={[]}
        subjectLabel="funding application"
        onAssign={vi.fn()}
      />
    )

    for (const [name, badge] of [['Excellent Co', 'bg-success'], ['Poor Co', 'bg-danger'], ['Plain Co', 'bg-primary']] as const) {
      await userEvent.click(within(rowFor(name)).getByRole('button', { name: /assign/i }))
      const dialog = await screen.findByRole('dialog')
      expect(dialog.querySelector(`.badge.${badge}`)).not.toBeNull()
      await userEvent.click(within(dialog).getByRole('button', { name: 'Cancel' }))
      await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    }
  })

  it('cannot assign while the lender is fixed, and says why', () => {
    renderWithProviders(
      <LenderInformationCard lenders={lenders} assignedLenderIds={[]} subjectLabel="funding application" onAssign={vi.fn()} canAssign={false} assignDisabledReason='The lender can&apos;t be changed now that this application is "Funded".' />
    )

    expect(screen.getByText(/can.t be changed now that this application is "Funded"/)).toBeInTheDocument()
    expect(within(rowFor('LendingClub')).getByRole('button', { name: /assign/i })).toBeDisabled()
  })

  it('shows its notice while the lender can still change', () => {
    renderWithProviders(<LenderInformationCard lenders={lenders} assignedLenderIds={[]} subjectLabel="funding application" onAssign={vi.fn()} notice="This application is &quot;Draft&quot;, so you can still assign or change its lender." />)

    expect(screen.getByText(/so you can still assign or change its lender/)).toBeInTheDocument()
  })

  it('pulses the first row when the page points at it', () => {
    renderWithProviders(<LenderInformationCard lenders={lenders} assignedLenderIds={[]} subjectLabel="funding application" onAssign={vi.fn()} highlightFirstRow />)

    expect(screen.getAllByRole('row')[2]).toHaveClass('row-pulse-animation')
  })

  describe('once the lender is fixed', () => {
    it('shows just the assigned lender as a card - no table, no search', () => {
      renderWithProviders(
        <LenderInformationCard lenders={lenders} assignedLenderIds={[1]} subjectLabel="funding application" onAssign={vi.fn()} canAssign={false} onlyAssigned assignDisabledReason="The lender can't be changed now that this application is &quot;Funded&quot;." />
      )

      expect(screen.getByText('Fundbox Financing')).toBeInTheDocument()
      expect(screen.queryByText('LendingClub')).not.toBeInTheDocument()
      expect(screen.queryByRole('table')).not.toBeInTheDocument()
      expect(screen.queryByPlaceholderText('Search lenders...')).not.toBeInTheDocument()
      expect(screen.getByText('Assigned Lender')).toBeInTheDocument()
      expect(screen.getByText('(888) 555-0102')).toBeInTheDocument()
      expect(screen.getByText('deals@fundbox.example')).toBeInTheDocument()
      expect(screen.getAllByText('Meets requirement')).toHaveLength(3)
      expect(screen.getByText('Below requirement')).toBeInTheDocument()
      expect(screen.getByText(/can't be changed now that this application is "Funded"/)).toBeInTheDocument()
    })

    it('shows N/A for requirements the lender does not set, and leaves out missing contacts', () => {
      renderWithProviders(<LenderInformationCard lenders={lenders} assignedLenderIds={[2]} subjectLabel="funding application" onAssign={vi.fn()} canAssign={false} onlyAssigned />)

      expect(screen.getAllByText('N/A')).toHaveLength(4)
      expect(screen.queryByText(/555-0/)).not.toBeInTheDocument()
    })

    it('says so when the assigned lender is not among the matches', () => {
      renderWithProviders(<LenderInformationCard lenders={lenders} assignedLenderIds={[99]} subjectLabel="funding application" onAssign={vi.fn()} canAssign={false} onlyAssigned />)

      expect(screen.getByText('The assigned lender is not among the lenders matched for this application.')).toBeInTheDocument()
    })
  })
})

// R2 BUG-008: two lenders named "Kabbage" looked identical; each reads
// "Lender Name - Legal Name" in the table, the Lender filter, the dialog and
// the assigned-lender card.
describe('LenderInformationCard - lenders that share a name', () => {
  const kabbage = [
    lender({ id: 5, name: 'Kabbage', legal_name: 'Kabbage Inc.', display_name: 'Kabbage - Kabbage Inc.' }),
    lender({ id: 6, name: 'Kabbage', legal_name: 'Kabbage Funding LLC', display_name: 'Kabbage - Kabbage Funding LLC' }),
  ]

  it('names each row and the assign dialog with the legal name', async () => {
    renderWithProviders(<LenderInformationCard lenders={kabbage} assignedLenderIds={[]} subjectLabel="funding request" onAssign={vi.fn()} />)

    expect(screen.getByText('Kabbage - Kabbage Inc.')).toBeInTheDocument()
    await userEvent.click(within(rowFor('Kabbage - Kabbage Funding LLC')).getByRole('button', { name: /assign/i }))

    const dialog = await screen.findByRole('dialog')
    expect(within(dialog).getAllByText('Kabbage - Kabbage Funding LLC').length).toBeGreaterThan(0)
  })

  it('offers each lender once in the Lender filter, by its display name', async () => {
    renderWithProviders(<LenderInformationCard lenders={kabbage} assignedLenderIds={[]} subjectLabel="funding request" onAssign={vi.fn()} />)

    const lenderFilter = Array.from(document.querySelectorAll('.p-dropdown')).find((el) => el.textContent?.includes('All Lenders')) as HTMLElement
    await userEvent.click(lenderFilter)
    const option = await waitFor(() => {
      const found = Array.from(document.querySelectorAll('.p-dropdown-panel .p-dropdown-item')).find((el) => el.textContent?.trim() === 'Kabbage - Kabbage Inc.')
      if (!found) throw new Error('no option')
      return found as HTMLElement
    })
    await userEvent.click(option)

    await waitFor(() => expect(screen.queryByText('Kabbage - Kabbage Funding LLC')).not.toBeInTheDocument())
  })

  it('names the assigned lender with its legal name once it is fixed', () => {
    renderWithProviders(<LenderInformationCard lenders={kabbage} assignedLenderIds={[6]} subjectLabel="funding request" onAssign={vi.fn()} canAssign={false} onlyAssigned />)

    expect(screen.getByText('Kabbage - Kabbage Funding LLC')).toBeInTheDocument()
  })
})
