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
 * Defect (BUG-020): a New Event's timeline entry was titled with the API's
 * generic "Activity Created", so its Summary showed nowhere, and once edited it
 * showed the edit time instead of the activity's own date.
 */

// Local wall-clock times today, as the form stores them.
const today = (time: string) => {
  const d = new Date()
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${time}`
}

const newEvent = (overrides: Record<string, unknown> = {}) => ({
  id: 1,
  // As ActivityLogResource sends it: log_type is the human label, log_type_raw the type.
  log_type: 'Activity Created',
  log_type_raw: 'activity',
  event_label: 'Activity Created',
  reference: 'Call',
  subject: 'QA-TEST Run1 note',
  description: 'Called the client',
  activity_date: today('17:20:00'),
  created_at: today('17:00:00'),
  attachments: [],
  field_changes: null,
  signatures: null,
  ...overrides,
})

const serve = (rows: unknown[]) =>
  server.use(
    http.post('*/common/activity-logs/fetch-all-activities', () =>
      HttpResponse.json({ status: true, data: rows })
    )
  )

const props = { entityId: 175, entityType: 'Lead', partnerId: null, borrowerEmail: null, partnerEmail: null, hostEmail: null, isHost: true }

describe('ActivitySidebar - a New Event shows its Summary and its own date', () => {
  afterEach(() => server.resetHandlers())

  it('titles the entry with the reference and the Summary, not "Activity Created"', async () => {
    serve([newEvent()])
    renderWithProviders(<ActivitySidebar {...props} />)

    expect(await screen.findByText('Call: QA-TEST Run1 note')).toBeInTheDocument()
    expect(screen.queryByText('Activity Created')).not.toBeInTheDocument()
  })

  it('keeps the activity date after an edit and marks it (Edited)', async () => {
    serve([newEvent({ is_edited: true, edited_at: today('16:24:00'), updated_at: today('16:24:00') })])
    renderWithProviders(<ActivitySidebar {...props} />)

    const row = (await screen.findByText('Call: QA-TEST Run1 note')).closest('.accordion-button') as HTMLElement
    expect(row).toHaveTextContent('Today at 05:20 PM')
    expect(row).toHaveTextContent('(Edited)')
    expect(row).not.toHaveTextContent('04:24 PM')
  })
})
