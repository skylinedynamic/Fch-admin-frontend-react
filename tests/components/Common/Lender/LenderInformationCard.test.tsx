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
    // "of" counts the lenders the filters leave - the table pages through those.
    expect(screen.getByText(/Showing/)).toHaveTextContent('Showing 1 to 1 of 1 lenders')

    await userEvent.clear(screen.getByPlaceholderText('Search lenders...'))
    await userEvent.type(screen.getByPlaceholderText('Search lenders...'), 'term load')
    expect(screen.getByText('No lenders match these filters.')).toBeInTheDocument()
    expect(screen.getByText(/Showing/)).toHaveTextContent('Showing 0 to 0 of 0 lenders')

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
    expect(screen.getByText(/Showing/)).toHaveTextContent('Showing 1 to 1 of 1 lenders')
  })

  it('keeps the chosen lender when its own category is picked', async () => {
    renderWithProviders(<LenderInformationCard lenders={lenders} assignedLenderIds={[]} subjectLabel="funding application" onAssign={vi.fn()} />)
    const pick = async (placeholder: string, option: string) => {
      const dropdown = screen.getAllByText(placeholder).map((el) => el.closest('.p-dropdown')).find(Boolean) as HTMLElement
      await userEvent.click(dropdown)
      const item = await waitFor(() => {
        const found = Array.from(document.body.querySelectorAll('.p-dropdown-panel .p-dropdown-item')).find((el) => el.textContent?.trim() === option)
        if (!found) throw new Error(`no "${option}" option`)
        return found as HTMLElement
      })
      await userEvent.click(item)
    }
    const table = () => within(screen.getByRole('table'))

    await pick('All Lenders', 'LendingClub')
    await pick('All Categories', 'Business Line of Credit')

    expect(table().getByText('LendingClub')).toBeInTheDocument()
    expect(screen.getByText(/Showing/)).toHaveTextContent('Showing 1 to 1 of 1 lenders')
    expect(document.querySelector('.p-dropdown-label')?.closest('.col-md-3')?.parentElement?.textContent).toContain('LendingClub')
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

  /**
   * Defect (found 2026-11-11, funding application 115 / funding request 76):
   * the footer said 10 per page with page 1 of 1, but the table listed all 12
   * matched lenders - the pagination was static markup (links to "#!"), so
   * nothing paged and there was no page 2.
   */
  describe('pagination', () => {
    const twelve = Array.from({ length: 12 }, (_, i) =>
      lender({ id: i + 1, name: `Lender ${String(i + 1).padStart(2, '0')}`, phone: null, email: null })
    )
    const bodyRows = () => within(screen.getByRole('table')).getAllByRole('row').slice(2)
    const showing = () => screen.getByText(/Showing/)
    const nav = (label: string) => screen.getByRole('button', { name: label })
    const mount = (props: Partial<React.ComponentProps<typeof LenderInformationCard>> = {}) =>
      renderWithProviders(<LenderInformationCard lenders={twelve} assignedLenderIds={[]} subjectLabel="funding application" onAssign={vi.fn()} {...props} />)

    it('shows ten lenders on page 1 and the other two on page 2', async () => {
      mount()

      expect(bodyRows()).toHaveLength(10)
      expect(showing()).toHaveTextContent('Showing 1 to 10 of 12 lenders')
      expect(screen.getByText('Lender 10')).toBeInTheDocument()
      expect(screen.queryByText('Lender 11')).not.toBeInTheDocument()

      await userEvent.click(nav('Page 2'))

      expect(bodyRows()).toHaveLength(2)
      expect(showing()).toHaveTextContent('Showing 11 to 12 of 12 lenders')
      expect(screen.getByText('Lender 11')).toBeInTheDocument()
      expect(screen.getByText('Lender 12')).toBeInTheDocument()
      expect(screen.queryByText('Lender 01')).not.toBeInTheDocument()
    })

    it('moves with next, previous, last and first, each off at its end', async () => {
      mount()

      expect(nav('First page')).toBeDisabled()
      expect(nav('Previous page')).toBeDisabled()

      await userEvent.click(nav('Next page'))
      expect(showing()).toHaveTextContent('Showing 11 to 12 of 12 lenders')
      expect(nav('Next page')).toBeDisabled()
      expect(nav('Last page')).toBeDisabled()

      await userEvent.click(nav('Previous page'))
      expect(showing()).toHaveTextContent('Showing 1 to 10 of 12 lenders')

      await userEvent.click(nav('Last page'))
      expect(showing()).toHaveTextContent('Showing 11 to 12 of 12 lenders')

      await userEvent.click(nav('First page'))
      expect(showing()).toHaveTextContent('Showing 1 to 10 of 12 lenders')
      expect(nav('Page 1')).toHaveAttribute('aria-current', 'page')
    })

    it('shows them all on one page at 25 per page', async () => {
      mount()
      await userEvent.click(nav('Page 2'))

      await userEvent.selectOptions(screen.getByRole('combobox', { name: /lenders per page/i }), '25')

      expect(bodyRows()).toHaveLength(12)
      expect(showing()).toHaveTextContent('Showing 1 to 12 of 12 lenders')
      expect(screen.queryByRole('button', { name: 'Page 2' })).not.toBeInTheDocument()
    })

    it('goes back to page 1 when the search changes', async () => {
      mount()
      await userEvent.click(nav('Page 2'))

      // Lender 01 is on page 1; from page 2 the search must show page 1.
      await userEvent.type(screen.getByPlaceholderText('Search lenders...'), 'Lender 01')

      expect(showing()).toHaveTextContent('Showing 1 to 1 of 1 lenders')
      expect(screen.getByText('Lender 01')).toBeInTheDocument()
    })

    /**
     * Defect (found 2026-11-11): page 2 holds 2 lenders where page 1 held 10,
     * so the table shrank and the page below moved up under the reader. After
     * a page change the whole card - title, rows and pager - is brought into view.
     */
    it('brings the whole Lender Information card into view when the page or page size changes, not on first load', async () => {
      const scrolled = vi.fn(function (this: Element) { return this })
      const original = Element.prototype.scrollIntoView
      Element.prototype.scrollIntoView = scrolled
      try {
        mount()
        expect(scrolled).not.toHaveBeenCalled()

        await userEvent.click(nav('Page 2'))
        expect(scrolled).toHaveBeenCalledTimes(1)
        expect(scrolled).toHaveBeenLastCalledWith({ block: 'nearest' })
        const target = scrolled.mock.results[0].value as HTMLElement
        expect(target).toHaveClass('card')
        expect(target).toContainElement(screen.getByText('Lender Information'))
        expect(target).toContainElement(screen.getByText(/Showing/))

        await userEvent.selectOptions(screen.getByRole('combobox', { name: /lenders per page/i }), '25')
        expect(scrolled).toHaveBeenCalledTimes(2)
      } finally {
        Element.prototype.scrollIntoView = original
      }
    })

    // Assign is visible at first glance: the Actions column stays at the
    // table's right edge however wide the table is (lenderTableLayout.test.ts).
    it('pins the Actions column - its header and every Assign cell', () => {
      mount()

      const header = screen.getByRole('columnheader', { name: 'Actions' })
      expect(header).toHaveClass('fr-actions-col')
      for (const row of bodyRows()) {
        const assign = within(row).getByRole('button', { name: /assign/i })
        expect(assign.closest('td')).toHaveClass('fr-actions-col')
      }
    })

    it('pulses only the first lender of the list, not the first of page 2', async () => {
      mount({ highlightFirstRow: true })
      expect(bodyRows()[0]).toHaveClass('row-pulse-animation')

      await userEvent.click(nav('Page 2'))

      expect(bodyRows()[0]).not.toHaveClass('row-pulse-animation')
    })

    it('does not navigate the browser (no "#!" links)', () => {
      const { container } = mount()

      expect(container.querySelectorAll('a[href="#!"]')).toHaveLength(0)
    })
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

    // SCRUM-434 S434-BUG-05: a fixed lender made Inactive since (app 90's R2
    // Lender A) is still shown - the API lists it, marked is_active: false.
    it('shows a fixed lender made Inactive since, marked Inactive', () => {
      renderWithProviders(
        <LenderInformationCard lenders={[lender({ id: 24, name: 'R2 Lender A', is_active: false })]} assignedLenderIds={[24]} subjectLabel="funding application" onAssign={vi.fn()} canAssign={false} onlyAssigned />
      )

      expect(screen.getByText('R2 Lender A')).toBeInTheDocument()
      expect(screen.getByText('Inactive')).toBeInTheDocument()
      expect(screen.queryByText('The assigned lender is not among the lenders matched for this application.')).not.toBeInTheDocument()
    })

    it('does not mark an Active assigned lender', () => {
      renderWithProviders(<LenderInformationCard lenders={[lender({ id: 1, is_active: true })]} assignedLenderIds={[1]} subjectLabel="funding application" onAssign={vi.fn()} canAssign={false} onlyAssigned />)

      expect(screen.queryByText('Inactive')).not.toBeInTheDocument()
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

  /**
   * 2026-11-11: every lender dropdown names a lender "Lender Name - Lender Code";
   * two lenders may now share a name and a legal name, never a Lender Code.
   */
  const coded = [
    lender({ id: 5, lender_code: 'LND-1111', name: 'Kabbage', legal_name: 'Kabbage Inc.', display_name: 'Kabbage - Kabbage Inc.' }),
    lender({ id: 6, lender_code: 'LND-2222', name: 'Kabbage', legal_name: 'Kabbage Funding LLC', display_name: 'Kabbage - Kabbage Funding LLC' }),
    lender({ id: 7, lender_code: 'LND-3333', name: 'Kabbage', legal_name: 'Kabbage Inc.', display_name: 'Kabbage - Kabbage Inc.' }),
  ]

  const openLenderFilter = async () => {
    const lenderFilter = Array.from(document.querySelectorAll('.p-dropdown')).find((el) => el.textContent?.includes('All Lenders')) as HTMLElement
    await userEvent.click(lenderFilter)
    return waitFor(() => {
      const items = Array.from(document.querySelectorAll('.p-dropdown-panel .p-dropdown-item')) as HTMLElement[]
      if (items.length === 0) throw new Error('no options')
      return items
    })
  }

  /** Each option's name and Lender Code, read apart (design A: name left, code right). */
  const optionParts = (items: HTMLElement[]) =>
    items.map((el) => [el.querySelector('.lender-option-name')?.textContent ?? el.textContent?.trim(), el.querySelector('.lender-option-code')?.textContent ?? null])

  it('offers each lender once in the Lender filter, its name with its Lender Code apart', async () => {
    renderWithProviders(<LenderInformationCard lenders={coded} assignedLenderIds={[]} subjectLabel="funding request" onAssign={vi.fn()} />)

    expect(optionParts(await openLenderFilter())).toEqual([
      ['All Lenders', null],
      ['Kabbage', 'LND-1111'],
      ['Kabbage', 'LND-2222'],
      ['Kabbage', 'LND-3333'],
    ])
  })

  it('finds a lender in the Lender filter by its name or its code', async () => {
    renderWithProviders(<LenderInformationCard lenders={coded} assignedLenderIds={[]} subjectLabel="funding request" onAssign={vi.fn()} />)
    await openLenderFilter()

    await userEvent.type(document.querySelector('.p-dropdown-panel .p-dropdown-filter') as HTMLElement, 'lnd-2222')

    await waitFor(() => {
      const left = Array.from(document.querySelectorAll('.p-dropdown-panel .p-dropdown-item')) as HTMLElement[]
      expect(optionParts(left)).toEqual([['Kabbage', 'LND-2222']])
    })
  })

  it('shows the picked lender with its code in the box', async () => {
    const { container } = renderWithProviders(<LenderInformationCard lenders={coded} assignedLenderIds={[]} subjectLabel="funding request" onAssign={vi.fn()} />)

    await userEvent.click((await openLenderFilter()).find((el) => el.querySelector('.lender-option-code')?.textContent === 'LND-2222') as HTMLElement)

    const shown = await waitFor(() => {
      const value = container.querySelector('.p-dropdown-label .lender-option-inline')
      if (!value) throw new Error('no picked lender shown')
      return value as HTMLElement
    })
    expect(shown.querySelector('.lender-option-name')).toHaveTextContent('Kabbage')
    expect(shown.querySelector('.lender-option-code')).toHaveTextContent('LND-2222')
  })

  it('filters to the one lender picked, even when another has the same name and legal name', async () => {
    renderWithProviders(<LenderInformationCard lenders={coded} assignedLenderIds={[]} subjectLabel="funding request" onAssign={vi.fn()} />)

    await userEvent.click((await openLenderFilter()).find((el) => el.querySelector('.lender-option-code')?.textContent === 'LND-3333') as HTMLElement)

    const table = within(screen.getByRole('table'))
    await waitFor(() => expect(table.getAllByRole('row').slice(2)).toHaveLength(1))
    expect(table.getByText('LND-3333')).toBeInTheDocument()
    expect(table.queryByText('LND-1111')).not.toBeInTheDocument()
  })

  it('shows each lender\'s Lender Code in its own column, and finds a lender by it', async () => {
    renderWithProviders(<LenderInformationCard lenders={coded} assignedLenderIds={[]} subjectLabel="funding request" onAssign={vi.fn()} />)

    expect(screen.getByRole('columnheader', { name: 'Lender Code' })).toBeInTheDocument()
    expect(within(rowFor('LND-2222')).getByText('Kabbage - Kabbage Funding LLC')).toBeInTheDocument()

    await userEvent.type(screen.getByPlaceholderText('Search lenders...'), 'lnd-3333')
    expect(within(screen.getByRole('table')).getAllByRole('row').slice(2)).toHaveLength(1)
    expect(screen.getByText('LND-3333')).toBeInTheDocument()
  })

  it('shows a dash for a lender without a Lender Code', () => {
    renderWithProviders(<LenderInformationCard lenders={kabbage} assignedLenderIds={[]} subjectLabel="funding request" onAssign={vi.fn()} />)

    const cells = within(rowFor('Kabbage - Kabbage Inc.')).getAllByRole('cell')
    expect(cells[0].textContent?.trim()).toBe('-')
    expect(within(screen.getByRole('table')).getAllByRole('columnheader')[0]).toHaveTextContent('Lender Code')
  })

  it('shows the assigned lender\'s Lender Code on its card once it is fixed', () => {
    renderWithProviders(<LenderInformationCard lenders={coded} assignedLenderIds={[6]} subjectLabel="funding request" onAssign={vi.fn()} canAssign={false} onlyAssigned />)

    expect(screen.getByText('LND-2222')).toBeInTheDocument()
  })

  it('names the assigned lender with its legal name once it is fixed', () => {
    renderWithProviders(<LenderInformationCard lenders={kabbage} assignedLenderIds={[6]} subjectLabel="funding request" onAssign={vi.fn()} canAssign={false} onlyAssigned />)

    expect(screen.getByText('Kabbage - Kabbage Funding LLC')).toBeInTheDocument()
  })
})
