import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { http, HttpResponse } from 'msw'
import userEvent from '@testing-library/user-event'
import { screen, waitFor } from '@testing-library/react'
import { renderWithProviders } from '../../../test-utils'
import { server } from '../../../mocks/server'
import { useAuthStore } from '../../../../src/store/auth/authStore'
import ClientInfoSection from '../../../../src/pages/clients/components/ClientInfoSection'

vi.mock('react-toastify', () => ({ toast: Object.assign(vi.fn(), { success: vi.fn(), error: vi.fn(), info: vi.fn(), warn: vi.fn() }) }))
// Summernote needs a real canvas at import time.
vi.mock('../../../../src/hooks/useSummernote', () => ({ useSummernote: () => ({ editorRef: () => {} }) }))

/**
 * BUG-055: "Assign to" lists the client's own partner's team. The form asked
 * get-all-users without a partner, so the host opening a partner's client was
 * offered the host's staff. An assignee saved before that, outside the team,
 * still shows - and still saves - rather than the field going blank.
 */
const HOST = 1
const PARTNER = 7
const PARTNER_TEAM = [{ id: 70, name: 'Wanda Partner' }, { id: 71, name: 'Will Staff' }]
const HOST_TEAM = [{ id: 10, name: 'Hal Host' }]

const CLIENT = {
  id: 5, first_name: 'Ada', last_name: 'Lovelace', email: 'ada@example.test', phone_number: '(555) 234-5678',
  country: 'United States', business_country: 'United States', partner_id: PARTNER, assign_id: 70, assign_name: 'Wanda Partner',
}

let teamRequests: Record<string, unknown>[] = []

const serve = (client: Record<string, unknown> = CLIENT) => {
  teamRequests = []
  server.use(
    http.get('*/common/borrowers/5', () => HttpResponse.json({ status: true, data: client })),
    http.post('*/common/get-all-users', async ({ request }) => {
      const body = ((await request.json()) ?? {}) as Record<string, unknown>
      teamRequests.push(body)
      return HttpResponse.json({ status: true, data: body.partner_id === PARTNER ? PARTNER_TEAM : HOST_TEAM })
    }),
    http.all('*', () => HttpResponse.json({ status: true, data: [] }))
  )
}

const assignTo = () => screen.getByLabelText('Assign to').closest('.p-dropdown') as HTMLElement
/** The name the field shows - PrimeReact also keeps a hidden copy of the selected option. */
const shown = () => assignTo().querySelector('.p-dropdown-label')?.textContent

beforeEach(() => {
  useAuthStore.setState({ user: { id: 10, name: 'Hal Host', partner_id: HOST, is_host: 1 } as never })
})
afterEach(() => server.resetHandlers())

describe('Client -> Assign to', () => {
  it("the host on a partner's client is offered that partner's team, not its own", async () => {
    serve()
    const user = userEvent.setup()
    renderWithProviders(<ClientInfoSection clientId="5" isHost countries={[]} states={[]} cities={[]} />)

    await waitFor(() => expect(teamRequests).toContainEqual({ partner_id: PARTNER }))
    await waitFor(() => expect(shown()).toBe('Wanda Partner'))

    await user.click(assignTo())
    const options = await waitFor(() => {
      const items = Array.from(assignTo().querySelectorAll('.p-dropdown-item')).map((o) => o.textContent)
      expect(items.length).toBeGreaterThan(0)
      return items
    })
    expect(options).toEqual(['Wanda Partner', 'Will Staff'])
  })

  it('a new client is assigned from your own team', async () => {
    serve()
    renderWithProviders(<ClientInfoSection isHost countries={[]} states={[]} cities={[]} />)

    await waitFor(() => expect(teamRequests.length).toBeGreaterThan(0))
    expect(teamRequests.every((body) => body.partner_id === undefined)).toBe(true)
  })

  it('an assignee from before, outside the team, still shows and is marked', async () => {
    serve({ ...CLIENT, assign_id: 10, assign_name: 'Hal Host' })
    renderWithProviders(<ClientInfoSection clientId="5" isHost countries={[]} states={[]} cities={[]} />)

    await waitFor(() => expect(shown()).toBe("Hal Host (not on this partner's team)"))
  })
})
