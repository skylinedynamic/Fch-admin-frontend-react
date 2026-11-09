import { describe, expect, it, vi } from 'vitest'
import { screen, waitFor } from '../../test-utils'
import { delay, http, HttpResponse } from 'msw'
import { server } from '../../mocks/server'
import { allowBackgroundCalls, api, renderPage, signIn } from '../pageHarness'

vi.mock('react-toastify', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-toastify')>()
  return { ...actual, toast: Object.assign(vi.fn(), { info: vi.fn(), success: vi.fn(), error: vi.fn(), warn: vi.fn() }) }
})
// Summernote needs a real canvas at import time.
vi.mock('../../../src/hooks/useSummernote', () => ({ useSummernote: () => ({ editorRef: () => {} }) }))

import { toast } from 'react-toastify'
import LeadDetails from '../../../src/pages/leads/LeadDetails'

/**
 * BUG-030: opening another partner's lead (/leads/175) showed an empty lead
 * page and a "Failed to load lead details" toast. The API answers 404, so the
 * page now says the lead was not found.
 */
describe('LeadDetails - a lead that is not yours (BUG-030)', () => {
  it('shows Lead Not Found instead of an empty page', async () => {
    signIn({ permissions: ['view leads', 'update leads'] })
    allowBackgroundCalls()
    api('get', '/common/leads/175', { status: false, message: 'Lead not found.' }, 404)

    renderPage(<LeadDetails />, { path: '/leads/:id', route: '/leads/175' })

    expect(await screen.findByText('Lead Not Found')).toBeInTheDocument()
    expect(screen.queryByLabelText(/company name/i)).not.toBeInTheDocument()
    expect(toast.error).not.toHaveBeenCalled()
  })
})

/**
 * BUG-001 (QA round 2), same as the client profile: the Activity panel asked
 * for the URL id's activity before the lead had answered. It now waits for the
 * lead, showing its skeleton meanwhile.
 */
describe('LeadDetails - activity waits for the lead (BUG-001)', () => {
  it('loads no activity for an id that is not a lead', async () => {
    signIn({ permissions: ['view leads', 'update leads'] })
    allowBackgroundCalls()
    api('get', '/common/leads/abc', { status: false, message: 'Lead not found.' }, 404)
    const activity = api('post', '/common/activity-logs/fetch-all-activities', { status: true, data: [] })

    renderPage(<LeadDetails />, { path: '/leads/:id', route: '/leads/abc' })

    expect(await screen.findByText('Lead Not Found')).toBeInTheDocument()
    expect(activity.calls).toBe(0)
  })

  it('loads the activity of a lead that exists', async () => {
    signIn({ permissions: ['view leads', 'update leads'] })
    allowBackgroundCalls()
    api('get', '/common/leads/7', { status: true, data: { id: 7, company_name: 'Lead Co', contact_person: 'Lee Lead', email: 'lee@example.test' } })
    const activity = api('post', '/common/activity-logs/fetch-all-activities', { status: true, data: [] })

    renderPage(<LeadDetails />, { path: '/leads/:id', route: '/leads/7' })

    await waitFor(() => expect(activity.calls).toBeGreaterThan(0))
    expect(activity.bodies[0]).toMatchObject({ lead_id: '7' })
  })

  it('shows the Activity panel loading while the lead is still on its way', async () => {
    signIn({ permissions: ['view leads', 'update leads'] })
    allowBackgroundCalls()
    server.use(http.get('*/common/leads/7', async () => {
      await delay('infinite')
      return HttpResponse.json({})
    }))
    const activity = api('post', '/common/activity-logs/fetch-all-activities', { status: true, data: [] })

    const view = renderPage(<LeadDetails />, { path: '/leads/:id', route: '/leads/7' })

    await waitFor(() => expect(view.container.querySelector('.profile-timeline .skeleton-shimmer')).not.toBeNull())
    expect(activity.calls).toBe(0)
  })
})
