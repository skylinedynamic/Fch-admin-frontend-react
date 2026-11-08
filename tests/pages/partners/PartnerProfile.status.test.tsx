import { beforeEach, describe, expect, it, vi } from 'vitest'
import userEvent from '@testing-library/user-event'
import { screen, waitFor } from '../../test-utils'
import { allowBackgroundCalls, api, renderPage, signIn } from '../pageHarness'

vi.mock('react-toastify', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-toastify')>()
  return { ...actual, toast: Object.assign(vi.fn(), { info: vi.fn(), success: vi.fn(), error: vi.fn(), warn: vi.fn() }) }
})
vi.mock('bootstrap/js/dist/modal', () => import('../../mocks/fakeBootstrapModal'))
vi.mock('../../../src/hooks/useSummernote', () => ({ useSummernote: () => ({ editorRef: () => {} }) }))

import PartnerProfile from '../../../src/pages/partners/PartnerProfile'

const suspendedPartner = {
  id: 86,
  full_name: 'QA Owner',
  company_name: 'QA-TEST Admin Run2 Co',
  email: 'qa@example.test',
  partner_type: 'White Label Partner',
  status: 'Suspended',
  assigned_user_id: '',
  country: 'United States',
  is_host: 0,
  is_free_trail: 1,
}

const statusDropdown = () =>
  screen.getByText('Status', { selector: 'label' }).parentElement!.querySelector('.p-dropdown') as HTMLElement

beforeEach(() => vi.clearAllMocks())

/**
 * Defect: BUG-171 - after a partner was saved as Suspended, picking Active /
 * Inactive / OnBoarding on Status & Agent left the field on Suspended, so the
 * partner could not be reactivated.
 */
describe('Partner profile › Status & Agent', () => {
  it.each(['Active', 'Inactive', 'OnBoarding'])('a suspended partner can be set to %s', async (option) => {
    signIn({ permissions: ['view partners', 'update partners'] })
    allowBackgroundCalls()
    api('get', '/admin/partners-details/86', { status: true, message: 'ok', data: suspendedPartner })
    // The tab loads its status and agent from their own endpoint.
    api('get', '/admin/partners/86/status-agent', {
      status: true, message: 'ok', data: { id: 86, status: 'Suspended', assign_to: null, agent: null },
    })
    const user = userEvent.setup()
    renderPage(<PartnerProfile />, { path: '/partners/:id', route: '/partners/86' })

    await waitFor(() => expect(statusDropdown().querySelector('.p-dropdown-label')).toHaveTextContent('Suspended'))

    await user.click(statusDropdown())
    const item = await waitFor(() => {
      const found = Array.from(document.querySelectorAll('.p-dropdown-item')).find((o) => o.textContent === option)
      expect(found).toBeTruthy()
      return found as HTMLElement
    })
    await user.click(item)

    await waitFor(() => expect(statusDropdown().querySelector('.p-dropdown-label')).toHaveTextContent(option))
  })
})
