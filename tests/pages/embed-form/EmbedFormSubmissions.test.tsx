import { afterEach, describe, expect, it, vi } from 'vitest'

vi.mock('react-toastify', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-toastify')>()
  return { ...actual, toast: Object.assign(vi.fn(), { info: vi.fn(), success: vi.fn(), error: vi.fn(), warn: vi.fn() }) }
})

import { http, HttpResponse } from 'msw'
import { server } from '../../mocks/server'
import { renderWithProviders, screen, within } from '../../test-utils'
import { useAuthStore } from '../../../src/store/auth/authStore'
import EmbedFormSubmissions from '../../../src/pages/embed-form/EmbedFormSubmissions'

/**
 * Embedded Form › Loan Applications: the host sees every partner's
 * applications, so each row says which partner it came through. A partner sees
 * only their own, so the column is not shown to them.
 */
const submissions = [
  {
    id: 1,
    submission_uid: 'uid-1',
    first_name: 'Odessa',
    last_name: 'Mccall',
    email: 'odessa@example.test',
    status: 'new',
    attachments: [],
    created_at: '2026-10-16 09:00:00',
    partner: { id: 4, company_name: 'Acme Lending', full_name: 'Pat Partner', partner_type: 'White-Label Partner (WL)', is_host: false },
  },
  {
    id: 2,
    submission_uid: 'uid-2',
    first_name: 'Ava',
    last_name: 'Ortiz',
    email: 'ava@example.test',
    status: 'new',
    attachments: [],
    created_at: '2026-10-16 10:00:00',
    partner: { id: 1, company_name: 'Four Corner Funding', full_name: 'Host Admin', partner_type: 'Certified Partner', is_host: true },
  },
]

const signInAs = (isHost: boolean) =>
  useAuthStore.setState({ token: 'tok', user: { id: 1, name: 'User', is_host: isHost ? 1 : 0, permissions: ['view application'] } as never })

const serve = () =>
  server.use(
    http.post('*/common/embed-forms/submissions/fetch', () =>
      HttpResponse.json({ status: true, message: 'ok', data: submissions, meta: { total: 2, stats: { total: 2, new_count: 2, reviewing_count: 0, converted_count: 0 } } })
    ),
    http.get('*/common/user-details', () => HttpResponse.json({ status: true, data: { user: {} } }))
  )

describe('Embedded Form › Loan Applications › partner', () => {
  afterEach(() => {
    server.resetHandlers()
    useAuthStore.setState({ token: undefined, user: null })
  })

  it('shows the host which partner each application came through', async () => {
    signInAs(true)
    serve()
    renderWithProviders(<EmbedFormSubmissions />)

    const row = (await screen.findByText('Odessa Mccall')).closest('tr') as HTMLElement
    expect(screen.getByRole('columnheader', { name: /Partner/ })).toBeInTheDocument()
    expect(within(row).getByText('Acme Lending')).toBeInTheDocument()
    expect(within(row).getByText('White Label')).toBeInTheDocument()

    const hostRow = screen.getByText('Ava Ortiz').closest('tr') as HTMLElement
    expect(within(hostRow).getByText('Four Corner Funding')).toBeInTheDocument()
    expect(within(hostRow).getByText('Host')).toBeInTheDocument()
  })

  it('does not show a partner their own name on every row', async () => {
    signInAs(false)
    serve()
    renderWithProviders(<EmbedFormSubmissions />)

    await screen.findByText('Odessa Mccall')
    expect(screen.queryByRole('columnheader', { name: /Partner/ })).not.toBeInTheDocument()
    expect(screen.queryByText('Acme Lending')).not.toBeInTheDocument()
  })
})
