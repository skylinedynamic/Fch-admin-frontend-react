import { describe, expect, it, vi } from 'vitest'
import userEvent from '@testing-library/user-event'
import { Route, Routes } from 'react-router-dom'
import { renderWithProviders, screen } from '../../test-utils'
import { allowBackgroundCalls, api } from '../pageHarness'

vi.mock('react-toastify', () => ({ toast: { success: vi.fn(), error: vi.fn() } }))
// A rich-text editor; it needs a real canvas, which jsdom has not.
vi.mock('../../../src/hooks/useSummernote', () => ({ useSummernote: () => ({ editorRef: () => {} }) }))

import LenderForm from '../../../src/pages/lenders/LenderForm'

/**
 * An API refusal of the Legal Name shows under the field and nothing is saved.
 * (R2 BUG-008 made the legal name unique; since 2026-11-11 it may repeat and
 * the form only warns - LenderForm.lenderCode.test.tsx - but any other
 * refusal of the field still shows here.)
 */
describe('Edit Lender: a legal name another lender has', () => {
  it('shows the refusal under Legal Name and stays on the form', async () => {
    allowBackgroundCalls()
    api('get', '/admin/lenders/7', { status: true, data: {
      id: 7, name: 'Kabbage', legal_name: 'Kabbage Inc.', product_categories: [], contact_name: 'Lee', contact_title: 'Partnerships',
      contact_email: 'lee@kabbage.example.org', contact_phone: '(555) 234-0100', status: 'Active',
    } })
    const update = api('put', '/admin/lenders/7', { status: false, message: 'A lender with this legal name already exists.', errors: {
      legal_name: 'A lender with this legal name already exists.',
    } }, 422)
    const user = userEvent.setup()
    renderWithProviders(
      <Routes>
        <Route path="/lenders/:id" element={<LenderForm />} />
        <Route path="/lenders" element={<p>Lenders list</p>} />
      </Routes>,
      { route: '/lenders/7' }
    )

    const legalName = await screen.findByDisplayValue('Kabbage Inc.')
    await user.clear(legalName)
    await user.type(legalName, 'Kabbage Funding LLC')
    await user.click(screen.getByRole('button', { name: /update/i }))

    expect(await screen.findByText('A lender with this legal name already exists.')).toBeInTheDocument()
    expect(legalName).toHaveClass('is-invalid')
    expect(update.bodies[0]).toMatchObject({ legal_name: 'Kabbage Funding LLC' })
    expect(screen.queryByText('Lenders list')).not.toBeInTheDocument()
  })
})
