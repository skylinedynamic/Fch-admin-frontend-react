import { afterEach, describe, expect, it, vi } from 'vitest'
import { http, HttpResponse } from 'msw'
import { fireEvent, screen, waitFor } from '@testing-library/react'
import { renderWithProviders } from '../../../test-utils'
import { server } from '../../../mocks/server'
vi.mock('react-toastify', () => ({ toast: { success: vi.fn(), error: vi.fn() } }))
// The edit modal's summernote import crashes under jsdom (no <canvas>).
vi.mock('../../../../src/hooks/useSummernote', () => ({
  useSummernote: () => ({ editorRef: () => { } }),
}))

const { default: ActivitySidebar } = await import('../../../../src/components/Common/Activity/ActivitySidebar')

/**
 * The page tells the activity log which partner owns the record and who on
 * it is responsible; New Event (through the shared context) and Edit both
 * use that for "Want to Assign".
 */

const TASK_ROW = {
  id: 77,
  log_name: 'activity',
  log_type_raw: 'activity',
  event_label: 'Collect bank statements',
  reference: 'Task',
  subject: 'Collect bank statements',
  description: null,
  created_at: '2026-10-14T10:00:00Z',
  attachments: [],
  can_edit: true,
  can_delete: true,
  is_owner: true,
  is_manual: true,
  visibility: 'private',
  properties: { reference: 'Task', subject: 'Collect bank statements' },
  task: { assigned_to: 12, assigned_user: { id: 12, name: 'Avery Staff' }, due_date: '2030-11-07', priority: 'high', priority_label: 'High', status: 'open', status_label: 'Open' },
}

const props = {
  entityId: 1,
  entityType: 'Client',
  partnerId: 2,
  taskOwner: { id: 14, name: 'Blake Ops' },
  borrowerEmail: null,
  partnerEmail: null,
  hostEmail: null,
  isHost: true,
}

describe('ActivitySidebar - Want to Assign context', () => {
  afterEach(() => {
    server.resetHandlers()
    delete (window as any)._activityEntityContext
  })

  it("hands New Event the record's partner and responsible staff member", () => {
    server.use(http.post('*/common/activity-logs/fetch-all-activities', () => HttpResponse.json({ status: true, data: [] })))
    renderWithProviders(<ActivitySidebar {...props} />)

    // The modal itself is mounted by GlobalModals, not here: keep Bootstrap from opening it.
    const newEvent = screen.getByRole('button', { name: /new event/i })
    newEvent.removeAttribute('data-bs-toggle')
    fireEvent.click(newEvent)

    expect((window as any)._activityEntityContext).toMatchObject({
      entityType: 'Client',
      partnerId: 2,
      taskOwner: { id: 14, name: 'Blake Ops' },
    })
  })

  it('opens Edit with the same partner staff list and owner card', async () => {
    let usersRequest: unknown = null
    server.use(
      http.post('*/common/activity-logs/fetch-all-activities', () => HttpResponse.json({ status: true, data: [TASK_ROW] })),
      http.post('*/common/get-all-users', async ({ request }) => {
        usersRequest = await request.json()
        return HttpResponse.json({ status: true, data: [{ id: 12, name: 'Avery Staff' }, { id: 14, name: 'Blake Ops' }] })
      })
    )
    renderWithProviders(<ActivitySidebar {...props} />)

    fireEvent.click(await screen.findByRole('button', { name: 'Edit activity' }))

    await waitFor(() => expect(usersRequest).toEqual({ partner_id: 2, active_only: true, keep_ids: [12, 14] }))
    expect(await screen.findByText('Client Assigned To')).toBeInTheDocument()
    expect(document.getElementById('activityEditTaskOwner')).toHaveTextContent('Blake Ops')
    await waitFor(() => expect(document.getElementById('activityEditAssignedTo')).toHaveTextContent('Avery Staff'))
  })
})
