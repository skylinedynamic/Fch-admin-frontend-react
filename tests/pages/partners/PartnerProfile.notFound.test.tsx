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

import { toast } from 'react-toastify'
import PartnerProfile from '../../../src/pages/partners/PartnerProfile'

const HOST = { permissions: ['view partners', 'update partners'] }

/**
 * BUG-001 (QA round 2), as on the client profile: /partners/abc showed an empty
 * form with a "Failed to load partner data" toast, and the counters (500) and
 * the Activity panel were asked for with the bad id. The page now says the
 * partner was not found, and counters and activity wait for the partner.
 */
describe('PartnerProfile - an id that is not a partner (BUG-001)', () => {
  it.each(['abc', '999999999'])('/partners/%s shows Partner Not Found and loads no counters or activity', async (id) => {
    signIn(HOST)
    allowBackgroundCalls()
    api('get', `/admin/partners-details/${id}`, { status: false, message: 'Partner not found.' }, 404)
    const stats = api('post', `/admin/partners-profile-states-details-count/${id}`, { status: false }, 500)
    const activity = api('post', '/common/activity-logs/fetch-all-activities', { status: true, data: [] })

    renderPage(<PartnerProfile />, { path: '/partners/:id', route: `/partners/${id}` })

    expect(await screen.findByText('Partner Not Found')).toBeInTheDocument()
    expect(stats.calls).toBe(0)
    expect(activity.calls).toBe(0)
    expect(toast.error).not.toHaveBeenCalled()
  })

  it('loads the counters and the activity of a partner that exists', async () => {
    signIn(HOST)
    allowBackgroundCalls()
    api('get', '/admin/partners-details/5', { status: true, data: { id: 5, full_name: 'Pat Partner', email: 'pat@example.test' } })
    const stats = api('post', '/admin/partners-profile-states-details-count/5', { status: true, data: {} })
    const activity = api('post', '/common/activity-logs/fetch-all-activities', { status: true, data: [] })

    renderPage(<PartnerProfile />, { path: '/partners/:id', route: '/partners/5' })

    await waitFor(() => expect(stats.calls).toBeGreaterThan(0))
    await waitFor(() => expect(activity.calls).toBeGreaterThan(0))
    expect(activity.bodies[0]).toMatchObject({ partner_id: '5' })
  })

  it('shows the Activity panel loading while the partner is still on its way', async () => {
    signIn(HOST)
    allowBackgroundCalls()
    server.use(http.get('*/admin/partners-details/5', async () => {
      await delay('infinite')
      return HttpResponse.json({})
    }))
    const activity = api('post', '/common/activity-logs/fetch-all-activities', { status: true, data: [] })

    const view = renderPage(<PartnerProfile />, { path: '/partners/:id', route: '/partners/5' })

    await waitFor(() => expect(view.container.querySelector('.profile-timeline .skeleton-shimmer')).not.toBeNull())
    expect(activity.calls).toBe(0)
  })
})
