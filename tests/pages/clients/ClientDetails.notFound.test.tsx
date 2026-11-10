import { describe, expect, it, vi } from 'vitest'
import { screen, waitFor } from '../../test-utils'
import { delay, http, HttpResponse } from 'msw'
import { server } from '../../mocks/server'
import { allowBackgroundCalls, api, renderPage, signIn } from '../pageHarness'

vi.mock('react-toastify', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-toastify')>()
  return { ...actual, toast: Object.assign(vi.fn(), { info: vi.fn(), success: vi.fn(), error: vi.fn(), warn: vi.fn() }) }
})
vi.mock('bootstrap/js/dist/modal', () => import('../../mocks/fakeBootstrapModal'))
// Summernote needs a real canvas at import time.
vi.mock('../../../src/hooks/useSummernote', () => ({ useSummernote: () => ({ editorRef: () => {} }) }))

import ClientDetails from '../../../src/pages/clients/ClientDetails'

/**
 * BUG-030: opening another partner's client (/clients/136 on Wanda's domain)
 * showed an empty Client Profile with zero counters. The API answers 404, so
 * the page now says the client was not found, as Invoice details does.
 */
describe('ClientDetails - a client that is not yours (BUG-030)', () => {
  it('shows Client Not Found instead of an empty profile', async () => {
    signIn({ permissions: ['view clients', 'update clients'] })
    allowBackgroundCalls()
    api('get', '/common/borrowers/136', { status: false, message: 'Client not found.' }, 404)

    renderPage(<ClientDetails />, { path: '/clients/:id', route: '/clients/136' })

    expect(await screen.findByText('Client Not Found')).toBeInTheDocument()
    expect(screen.queryByLabelText('Social Security Number')).not.toBeInTheDocument()
  })
})

/**
 * BUG-001 (QA round 2): /clients/abc and /clients/999999999. The counters and
 * the Activity panel were fetched with the bad id before the client answered
 * 404 - a 500 from the counters, and unrelated activity in the panel. They now
 * wait until the client has loaded.
 */
describe('ClientDetails - an id that is not a client (BUG-001)', () => {
  it.each(['abc', '999999999'])('/clients/%s shows Client Not Found and loads no counters or activity', async (id) => {
    signIn({ permissions: ['view clients', 'update clients'] })
    allowBackgroundCalls()
    api('get', `/common/borrowers/${id}`, { status: false, message: 'Client not found.' }, 404)
    const stats = api('post', `/common/borrowers-profile-states-details-count/${id}`, { status: false }, 500)
    const activity = api('post', '/common/activity-logs/fetch-all-activities', { status: true, data: [] })

    renderPage(<ClientDetails />, { path: '/clients/:id', route: `/clients/${id}` })

    expect(await screen.findByText('Client Not Found')).toBeInTheDocument()
    expect(stats.calls).toBe(0)
    expect(activity.calls).toBe(0)
  })

  it('still loads the counters and the activity of a client that exists', async () => {
    signIn({ permissions: ['view clients', 'update clients'] })
    allowBackgroundCalls()
    api('get', '/common/borrowers/42', { status: true, data: { id: 42, first_name: 'Cara', last_name: 'Client', email: 'cara@example.test' } })
    const stats = api('post', '/common/borrowers-profile-states-details-count/42', { status: true, data: { total_meetings: 3 } })
    const activity = api('post', '/common/activity-logs/fetch-all-activities', { status: true, data: [] })

    renderPage(<ClientDetails />, { path: '/clients/:id', route: '/clients/42' })

    await waitFor(() => expect(stats.calls).toBeGreaterThan(0))
    await waitFor(() => expect(activity.calls).toBeGreaterThan(0))
    expect(activity.bodies[0]).toMatchObject({ borrower_id: '42' })
  })

  it('shows the Activity panel loading while the client is still on its way', async () => {
    signIn({ permissions: ['view clients', 'update clients'] })
    allowBackgroundCalls()
    server.use(http.get('*/common/borrowers/42', async () => {
      await delay('infinite')
      return HttpResponse.json({})
    }))
    const activity = api('post', '/common/activity-logs/fetch-all-activities', { status: true, data: [] })

    const view = renderPage(<ClientDetails />, { path: '/clients/:id', route: '/clients/42' })

    await waitFor(() => expect(view.container.querySelector('.profile-timeline .skeleton-shimmer')).not.toBeNull())
    expect(activity.calls).toBe(0)
  })
})
