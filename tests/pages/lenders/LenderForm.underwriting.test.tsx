import { describe, expect, it, vi } from 'vitest'
import userEvent from '@testing-library/user-event'
import { Route, Routes } from 'react-router-dom'
import { renderWithProviders, screen, waitFor, within } from '../../test-utils'
import { http, HttpResponse } from 'msw'
import { server } from '../../mocks/server'
import { allowBackgroundCalls, api } from '../pageHarness'

vi.mock('react-toastify', () => ({ toast: { success: vi.fn(), error: vi.fn() } }))
// The delete confirmation is a Bootstrap modal; jsdom cannot run its transitions.
vi.mock('bootstrap/js/dist/modal', () => import('../../mocks/fakeBootstrapModal'))
// A rich-text editor; it needs a real canvas, which jsdom has not.
vi.mock('../../../src/hooks/useSummernote', () => ({ useSummernote: () => ({ editorRef: () => {} }) }))

import { toast } from 'react-toastify'
import LenderForm from '../../../src/pages/lenders/LenderForm'

/**
 * Underwriting Logic moved from Funding Sequence to Edit Lender (2026-11-26):
 * one rule per funding type of the lender, saved with the lender by Update.
 * The tab lists exactly the lender's Funding Types; one taken off on Lender
 * Details takes its rule with it.
 */
const CATEGORIES = [
  { id: 1, name: 'Term Loan', status: 'Active' },
  { id: 2, name: 'Business Line of Credit', status: 'Active' },
  { id: 3, name: 'Equipment Financing', status: 'Active' },
]
const RULE = (id: number, min_fico: number) => ({
  id: id * 10, lender_product_category_id: id, min_fico, min_business_credit_score: null, min_tib_months: 12,
  min_monthly_revenue: '10000.00', min_monthly_deposits: '8000.00', min_deposit_count: null, min_average_daily_balance: null,
  max_nsf_count: null, max_negative_days: null, min_dscr: null, allowed_states: [], restricted_states: [], allowed_industries: [], restricted_industries: [],
})
const LENDER = {
  id: 31, name: 'QA-TEST R3 Temp Lender', legal_name: 'QA-TEST R3 Temp Lender LLC', product_categories: [2, 1],
  contact_name: 'QA Contact', contact_title: 'Manager', contact_email: 'qa@lender.example.org', contact_phone: '(555) 234-0100', status: 'Inactive',
  underwriting_logic: [RULE(2, 680), RULE(1, 640)],
}

const mount = (route = '/lenders/31') => {
  const user = userEvent.setup()
  renderWithProviders(
    <Routes>
      <Route path="/lenders/create" element={<LenderForm />} />
      <Route path="/lenders/:id" element={<LenderForm />} />
      <Route path="/lenders" element={<p>Lenders list</p>} />
    </Routes>,
    { route }
  )
  return user
}

const openUnderwriting = async (user: ReturnType<typeof userEvent.setup>) => {
  await screen.findByDisplayValue('QA-TEST R3 Temp Lender LLC')
  await user.click(screen.getByRole('tab', { name: /underwriting logic/i }))
  return screen.getByRole('tabpanel', { name: 'Underwriting Logic' })
}

/** Picks a funding type in the Underwriting Logic tab's Funding Types. */
const pickFundingType = async (user: ReturnType<typeof userEvent.setup>, panel: HTMLElement, name: string) => {
  await user.click(panel.querySelector('.underwriting-filter .p-multiselect') as Element)
  const option = await waitFor(() => {
    const found = Array.from(document.querySelectorAll('.p-multiselect-item')).find((el) => el.textContent?.includes(name))
    if (!found) throw new Error(`no ${name} option`)
    return found
  })
  await user.click(option)
  await user.keyboard('{Escape}')
  await waitFor(() => expect(panel.querySelector(`[data-testid^="underwriting-row-"]`)).not.toBeNull())
}

describe('Edit Lender › Funding Type', () => {
  it('labels the lender\'s product categories "Funding Type"', async () => {
    allowBackgroundCalls()
    api('get', '/admin/funding-types', { status: true, data: CATEGORIES })
    api('get', '/admin/lenders/31', { status: true, data: LENDER })
    mount()

    await screen.findByDisplayValue('QA-TEST R3 Temp Lender LLC')
    expect(screen.getByText('Funding Type', { selector: 'label' })).toBeInTheDocument()
    expect(screen.queryByText(/Product Categories/)).not.toBeInTheDocument()
  })
})

describe('Add/Edit Lender › Funding Type list order', () => {
  // A funding type just added with Add New is at the top of the list, not
  // the bottom: newest first.
  it('lists the newest funding type first', async () => {
    allowBackgroundCalls()
    api('get', '/admin/funding-types', { status: true, data: [...CATEGORIES, { id: 9, name: 'Sajib Product', status: 'Active' }] })
    const user = mount('/lenders/create')

    await screen.findByPlaceholderText('Enter lender name')
    const select = await waitFor(() => {
      const found = document.querySelector('.lender-categories-field .p-multiselect:not(.p-disabled)')
      if (!found) throw new Error('Funding Type not loaded')
      return found
    })
    await user.click(select as Element)

    const options = await waitFor(() => {
      const items = Array.from(document.querySelectorAll('.lender-categories-field .p-multiselect-item')).map((el) => el.textContent?.trim())
      if (items.length === 0) throw new Error('no options')
      return items
    })
    expect(options).toEqual(['Sajib Product', 'Equipment Financing', 'Business Line of Credit', 'Term Loan'])
  })
})

describe('Edit Lender › Underwriting Logic', () => {
  it('shows one row per saved rule, named by funding type, in the lender\'s order', async () => {
    allowBackgroundCalls()
    api('get', '/admin/funding-types', { status: true, data: CATEGORIES })
    api('get', '/admin/lenders/31', { status: true, data: LENDER })
    const user = mount()

    const panel = await openUnderwriting(user)

    const rows = within(panel).getAllByTestId(/^underwriting-row-/)
    expect(rows.map((r) => r.getAttribute('data-testid'))).toEqual(['underwriting-row-2', 'underwriting-row-1'])
    expect(within(rows[0]).getByText('Business Line of Credit')).toBeInTheDocument()
    expect(within(rows[0]).getByLabelText('Business Line of Credit min_fico')).toHaveValue(680)
    expect(within(rows[1]).getByLabelText('Term Loan min_fico')).toHaveValue(640)
  })

  it('saves the rules with the lender on Update', async () => {
    allowBackgroundCalls()
    api('get', '/admin/funding-types', { status: true, data: CATEGORIES })
    api('get', '/admin/lenders/31', { status: true, data: LENDER })
    const update = api('put', '/admin/lenders/31', { status: true, data: LENDER })
    const user = mount()

    const panel = await openUnderwriting(user)
    const fico = within(panel).getByLabelText('Term Loan min_fico')
    await user.clear(fico)
    await user.type(fico, '700')
    await user.click(screen.getByRole('button', { name: /update/i }))

    await waitFor(() => expect(update.bodies).toHaveLength(1))
    const sent = update.bodies[0] as any
    expect(sent.product_categories).toEqual([2, 1])
    expect(sent.underwriting_logic.map((r: any) => [r.lender_product_category_id, String(r.min_fico)])).toEqual([[2, '680'], [1, '700']])
    expect(sent.underwriting_logic[0]).not.toHaveProperty('id')
    // Only a rule changed: the toast says so.
    expect(toast.success).toHaveBeenLastCalledWith('Underwriting logic updated successfully')
  })

  it('drops the rule of a funding type taken off the lender', async () => {
    allowBackgroundCalls()
    api('get', '/admin/funding-types', { status: true, data: CATEGORIES })
    api('get', '/admin/lenders/31', { status: true, data: LENDER })
    const update = api('put', '/admin/lenders/31', { status: true, data: LENDER })
    const user = mount()

    await screen.findByDisplayValue('QA-TEST R3 Temp Lender LLC')
    // Lender Details: remove "Term Loan" from Funding Type.
    const chip = await waitFor(() => {
      const found = Array.from(document.querySelectorAll('.lender-categories-field .p-multiselect-token'))
        .find((el) => el.textContent?.includes('Term Loan'))
      if (!found) throw new Error('no Term Loan chip')
      return found
    })
    await user.click(chip.querySelector('.p-multiselect-token-icon') as Element)

    const panel = await openUnderwriting(user)
    expect(within(panel).queryByTestId('underwriting-row-1')).not.toBeInTheDocument()
    expect(within(panel).getByTestId('underwriting-row-2')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /update/i }))
    await waitFor(() => expect(update.bodies).toHaveLength(1))
    expect((update.bodies[0] as any).product_categories).toEqual([2])
    expect((update.bodies[0] as any).underwriting_logic.map((r: any) => r.lender_product_category_id)).toEqual([2])
    // The lender's Funding Type and its rules both changed.
    expect(toast.success).toHaveBeenLastCalledWith('Lender and underwriting logic updated successfully')
  })

  it('says "Lender updated" when only the lender\'s details changed', async () => {
    allowBackgroundCalls()
    api('get', '/admin/funding-types', { status: true, data: CATEGORIES })
    api('get', '/admin/lenders/31', { status: true, data: LENDER })
    api('post', '/admin/lenders/check-duplicates', { status: true, data: { name: [], legal_name: [] } })
    const update = api('put', '/admin/lenders/31', { status: true, data: LENDER })
    const user = mount()

    const name = await screen.findByDisplayValue('QA-TEST R3 Temp Lender')
    await user.type(name, ' Two')
    await user.click(screen.getByRole('button', { name: /update/i }))

    await waitFor(() => expect(update.bodies).toHaveLength(1))
    expect(toast.success).toHaveBeenLastCalledWith('Lender updated successfully')
  })

  it('shows every funding type of the lender by default, and saves only the rows filled in', async () => {
    allowBackgroundCalls()
    api('get', '/admin/funding-types', { status: true, data: CATEGORIES })
    const load = api('get', '/admin/lenders/31', { status: true, data: { ...LENDER, underwriting_logic: [RULE(2, 680)] } })
    const update = api('put', '/admin/lenders/31', { status: true, data: LENDER })
    const user = mount()

    const panel = await openUnderwriting(user)
    // Both of the lender's funding types, the one without logic as "Not set".
    expect(within(panel).getByTestId('underwriting-row-2')).toBeInTheDocument()
    const row = within(panel).getByTestId('underwriting-row-1')
    expect(within(row).getByText('Not set')).toBeInTheDocument()
    expect(within(row).getByLabelText('Term Loan min_fico')).toHaveValue(null)

    // Left empty: not sent (no logic yet), so Update is not refused for it.
    await user.click(screen.getByRole('button', { name: /update/i }))
    await waitFor(() => expect(update.bodies).toHaveLength(1))
    expect((update.bodies[0] as any).underwriting_logic.map((r: any) => r.lender_product_category_id)).toEqual([2])
    await waitFor(() => expect(load.calls).toBe(2))

    // Filled in: sent.
    const reloaded = screen.getByRole('tabpanel', { name: 'Underwriting Logic' })
    await user.type(within(reloaded).getByLabelText('Term Loan min_fico'), '650')
    await user.click(screen.getByRole('button', { name: /update/i }))
    await waitFor(() => expect(update.bodies).toHaveLength(2))
    expect((update.bodies[1] as any).underwriting_logic.map((r: any) => r.lender_product_category_id)).toEqual([2, 1])
    expect(screen.getByRole('tab', { name: /underwriting logic/i })).toHaveAttribute('aria-selected', 'true')
  })

  it('shows a funding type added on Lender Details at once', async () => {
    allowBackgroundCalls()
    api('get', '/admin/funding-types', { status: true, data: CATEGORIES })
    api('get', '/admin/lenders/31', { status: true, data: LENDER })
    const user = mount()

    await screen.findByDisplayValue('QA-TEST R3 Temp Lender LLC')
    // Lender Details: add "Equipment Financing" to Funding Type.
    await user.click(document.querySelector('.lender-categories-field .p-multiselect') as Element)
    await user.click(await waitFor(() => {
      const found = Array.from(document.querySelectorAll('.lender-categories-field .p-multiselect-item')).find((el) => el.textContent?.includes('Equipment Financing'))
      if (!found) throw new Error('no Equipment Financing option')
      return found
    }))
    await user.keyboard('{Escape}')

    const panel = await openUnderwriting(user)
    const row = within(panel).getByTestId('underwriting-row-3')
    expect(within(row).getByText('Not set')).toBeInTheDocument()
  })

  /**
   * Defect: pressing Update emptied the grid ("No underwriting logic shown")
   * while it saved - the shown funding types were cleared before the reload.
   */
  it('keeps the rows on screen while Update saves, and after', async () => {
    allowBackgroundCalls()
    api('get', '/admin/funding-types', { status: true, data: CATEGORIES })
    // The reload after the save is held open, to look at the page while it runs.
    let loads = 0
    let finishReload: () => void = () => {}
    const reloading = new Promise<void>((resolve) => { finishReload = resolve })
    server.use(http.get('*/admin/lenders/31', async () => {
      loads += 1
      if (loads > 1) await reloading
      return HttpResponse.json({ status: true, data: LENDER })
    }))
    api('put', '/admin/lenders/31', { status: true, data: LENDER })
    const user = mount()

    const panel = await openUnderwriting(user)
    await user.click(screen.getByRole('button', { name: /update/i }))

    // Saved, reloading ("Updating..."): the rows stay.
    await waitFor(() => expect(loads).toBe(2))
    expect(screen.getByText(/updating/i)).toBeInTheDocument()
    expect(within(panel).getByTestId('underwriting-row-1')).toBeInTheDocument()
    expect(within(panel).getByTestId('underwriting-row-2')).toBeInTheDocument()
    expect(within(panel).queryByTestId('underwriting-empty')).not.toBeInTheDocument()

    // Reloaded: still there.
    finishReload()
    await waitFor(() => expect(toast.success).toHaveBeenLastCalledWith('Underwriting logic updated successfully'))
    await waitFor(() => expect(screen.queryByText(/updating/i)).not.toBeInTheDocument())
    const after = screen.getByRole('tabpanel', { name: 'Underwriting Logic' })
    expect(within(after).getByTestId('underwriting-row-1')).toBeInTheDocument()
    expect(within(after).getByTestId('underwriting-row-2')).toBeInTheDocument()
  })

  it('sends a row filled in only in part, and shows its required messages on its row', async () => {
    allowBackgroundCalls()
    api('get', '/admin/funding-types', { status: true, data: CATEGORIES })
    api('get', '/admin/lenders/31', { status: true, data: { ...LENDER, underwriting_logic: [RULE(2, 680)] } })
    const update = api('put', '/admin/lenders/31', { status: false, message: 'Invalid', errors: {
      'underwriting_logic.1.min_tib_months': ['Min Time In Business is required.'],
      'underwriting_logic.1.min_monthly_revenue': ['Min Monthly Revenue is required.'],
      'underwriting_logic.1.min_monthly_deposits': ['Min Monthly Deposits is required.'],
    } }, 422)
    const user = mount()

    const panel = await openUnderwriting(user)
    await user.type(within(panel).getByLabelText('Term Loan min_fico'), '650')
    await user.click(screen.getByRole('button', { name: /update/i }))

    await waitFor(() => expect(update.bodies).toHaveLength(1))
    expect((update.bodies[0] as any).underwriting_logic.map((r: any) => r.lender_product_category_id)).toEqual([2, 1])

    const row = await within(panel).findByTestId('underwriting-row-1')
    for (const message of ['Min Time In Business is required.', 'Min Monthly Revenue is required.', 'Min Monthly Deposits is required.']) {
      expect(await within(row).findByText(message)).toBeInTheDocument()
    }
    // The saved row has no errors.
    expect(within(within(panel).getByTestId('underwriting-row-2')).queryByText(/is required/)).not.toBeInTheDocument()
  })

  it('hides a funding type taken out of Funding Types without deleting it', async () => {
    allowBackgroundCalls()
    api('get', '/admin/funding-types', { status: true, data: CATEGORIES })
    api('get', '/admin/lenders/31', { status: true, data: LENDER })
    const update = api('put', '/admin/lenders/31', { status: true, data: LENDER })
    const remove = api('delete', '/admin/lenders/31/underwriting-logic/1', { status: true, data: LENDER })
    const user = mount()

    const panel = await openUnderwriting(user)
    await user.click(within(panel).getByRole('button', { name: 'Stop filtering by Term Loan' }))

    expect(within(panel).queryByTestId('underwriting-row-1')).not.toBeInTheDocument()
    expect(within(panel).getByTestId('underwriting-row-2')).toBeInTheDocument()

    // Update still saves it: hiding is not deleting.
    await user.click(screen.getByRole('button', { name: /update/i }))
    await waitFor(() => expect(update.bodies).toHaveLength(1))
    expect((update.bodies[0] as any).underwriting_logic.map((r: any) => r.lender_product_category_id)).toEqual([2, 1])
    expect(remove.calls).toBe(0)
  })

  it('shows two funding types in Funding Types, then "+N more"', async () => {
    allowBackgroundCalls()
    api('get', '/admin/funding-types', { status: true, data: CATEGORIES })
    api('get', '/admin/lenders/31', { status: true, data: { ...LENDER, product_categories: [1, 2, 3], underwriting_logic: [RULE(1, 640), RULE(2, 680), RULE(3, 700)] } })
    const user = mount()

    const panel = await openUnderwriting(user)
    expect(await within(panel).findByTestId('underwriting-filter-more')).toHaveTextContent('+1 more')
  })

  it('asks before deleting, then removes the funding type from the lender with its logic', async () => {
    allowBackgroundCalls()
    api('get', '/admin/funding-types', { status: true, data: CATEGORIES })
    api('get', '/admin/lenders/31', { status: true, data: LENDER })
    const remove = api('delete', '/admin/lenders/31/underwriting-logic/1', { status: true, data: { ...LENDER, product_categories: [2], underwriting_logic: [RULE(2, 680)] } })
    const update = api('put', '/admin/lenders/31', { status: true, data: LENDER })
    const user = mount()

    const panel = await openUnderwriting(user)
    await user.click(within(panel).getByRole('button', { name: 'Remove Term Loan' }))

    // Nothing is removed until it is confirmed.
    expect(await screen.findByText('Remove this funding type?')).toBeInTheDocument()
    expect(screen.getByText(/will be removed from this lender's Funding Types now, with its underwriting logic/)).toBeInTheDocument()
    expect(remove.calls).toBe(0)
    await user.click(screen.getByRole('button', { name: 'Yes, Delete It' }))

    await waitFor(() => expect(remove.calls).toBe(1))
    expect(toast.success).toHaveBeenLastCalledWith('Funding type "Term Loan" and its underwriting logic removed successfully')
    await waitFor(() => expect(within(panel).queryByTestId('underwriting-row-1')).not.toBeInTheDocument())

    // Term Loan is no longer one of the lender's Funding Types, here or on Lender Details.
    await user.click(panel.querySelector('.underwriting-filter .p-multiselect') as Element)
    await waitFor(() => expect(document.querySelectorAll('.p-multiselect-item').length).toBeGreaterThan(0))
    expect(Array.from(document.querySelectorAll('.p-multiselect-item')).map((el) => el.textContent?.trim())).toEqual(['Business Line of Credit'])
    await user.keyboard('{Escape}')
    await user.click(screen.getByRole('tab', { name: /lender details/i }))
    await waitFor(() => {
      const chips = Array.from(document.querySelectorAll('.lender-categories-field .p-multiselect-token')).map((el) => el.textContent?.trim())
      expect(chips).toEqual(['Business Line of Credit'])
    })

    // A later Update sends it without Term Loan.
    await user.click(screen.getByRole('button', { name: /update/i }))
    await waitFor(() => expect(update.bodies).toHaveLength(1))
    expect((update.bodies[0] as any).product_categories).toEqual([2])
    expect((update.bodies[0] as any).underwriting_logic.map((r: any) => r.lender_product_category_id)).toEqual([2])
  })

  it('says why when the lender\'s only funding type cannot be removed', async () => {
    allowBackgroundCalls()
    api('get', '/admin/funding-types', { status: true, data: CATEGORIES })
    api('get', '/admin/lenders/31', { status: true, data: { ...LENDER, product_categories: [1], underwriting_logic: [RULE(1, 640)] } })
    api('delete', '/admin/lenders/31/underwriting-logic/1', { status: false, message: "This is the lender's only funding type, so it cannot be removed. Add another funding type on Lender Details first." }, 422)
    const user = mount()

    const panel = await openUnderwriting(user)
    await user.click(within(panel).getByRole('button', { name: 'Remove Term Loan' }))
    await screen.findByText('Remove this funding type?')
    await user.click(screen.getByRole('button', { name: 'Yes, Delete It' }))

    await waitFor(() => expect(toast.error).toHaveBeenLastCalledWith("This is the lender's only funding type, so it cannot be removed. Add another funding type on Lender Details first."))
    expect(within(panel).getByTestId('underwriting-row-1')).toBeInTheDocument()
    expect(within(panel).getByLabelText('Term Loan min_fico')).toHaveValue(640)
  })

  it('says "Underwriting logic updated" for an Update on the Underwriting Logic tab', async () => {
    allowBackgroundCalls()
    api('get', '/admin/funding-types', { status: true, data: CATEGORIES })
    api('get', '/admin/lenders/31', { status: true, data: LENDER })
    const update = api('put', '/admin/lenders/31', { status: true, data: LENDER })
    const user = mount()

    await openUnderwriting(user)
    await user.click(screen.getByRole('button', { name: /update/i }))

    await waitFor(() => expect(update.bodies).toHaveLength(1))
    expect(toast.success).toHaveBeenLastCalledWith('Underwriting logic updated successfully')
  })

  it('removes a funding type with no saved logic from the lender too, asking first', async () => {
    allowBackgroundCalls()
    api('get', '/admin/funding-types', { status: true, data: CATEGORIES })
    api('get', '/admin/lenders/31', { status: true, data: { ...LENDER, underwriting_logic: [RULE(2, 680)] } })
    const remove = api('delete', '/admin/lenders/31/underwriting-logic/1', { status: true, data: { ...LENDER, product_categories: [2], underwriting_logic: [RULE(2, 680)] } })
    const user = mount()

    const panel = await openUnderwriting(user)
    const unsaved = within(panel).getByRole('button', { name: 'Remove Term Loan' })
    expect(unsaved).toBeEnabled()

    await user.click(unsaved)
    await screen.findByText('Remove this funding type?')
    await user.click(screen.getByRole('button', { name: 'Yes, Delete It' }))

    await waitFor(() => expect(remove.calls).toBe(1))
    await waitFor(() => expect(within(panel).queryByTestId('underwriting-row-1')).not.toBeInTheDocument())
    expect(toast.success).toHaveBeenLastCalledWith('Funding type "Term Loan" and its underwriting logic removed successfully')
  })

  it('keeps the funding type and its rule when the delete is cancelled', async () => {
    allowBackgroundCalls()
    api('get', '/admin/funding-types', { status: true, data: CATEGORIES })
    api('get', '/admin/lenders/31', { status: true, data: LENDER })
    const remove = api('delete', '/admin/lenders/31/underwriting-logic/1', { status: true, data: LENDER })
    const user = mount()

    const panel = await openUnderwriting(user)
    await user.click(within(panel).getByRole('button', { name: 'Remove Term Loan' }))
    await screen.findByText('Remove this funding type?')
    await user.click(screen.getByRole('button', { name: 'Close' }))

    expect(remove.calls).toBe(0)
    expect(within(panel).getByLabelText('Term Loan min_fico')).toHaveValue(640)
  })

  it('opens the tab with the error when the API refuses a rule', async () => {
    allowBackgroundCalls()
    api('get', '/admin/funding-types', { status: true, data: CATEGORIES })
    api('get', '/admin/lenders/31', { status: true, data: LENDER })
    api('put', '/admin/lenders/31', { status: false, message: 'Invalid', errors: {
      'underwriting_logic.1.min_fico': ['The FICO score must be a whole number from 300 to 850.'],
    } }, 422)
    const user = mount()

    await screen.findByDisplayValue('QA-TEST R3 Temp Lender LLC')
    await user.click(screen.getByRole('button', { name: /update/i }))

    const panel = await screen.findByRole('tabpanel', { name: 'Underwriting Logic' })
    expect(within(panel).getByText('The FICO score must be a whole number from 300 to 850.')).toBeInTheDocument()
    expect(within(panel).getByLabelText('Term Loan min_fico')).toHaveClass('is-invalid')
    expect(screen.queryByText('Lenders list')).not.toBeInTheDocument()
  })

  it('says to pick a funding type first when the lender has none', async () => {
    allowBackgroundCalls()
    api('get', '/admin/funding-types', { status: true, data: CATEGORIES })
    api('get', '/admin/lenders/31', { status: true, data: { ...LENDER, product_categories: [], underwriting_logic: [] } })
    const user = mount()

    const panel = await openUnderwriting(user)
    expect(within(panel).getByTestId('underwriting-no-funding-types')).toBeInTheDocument()
  })

  it('opens a new lender on its Underwriting Logic tab after Save', async () => {
    allowBackgroundCalls()
    api('get', '/admin/funding-types', { status: true, data: CATEGORIES })
    api('post', '/admin/lenders/check-duplicates', { status: true, data: { name: [], legal_name: [] } })
    const create = api('post', '/admin/lenders', { status: true, data: { ...LENDER, underwriting_logic: undefined } }, 201)
    api('get', '/admin/lenders/31', { status: true, data: { ...LENDER, underwriting_logic: [] } })
    const user = mount('/lenders/create')

    await user.type(await screen.findByPlaceholderText('Enter lender name'), 'QA-TEST R3 Temp Lender')
    await user.click(screen.getByRole('button', { name: /save/i }))

    await waitFor(() => expect(create.bodies).toHaveLength(1))
    expect(toast.success).toHaveBeenLastCalledWith('Lender created successfully')
    const tab = await screen.findByRole('tab', { name: /underwriting logic/i })
    expect(tab).toHaveAttribute('aria-selected', 'true')
    expect(await screen.findByRole('tabpanel', { name: 'Underwriting Logic' })).toBeInTheDocument()
  })

  it('goes back to the list when the API gives no id for the new lender', async () => {
    allowBackgroundCalls()
    api('get', '/admin/funding-types', { status: true, data: CATEGORIES })
    api('post', '/admin/lenders/check-duplicates', { status: true, data: { name: [], legal_name: [] } })
    api('post', '/admin/lenders', { status: true, data: null }, 201)
    const user = mount('/lenders/create')

    await user.type(await screen.findByPlaceholderText('Enter lender name'), 'No Id Lender')
    await user.click(screen.getByRole('button', { name: /save/i }))

    expect(await screen.findByText('Lenders list')).toBeInTheDocument()
  })

  it('is not on Add Lender', async () => {
    allowBackgroundCalls()
    api('get', '/admin/funding-types', { status: true, data: CATEGORIES })
    mount('/lenders/create')

    await screen.findByPlaceholderText('Enter lender name')
    expect(screen.queryByRole('tab', { name: /underwriting logic/i })).not.toBeInTheDocument()
  })
})
