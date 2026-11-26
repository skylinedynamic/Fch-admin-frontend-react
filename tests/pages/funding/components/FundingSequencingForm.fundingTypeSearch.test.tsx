import { describe, expect, it, vi } from 'vitest'
import userEvent from '@testing-library/user-event'
import { Route, Routes } from 'react-router-dom'
import { renderWithProviders, screen, waitFor } from '../../../test-utils'
import { allowBackgroundCalls, api } from '../../pageHarness'

vi.mock('react-toastify', () => ({ toast: { success: vi.fn(), error: vi.fn() } }))
// A rich-text editor; it needs a real canvas, which jsdom has not.
vi.mock('../../../../src/hooks/useSummernote', () => ({ useSummernote: () => ({ editorRef: () => {} }) }))

import FundingSequencingForm from '../../../../src/pages/funding/components/FundingSequencingForm'

/** Funding Sequence > Funding Type: a long list, so it can be searched. */
const TYPES = [
  { id: 1, name: 'Business Line of Credit', status: 'Active' },
  { id: 2, name: 'Term Loan', status: 'Active' },
  { id: 3, name: 'Working Capital', status: 'Active' },
  { id: 4, name: 'Merchant Cash Advance', status: 'Active' },
]

describe('Funding Sequence › Funding Type', () => {
  it('has a search box that narrows the funding types', async () => {
    allowBackgroundCalls()
    api('get', '/admin/lenders/product-categories', { status: true, data: TYPES })
    const user = userEvent.setup()
    renderWithProviders(
      <Routes>
        <Route path="/funding/create" element={<FundingSequencingForm />} />
      </Routes>,
      { route: '/funding/create' }
    )

    const dropdown = await waitFor(() => {
      const found = document.getElementById('funding_type_id')?.closest('.p-dropdown')
      if (!found) throw new Error('no Funding Type dropdown')
      return found
    })
    await user.click(dropdown as Element)

    const search = await screen.findByPlaceholderText('Search funding types')
    await user.type(search, 'work')

    await waitFor(() => {
      const items = Array.from(document.querySelectorAll('.p-dropdown-item')).map((el) => el.textContent?.trim())
      expect(items).toEqual(['Working Capital'])
    })
  })
})
