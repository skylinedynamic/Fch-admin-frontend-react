import { describe, expect, it, vi } from 'vitest'
import userEvent from '@testing-library/user-event'
import { Route, Routes } from 'react-router-dom'
import { renderWithProviders, screen, waitFor } from '../../test-utils'
import { allowBackgroundCalls, api } from '../pageHarness'

vi.mock('react-toastify', () => ({ toast: { success: vi.fn(), error: vi.fn() } }))
// A rich-text editor; it needs a real canvas, which jsdom has not.
vi.mock('../../../src/hooks/useSummernote', () => ({ useSummernote: () => ({ editorRef: () => {} }) }))

import LenderForm from '../../../src/pages/lenders/LenderForm'

/**
 * Add/Edit Lender (2026-11-11):
 * - Lender Code: unique and made by the system ("LND-1234") - shown, never typed.
 * - Lender Name and Legal Name may repeat; the form warns when another lender
 *   already has them, and still saves.
 */
const KABBAGE = {
  id: 7, lender_code: 'LND-4821', name: 'Kabbage', legal_name: 'Kabbage Inc.', product_categories: [], contact_name: 'Lee',
  contact_title: 'Partnerships', contact_email: 'lee@kabbage.example.org', contact_phone: '(555) 234-0100', status: 'Active',
}
const OTHER = { id: 9, lender_code: 'LND-0107', name: 'Kabbage', legal_name: 'Kabbage Inc.' }
const NONE = { status: true, data: { name: [], legal_name: [] } }

const mount = (route: string) => {
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

// The Lender Code is made by the system and shown in the lists and the
// Lender Information table - not on Add or Edit Lender.
describe('Lender form › Lender Code', () => {
  it('has no Lender Code field when editing, and does not send the code back', async () => {
    allowBackgroundCalls()
    api('get', '/admin/lenders/7', { status: true, data: KABBAGE })
    api('post', '/admin/lenders/check-duplicates', NONE)
    const update = api('put', '/admin/lenders/7', { status: true, data: KABBAGE })
    const user = mount('/lenders/7')

    await screen.findByDisplayValue('Kabbage Inc.')
    expect(screen.queryByLabelText('Lender Code')).not.toBeInTheDocument()
    expect(screen.queryByText('Lender Code')).not.toBeInTheDocument()
    expect(screen.queryByDisplayValue('LND-4821')).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /update/i }))
    await waitFor(() => expect(update.bodies).toHaveLength(1))
    expect(update.bodies[0]).not.toHaveProperty('lender_code')
  })

  it('has no Lender Code field when adding', async () => {
    allowBackgroundCalls()
    mount('/lenders/create')

    await screen.findByPlaceholderText('Enter lender name')
    expect(screen.queryByLabelText('Lender Code')).not.toBeInTheDocument()
    expect(screen.queryByText('Lender Code')).not.toBeInTheDocument()
  })
})

/** The possible-duplicate warning under a field, by field name. */
const warning = (field: 'name' | 'legal_name') => screen.findByTestId(`duplicate-warning-${field}`)

describe('Lender form › possible duplicate warning', () => {
  // One short line: which lender already has it, by its Lender Code.
  it('warns when another lender has the Lender Name, naming it by its Lender Code', async () => {
    allowBackgroundCalls()
    const check = api('post', '/admin/lenders/check-duplicates', { status: true, data: { name: [OTHER], legal_name: [] } })
    const user = mount('/lenders/create')

    const name = await screen.findByPlaceholderText('Enter lender name')
    await user.type(name, 'Kabbage')
    await user.tab()

    expect((await warning('name')).textContent?.trim()).toBe('Name already used by LND-0107')
    expect(check.bodies[check.bodies.length - 1]).toMatchObject({ name: 'Kabbage' })
    expect(name).not.toHaveClass('is-invalid')
  })

  it('warns when another lender has the Legal Name, leaving out the lender being edited', async () => {
    allowBackgroundCalls()
    api('get', '/admin/lenders/7', { status: true, data: KABBAGE })
    const check = api('post', '/admin/lenders/check-duplicates', { status: true, data: { name: [], legal_name: [OTHER] } })
    const user = mount('/lenders/7')

    const legalName = await screen.findByDisplayValue('Kabbage Inc.')
    await user.click(legalName)
    await user.tab()

    expect((await warning('legal_name')).textContent?.trim()).toBe('Legal name already used by LND-0107')
    expect(check.bodies[check.bodies.length - 1]).toMatchObject({ legal_name: 'Kabbage Inc.', ignore_id: 7 })
  })

  it('lists every lender with the name', async () => {
    allowBackgroundCalls()
    api('post', '/admin/lenders/check-duplicates', { status: true, data: { name: [OTHER, { ...OTHER, id: 10, lender_code: 'LND-020810' }], legal_name: [] } })
    const user = mount('/lenders/create')

    await user.type(await screen.findByPlaceholderText('Enter lender name'), 'Kabbage')
    await user.tab()

    const shown = await warning('name')
    expect(shown.textContent?.trim()).toBe('Name already used by LND-0107, LND-020810')
    expect(Array.from(shown.querySelectorAll('strong')).map((el) => el.textContent)).toEqual(['LND-0107', 'LND-020810'])
  })

  it('still saves a lender whose name another lender has', async () => {
    allowBackgroundCalls()
    api('get', '/admin/lenders/7', { status: true, data: KABBAGE })
    api('post', '/admin/lenders/check-duplicates', { status: true, data: { name: [OTHER], legal_name: [OTHER] } })
    const update = api('put', '/admin/lenders/7', { status: true, data: KABBAGE })
    const user = mount('/lenders/7')

    const name = await screen.findByDisplayValue('Kabbage')
    await user.click(name)
    await user.tab()
    await warning('name')

    await user.click(screen.getByRole('button', { name: /update/i }))

    expect(await screen.findByText('Lenders list')).toBeInTheDocument()
    expect(update.bodies[0]).toMatchObject({ name: 'Kabbage', legal_name: 'Kabbage Inc.' })
  })

  it('shows no warning when no other lender has the name, and drops it once the name changes', async () => {
    allowBackgroundCalls()
    const check = api('post', '/admin/lenders/check-duplicates', { status: true, data: { name: [OTHER], legal_name: [] } })
    const user = mount('/lenders/create')

    const name = await screen.findByPlaceholderText('Enter lender name')
    await user.type(name, 'Kabbage')
    await user.tab()
    await warning('name')

    check.calls = 0
    api('post', '/admin/lenders/check-duplicates', NONE)
    await user.type(name, ' Two')
    expect(screen.queryByTestId('duplicate-warning-name')).not.toBeInTheDocument()
    await user.tab()
    await waitFor(() => expect(screen.queryByTestId('duplicate-warning-name')).not.toBeInTheDocument())
  })

  it('does not ask about an empty name', async () => {
    allowBackgroundCalls()
    const check = api('post', '/admin/lenders/check-duplicates', NONE)
    const user = mount('/lenders/create')

    await user.click(await screen.findByPlaceholderText('Enter lender name'))
    await user.tab()

    expect(check.calls).toBe(0)
  })

  it('does not ask about a lender saved without a legal name', async () => {
    allowBackgroundCalls()
    api('get', '/admin/lenders/7', { status: true, data: { ...KABBAGE, legal_name: null } })
    const check = api('post', '/admin/lenders/check-duplicates', NONE)
    const user = mount('/lenders/7')

    await screen.findByDisplayValue('Kabbage')
    await user.click(screen.getByPlaceholderText('Enter legal name'))
    await user.tab()

    expect(check.calls).toBe(0)
  })

  it('names a lender without a Lender Code yet by its name and legal name', async () => {
    allowBackgroundCalls()
    api('post', '/admin/lenders/check-duplicates', { status: true, data: { name: [{ ...OTHER, lender_code: null }], legal_name: [] } })
    const user = mount('/lenders/create')

    await user.type(await screen.findByPlaceholderText('Enter lender name'), 'Kabbage')
    await user.tab()

    expect((await warning('name')).textContent?.trim()).toBe('Name already used by Kabbage - Kabbage Inc.')
  })

  it('keeps the warning while another field is edited', async () => {
    allowBackgroundCalls()
    api('post', '/admin/lenders/check-duplicates', { status: true, data: { name: [OTHER], legal_name: [] } })
    const user = mount('/lenders/create')

    await user.type(await screen.findByPlaceholderText('Enter lender name'), 'Kabbage')
    await user.tab()
    await warning('name')

    await user.type(document.querySelector('input[name="contact_name"]') as HTMLElement, 'Lee')

    expect(screen.getByTestId('duplicate-warning-name')).toBeInTheDocument()
  })
})

// Product Categories reads like the ISO Status and Status selects beside it
// (it looked disabled): the same corners, plus the border and placeholder
// set in lenders.css (lenderCategoriesPlaceholder.test.ts).
describe('Lender form › Product Categories', () => {
  it('has the same rounded corners as the ISO Status select', async () => {
    allowBackgroundCalls()
    const { container } = renderWithProviders(
      <Routes>
        <Route path="/lenders/create" element={<LenderForm />} />
      </Routes>,
      { route: '/lenders/create' }
    )

    await screen.findByPlaceholderText('Enter lender name')
    const categories = await waitFor(() => {
      const found = container.querySelector('.lender-categories-field .p-multiselect')
      if (!found) throw new Error('no Product Categories select')
      return found
    })
    expect(categories).toHaveClass('rounded-3')
    expect(container.querySelector('#iso_status')?.closest('.p-dropdown')).toHaveClass('rounded-3')
  })
})
