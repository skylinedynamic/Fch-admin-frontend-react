import { afterEach, describe, expect, it, vi } from 'vitest'
import { http, HttpResponse } from 'msw'
import userEvent from '@testing-library/user-event'
import { screen } from '@testing-library/react'
import { renderWithProviders } from '../../../test-utils'
import { server } from '../../../mocks/server'
vi.mock('react-toastify', () => ({ toast: { success: vi.fn(), error: vi.fn() } }))
vi.mock('../../../../src/hooks/useSummernote', () => ({
  useSummernote: () => ({ editorRef: () => { } }),
}))

const { default: ActivitySidebar } = await import('../../../../src/components/Common/Activity/ActivitySidebar')

/**
 * A status update's activity reads "Status changed to ..." and, on its own
 * line, "Note: ..." (fch-api joins them with a line break). Shown as HTML the
 * break collapsed and the note ran on in the same line.
 */
const activity = (overrides: Record<string, unknown>) => ({
  id: 1,
  event_label: 'Status updated',
  description: null,
  created_at: '2026-11-16T10:00:00Z',
  attachments: [],
  field_changes: null,
  signatures: null,
  ...overrides,
})

const serve = (rows: unknown[]) =>
  server.use(http.post('*/common/activity-logs/fetch-all-activities', () => HttpResponse.json({ status: true, data: rows })))

const props = { entityId: 1, entityType: 'FundingApplication', partnerId: null, borrowerEmail: null, partnerEmail: null, hostEmail: null, isHost: true }

describe('ActivitySidebar - a description on several lines', () => {
  afterEach(() => server.resetHandlers())

  it('shows the status note on its own line', async () => {
    serve([activity({ description: 'Michael Chen changed the status to Closed (Completed).\nNote: funded in full' })])
    const user = userEvent.setup()
    renderWithProviders(<ActivitySidebar {...props} />)

    await user.click((await screen.findByText('Status updated')).closest('.accordion-button') as HTMLElement)

    const description = (await screen.findByText(/changed the status to Closed/)) as HTMLElement
    expect(description.innerHTML).toBe('Michael Chen changed the status to Closed (Completed).<br>Note: funded in full')
  })
})
