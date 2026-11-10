import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { http, HttpResponse } from 'msw'
import userEvent from '@testing-library/user-event'
import { Route, Routes } from 'react-router-dom'
import { renderWithProviders, screen, waitFor, within } from '../../test-utils'
import { server } from '../../mocks/server'
import { useAuthStore } from '../../../src/store/auth'

const toast = vi.hoisted(() => ({ success: vi.fn(), error: vi.fn(), warn: vi.fn() }))
vi.mock('react-toastify', () => ({ toast }))
vi.mock('bootstrap/js/dist/modal', () => ({
  default: class {
    constructor(private el: HTMLElement) {}
    show() { this.el.classList.add('show'); this.el.removeAttribute('aria-hidden') }
    hide() { this.el.classList.remove('show'); this.el.setAttribute('aria-hidden', 'true') }
    dispose() {}
  },
}))

const { default: Partners } = await import('../../../src/pages/partners/Partners')

/**
 * BUG-205: the host company is listed in Partners and could be ticked, then
 * "archived" - the API skipped it but reported success. Its row cannot be
 * selected, so it can be neither archived nor deleted from the list.
 */
const rows = [
  { id: 1, company_name: 'Four Corner Holdings', full_name: 'Host Admin', email: 'h@example.test', status: 'Active', is_host: true },
  { id: 5, company_name: 'Hardin Co', full_name: 'Reagan Hardin', email: 'r@example.test', status: 'Active', is_host: false },
]

const rowCheckbox = (name: string) =>
  within(screen.getByText(name).closest('tr') as HTMLElement).getAllByRole('checkbox')[0]

let archived: unknown[] = []

beforeEach(() => {
  archived = []
  useAuthStore.setState({ user: { id: 1, is_host: 1, permissions: ['view partners', 'delete partners', 'update partners'] } } as never)
  server.use(
    http.post('*/admin/partners/fetch-partners', () => HttpResponse.json({ status: true, data: rows, meta: { total: 2 } })),
    http.post('*/admin/partners-stats', () => HttpResponse.json({ status: true, data: {} })),
    http.post('*/common/get-all-users*', () => HttpResponse.json({ status: true, data: [] })),
    http.post('*/admin/partners/archive', async ({ request }) => {
      archived.push(await request.json())
      return HttpResponse.json({ status: true, message: 'Partner(s) archived successfully.' })
    })
  )
})
afterEach(() => server.resetHandlers())

const renderPartners = () =>
  renderWithProviders(
    <Routes>
      <Route path="/partners" element={<Partners />} />
      <Route path="/partners/:id" element={<div>Edit partner page</div>} />
    </Routes>,
    { route: '/partners' }
  )

describe('Partners - the host company row', () => {
  it('cannot be ticked', async () => {
    renderPartners()
    await screen.findByText('Host Admin')

    // PrimeReact disables the row's real input and greys its box.
    const input = (name: string) => (screen.getByText(name).closest('tr') as HTMLElement).querySelector('input[type="checkbox"]')
    expect(input('Host Admin')).toBeDisabled()
    expect(rowCheckbox('Host Admin')).toHaveClass('p-disabled')
    expect(input('Reagan Hardin')).not.toBeDisabled()
  })

  it('clicking it selects nothing, so archiving never sends the host', async () => {
    // The Actions dropdown is Bootstrap's; its items are in the DOM already.
    const user = userEvent.setup({ pointerEventsCheck: 0 })
    renderPartners()
    await screen.findByText('Host Admin')

    await user.click(rowCheckbox('Host Admin'))
    await user.click(rowCheckbox('Reagan Hardin'))
    await user.click(await screen.findByRole('button', { name: /archive selected/i, hidden: true }))

    await waitFor(() => expect(archived).toHaveLength(1))
    expect(archived[0]).toEqual({ ids: [5] })
  })
})
