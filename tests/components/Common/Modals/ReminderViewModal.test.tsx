import { beforeEach, describe, expect, it, vi } from 'vitest'
import { http, HttpResponse } from 'msw'

vi.mock('react-toastify', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-toastify')>()
  return { ...actual, toast: Object.assign(vi.fn(), { info: vi.fn(), success: vi.fn(), error: vi.fn(), warn: vi.fn() }) }
})
vi.mock('bootstrap/js/dist/modal', () => import('../../../mocks/fakeBootstrapModal'))
vi.mock('../../../../src/hooks/useSummernote', () => ({ useSummernote: () => ({ editorRef: () => {} }) }))

import userEvent from '@testing-library/user-event'
import { renderWithProviders, screen, waitFor, within } from '../../../test-utils'
import { server } from '../../../mocks/server'
import { setAuthState, clearAuthState } from '../../../../src/store/auth'
import ReminderViewModal from '../../../../src/components/Common/Modals/ReminderViewModal'
import type { Reminder } from '../../../../src/config/reminders'

const REMINDER = {
  id: 1,
  activity_log_id: 77,
  activity_can_edit: true,
  reference: 'Task',
  reference_type: 'Task',
  summary: 'This is activity summary',
  status: 'sent',
  is_past_due: true,
  display: { activity_date: 'October 31, 2026', activity_time: '3:57 PM', reminder_date: 'October 31, 2026', reminder_time: '3:27 PM' },
  task: null,
} as unknown as Reminder

describe('ReminderViewModal (Task & Reminder Details)', () => {
  beforeEach(() => {
    setAuthState({ token: 't', user: { id: 9 } as any, permissions: ['view reminders'] } as any)
    return () => clearAuthState()
  })

  it('shows the type and the effective status in the header', () => {
    renderWithProviders(<ReminderViewModal show onHide={() => {}} reminder={REMINDER} />)

    const header = screen.getByRole('banner', { name: 'Task & Reminder Details' })
    expect(within(header).getByText('Task')).toBeInTheDocument()
    expect(within(header).getByText('Missed')).toHaveClass('bg-danger-subtle')
  })

  it('shows when the activity happens and when the reminder goes off, in one Schedule card', () => {
    renderWithProviders(<ReminderViewModal show onHide={() => {}} reminder={REMINDER} />)

    const schedule = screen.getByRole('group', { name: 'Schedule' })
    expect(within(schedule).getByText('Activity')).toBeInTheDocument()
    expect(within(schedule).getByText('October 31, 2026 · 3:57 PM')).toBeInTheDocument()
    expect(within(schedule).getByText('Reminder')).toBeInTheDocument()
    expect(within(schedule).getByText('October 31, 2026 · 3:27 PM')).toBeInTheDocument()
  })

  it('loads the activity to edit through the activity-log module', async () => {
    const user = userEvent.setup()
    let fetched: string | null = null
    server.use(
      http.get('*/common/activity-logs/:id', ({ params }) => {
        fetched = String(params.id)
        return HttpResponse.json({ status: true, data: { id: 77, activity_summary: 'This is activity summary' } })
      })
    )
    const onHide = vi.fn()
    renderWithProviders(<ReminderViewModal show onHide={onHide} reminder={REMINDER} />)

    await user.click(screen.getByRole('button', { name: /edit reminder/i }))

    await waitFor(() => expect(fetched).toBe('77'))
    await waitFor(() => expect(onHide).toHaveBeenCalled())
  })
})
