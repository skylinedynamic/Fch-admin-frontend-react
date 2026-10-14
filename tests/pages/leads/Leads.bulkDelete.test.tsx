import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { http, HttpResponse } from 'msw'
import userEvent from '@testing-library/user-event'
import { renderWithProviders, screen, waitFor, within } from '../../test-utils'
import { server } from '../../mocks/server'
import { useAuthStore } from '../../../src/store/auth'
import Leads from '../../../src/pages/leads/Leads'

// DeleteConfirmationModal drives Bootstrap's real Modal, whose transition
// callbacks fire after the page has unmounted and throw against a ref that is
// gone. A synchronous fake, as in EditConfirmationModal.test.tsx.
vi.mock('bootstrap/js/dist/modal', () => {
  class FakeModal {
    private el: HTMLElement
    constructor(el: HTMLElement) {
      this.el = el
    }
    show() {
      this.el.classList.add('show')
      this.el.style.display = 'block'
      this.el.removeAttribute('aria-hidden')
    }
    hide() {
      this.el.classList.remove('show')
      this.el.style.display = 'none'
      this.el.setAttribute('aria-hidden', 'true')
    }
    dispose() {}
  }
  return { default: FakeModal }
})

const leads = [
  { id: 11, opportunity: 'Alpha Co', contact_person: 'Ann', email: 'ann@example.test', status: 'New Lead', lead_type: 'Borrower' },
  { id: 12, opportunity: 'Beta Co', contact_person: 'Ben', email: 'ben@example.test', status: 'New Lead', lead_type: 'Borrower' },
]

beforeEach(() => {
  useAuthStore.setState({ user: { id: 1, is_host: 0, permissions: ['view leads', 'delete leads'] } } as never)
  server.use(
    http.post('*/common/leads/fetch-leads', () => HttpResponse.json({ status: true, data: leads, meta: { total: 2 } })),
    http.post('*/common/get-all-users', () => HttpResponse.json({ status: true, data: [] })),
    http.post('*/common/contacts/fetch-contacts', () => HttpResponse.json({ status: true, data: [] })),
    // Loaded by the convert modal, which is always mounted.
    http.get('*/common/borrower-plans', () => HttpResponse.json({ status: true, data: [] })),
    http.get('*/common/partner-plans', () => HttpResponse.json({ status: true, data: [] })),
    http.get('*/common/subscriptions/partner-borrower-fee', () => HttpResponse.json({ status: true, data: null }))
  )
})
afterEach(() => server.resetHandlers())

/** The row's selection checkbox, looked up fresh - selecting re-renders the table. */
const rowCheckbox = (name: string) =>
  within(screen.getByText(name).closest('tr') as HTMLElement).getAllByRole('checkbox')[0]

describe('Leads - delete selected', () => {
  /**
   * The screen used to send one DELETE per selected lead; a failure part-way
   * left some deleted and some not. It now deletes the selection in one call.
   */
  it('deletes every selected lead in a single bulk call', async () => {
    const bulk = vi.fn()
    const single = vi.fn()
    server.use(
      http.post('*/common/leads/multiple-delete', async ({ request }) => {
        bulk(await request.json())
        return HttpResponse.json({ status: true, message: 'Lead deleted successfully.', data: { deleted: 2 } })
      }),
      http.delete('*/common/leads/:id', () => {
        single()
        return HttpResponse.json({ status: true })
      })
    )
    const user = userEvent.setup()
    renderWithProviders(<Leads />, { route: '/leads' })

    await screen.findByText('Ann')
    await user.click(rowCheckbox('Ann'))
    await user.click(rowCheckbox('Ben'))

    await user.click(await screen.findByRole('button', { name: /delete selected/i }))
    await user.click(await screen.findByRole('button', { name: /yes, delete it/i }))

    await waitFor(() => expect(bulk).toHaveBeenCalledOnce())
    expect(bulk).toHaveBeenCalledWith({ ids: [11, 12] })
    expect(single).not.toHaveBeenCalled()
  })

  it('deletes a single selected lead through the same call', async () => {
    const bulk = vi.fn()
    server.use(
      http.post('*/common/leads/multiple-delete', async ({ request }) => {
        bulk(await request.json())
        return HttpResponse.json({ status: true, message: 'Lead deleted successfully.', data: { deleted: 1 } })
      })
    )
    const user = userEvent.setup()
    renderWithProviders(<Leads />, { route: '/leads' })

    await screen.findByText('Ann')
    await user.click(rowCheckbox('Ben'))

    await user.click(await screen.findByRole('button', { name: /delete selected/i }))
    await user.click(await screen.findByRole('button', { name: /yes, delete it/i }))

    await waitFor(() => expect(bulk).toHaveBeenCalledOnce())
    expect(bulk).toHaveBeenCalledWith({ ids: [12] })
  })
})
