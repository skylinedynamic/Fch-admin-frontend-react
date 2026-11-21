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
 * An entry's row is two lines: the title alone, then who did it, when and its
 * visibility (Private, Internal...). The reminder status is in the body.
 */
const task = {
  id: 1,
  log_type: 'Activity Created',
  log_type_raw: 'activity',
  reference: 'Task',
  subject: 'This is activity summary',
  causer_name: 'Host Admin',
  created_at: '2026-11-19 17:38:00',
  visibility: 'private',
  is_manual: true,
  is_owner: true,
  can_edit: true,
  can_delete: true,
  reminder_status: 'Dismissed',
  attachments: [],
}

const props = { entityId: 175, entityType: 'Lead', partnerId: null, borrowerEmail: null, partnerEmail: null, hostEmail: null, isHost: true }

describe('ActivitySidebar - two-line entry row', () => {
  afterEach(() => server.resetHandlers())

  it('puts the title alone on line 1, who, when and visibility on line 2, and the reminder status in the body', async () => {
    server.use(http.post('*/common/activity-logs/fetch-all-activities', () => HttpResponse.json({ status: true, data: [task] })))
    renderWithProviders(<ActivitySidebar {...props} />)

    const title = await screen.findByText('Task: This is activity summary')
    expect(title.tagName).toBe('H6')
    expect(title).toHaveTextContent(/^Task: This is activity summary$/)

    const meta = title.parentElement!.querySelector('.activity-entry-meta') as HTMLElement
    expect(meta).toHaveTextContent('by Host Admin')
    expect(meta).toHaveTextContent('Private')
    expect(meta).not.toHaveTextContent('Dismissed')

    const body = title.closest('.accordion-item')!.querySelector('.accordion-body') as HTMLElement
    expect(body).toHaveTextContent('Reminder')
    expect(body).toHaveTextContent('Dismissed')
  })
})
