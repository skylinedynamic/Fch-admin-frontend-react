import { afterEach, describe, expect, it, vi } from 'vitest'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { toast } from 'react-toastify'
import { server } from '../../../mocks/server'
import { cleanup, renderWithProviders, screen, waitFor, within } from '../../../test-utils'
import { useAuthStore } from '../../../../src/store/auth/authStore'
import ChangeRequests from '../../../../src/pages/applications/change-requests/ChangeRequests'

vi.mock('react-toastify', () => ({ toast: { success: vi.fn(), error: vi.fn() } }))

// Synchronous stand-in for Bootstrap's Modal (as in DeleteBlockedModal.test.tsx).
vi.mock('bootstrap/js/dist/modal', () => {
  class FakeModal {
    private el: HTMLElement
    constructor(el: HTMLElement) { this.el = el }
    show() { this.el.classList.add('show'); this.el.removeAttribute('aria-hidden') }
    hide() { this.el.classList.remove('show'); this.el.setAttribute('aria-hidden', 'true') }
    dispose() {}
  }
  return { default: FakeModal }
})

/**
 * BUG-041: deciding a request another tab already decided. The API refuses it
 * with 422 and a reason. The review closes and a dialog gives that reason (no
 * toast, never "Something went wrong"); its one button reloads the list.
 */
const ALREADY_PROCESSED = 'This change request has already been processed and cannot be modified.'

const row = (overrides: Record<string, unknown> = {}) => ({
  id: 7, partner_id: 2, borrower_id: 4, field_name: 'business_name', old_value: 'Old Co', new_value: 'New Co', is_masked: false,
  status: 'Pending', updated_by: null, note: null, created_at: '2026-10-21', updated_at: '2026-10-21',
  borrower_business_name: 'Chen Co', borrower_first_name: 'Michael', borrower_last_name: 'Chen', updater_name: null,
  ...overrides,
})

/** The list shows the request Pending until the decision was tried, Rejected after; the decision is refused. */
const serve = () => {
  let decided = false
  const listCalls = { count: 0 }
  server.use(
    http.post('*/admin/change-requests', () => {
      listCalls.count++
      const data = [row({ status: decided ? 'Rejected' : 'Pending' })]
      return HttpResponse.json({ status: true, data, meta: { total: 1, current_page: 1, per_page: 15, last_page: 1 } })
    }),
    http.patch('*/admin/change-requests/:id', () => {
      decided = true
      return HttpResponse.json({ status: false, message: ALREADY_PROCESSED }, { status: 422 })
    }),
    http.all('*', () => HttpResponse.json({ status: true, data: [] }))
  )
  return listCalls
}

const signIn = () =>
  useAuthStore.setState({ token: 'tok', user: { id: 1, name: 'Host', is_host: 1, entity_type: 'Partner', permissions: ['view change requests', 'update change requests'] } })

describe('ChangeRequests › deciding a request that is no longer pending (BUG-041)', () => {
  afterEach(() => {
    cleanup()
    server.resetHandlers()
    vi.mocked(toast.error).mockClear()
    useAuthStore.setState({ token: undefined, user: null })
  })

  it('closes the review, gives the API reason in a dialog and reloads the list from its button', async () => {
    signIn()
    const listCalls = serve()
    const user = userEvent.setup()
    renderWithProviders(<ChangeRequests />, { route: '/intake-review/change-requests' })

    await user.click(await screen.findByText('New Co'))
    const review = (await screen.findByText('Review Change Request')).closest('.modal-content') as HTMLElement
    await user.click(within(review).getByRole('button', { name: /Confirm Approved/ }))

    const dialog = await screen.findByRole('dialog', { name: 'Request Not Updated' })
    expect(within(dialog).getByText(ALREADY_PROCESSED)).toBeInTheDocument()
    await waitFor(() => expect(screen.queryByText('Review Change Request')).not.toBeInTheDocument())
    expect(toast.error).not.toHaveBeenCalled()

    const callsBefore = listCalls.count
    await user.click(within(dialog).getByRole('button', { name: 'Reload list' }))

    await waitFor(() => expect(listCalls.count).toBeGreaterThan(callsBefore))
    await waitFor(() => {
      const tableRow = screen.getByText('New Co').closest('tr') as HTMLElement
      expect(within(tableRow).getByText('Rejected')).toBeInTheDocument()
    })
    expect(dialog).not.toHaveClass('show')
  })
})
