import { afterEach, describe, expect, it, vi } from 'vitest'
import { http, HttpResponse } from 'msw'
import { screen } from '@testing-library/react'
import { renderWithProviders } from '../../../test-utils'
import { server } from '../../../mocks/server'

vi.mock('react-toastify', () => ({ toast: { success: vi.fn(), error: vi.fn() } }))
// The edit modal's summernote import crashes under jsdom (no <canvas>).
vi.mock('../../../../src/hooks/useSummernote', () => ({
  useSummernote: () => ({ editorRef: () => { } }),
}))

const { default: ActivitySidebar } = await import('../../../../src/components/Common/Activity/ActivitySidebar')

/**
 * BUG-004 (QA round 2): a lead named `R2-XSS <img src=x onerror=...>` - the
 * API writes the name into "Lead profile created for ...", and the panel
 * rendered that as HTML, so the onerror ran. The description is still HTML
 * (notes keep their formatting) but nothing in it can run.
 */
const leadCreated = (description: string) => ({
  id: 1,
  log_type: 'Lead Created',
  log_type_raw: 'lead_created',
  event_label: 'Lead Created',
  subject: 'Lead Created',
  description,
  created_at: '2026-10-21 10:00:00',
  attachments: [],
  field_changes: null,
  signatures: null,
})

const serve = (rows: unknown[]) =>
  server.use(
    http.post('*/common/activity-logs/fetch-all-activities', () =>
      HttpResponse.json({ status: true, data: rows })
    )
  )

const props = { entityId: 192, entityType: 'Lead', partnerId: null, borrowerEmail: null, partnerEmail: null, hostEmail: null, isHost: true }

describe('ActivitySidebar - descriptions cannot run script (BUG-004)', () => {
  afterEach(() => server.resetHandlers())

  it('shows the name but drops the onerror handler', async () => {
    serve([leadCreated('Lead profile created for R2-XSS <img src=x onerror="window.__xss = 1">')])
    const view = renderWithProviders(<ActivitySidebar {...props} />)

    expect(await screen.findByText(/Lead profile created for R2-XSS/)).toBeInTheDocument()
    expect(view.container.querySelector('[onerror]')).toBeNull()
  })

  it('drops script tags and javascript: links', async () => {
    serve([leadCreated('Note <script>window.__xss = 1</script><a href="javascript:window.__xss=1">open</a>')])
    const view = renderWithProviders(<ActivitySidebar {...props} />)

    expect(await screen.findByText('open')).toBeInTheDocument()
    expect(view.container.querySelector('.profile-timeline script')).toBeNull()
    expect(view.container.querySelector('a[href^="javascript:"]')).toBeNull()
  })

  it('keeps a note\'s formatting', async () => {
    serve([leadCreated('<p><b>Called</b> the client</p>')])
    const view = renderWithProviders(<ActivitySidebar {...props} />)

    expect(await screen.findByText('Called')).toBeInTheDocument()
    expect(view.container.querySelector('.profile-timeline b')?.textContent).toBe('Called')
  })
})
