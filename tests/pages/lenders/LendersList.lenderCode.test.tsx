import { describe, expect, it, vi } from 'vitest'

vi.mock('react-toastify', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-toastify')>()
  return { ...actual, toast: Object.assign(vi.fn(), { info: vi.fn(), success: vi.fn(), error: vi.fn(), warn: vi.fn() }) }
})
vi.mock('bootstrap/js/dist/modal', () => import('../../mocks/fakeBootstrapModal'))
vi.mock('../../../src/hooks/useSummernote', () => ({ useSummernote: () => ({ editorRef: () => {} }) }))

import userEvent from '@testing-library/user-event'
import { screen, waitFor, within } from '../../test-utils'
import { allowBackgroundCalls, api, paginated, renderPage, signIn } from '../pageHarness'
import LendersList from '../../../src/pages/lenders/LendersList'

/**
 * Lenders list: each lender's Lender Code (LND-1234, made by the system) in its
 * own column, sortable - two lenders may share a name and a legal name.
 */
const ROWS = [
  { id: 61, lender_code: 'LND-4821', name: 'Kabbage', legal_name: 'Kabbage Inc.', product_categories: [], contact_name: 'Fay', contact_phone: '(555) 600-0001', iso_status: 'Approved', status: 'Active' },
  { id: 62, lender_code: 'LND-0107', name: 'Kabbage', legal_name: 'Kabbage Inc.', product_categories: [], contact_name: 'Sam', contact_phone: '(555) 600-0002', iso_status: 'Approved', status: 'Active' },
]

const mount = () => {
  signIn({ permissions: ['view lenders'] })
  allowBackgroundCalls()
  const list = api('get', '/admin/lenders', paginated(ROWS))
  const user = userEvent.setup()
  renderPage(<LendersList />, { path: '/lenders' })
  return { list, user }
}

describe('Lenders list › Lender Code', () => {
  it("shows each lender's Lender Code in its own column", async () => {
    mount()

    const header = await screen.findByRole('columnheader', { name: /lender code/i })
    expect(header).toBeInTheDocument()
    const row = screen.getByText('LND-4821').closest('tr') as HTMLElement
    expect(within(row).getByText('Fay')).toBeInTheDocument()
    expect(screen.getByText('LND-0107')).toBeInTheDocument()
  })

  it('sorts by Lender Code', async () => {
    const { list, user } = mount()
    await screen.findByText('LND-4821')

    await user.click(screen.getByRole('columnheader', { name: /lender code/i }))

    await waitFor(() => {
      const url = new URL(list.urls[list.urls.length - 1])
      expect(url.searchParams.get('sort_field')).toBe('lender_code')
    })
  })
})
