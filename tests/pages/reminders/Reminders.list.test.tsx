import { vi } from 'vitest'

vi.mock('react-toastify', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-toastify')>()
  return { ...actual, toast: Object.assign(vi.fn(), { info: vi.fn(), success: vi.fn(), error: vi.fn(), warn: vi.fn() }) }
})
vi.mock('bootstrap/js/dist/modal', () => import('../../mocks/fakeBootstrapModal'))
// Summernote (reached through shared modals) needs a real canvas at import time.
vi.mock('../../../src/hooks/useSummernote', () => ({ useSummernote: () => ({ editorRef: () => {} }) }))

import { toast } from 'react-toastify'
import { describeListPage } from '../../pages/listPageSuite'
import ReminderList from '../../../src/pages/reminders/ReminderList'

describeListPage(
  {
    name: 'Reminders',
    page: () => <ReminderList />,
    path: '/reminders',
    view: ['view reminders'],
    list: {
      method: 'post', path: '/common/reminders/fetch-reminders',
      wrap: (rows) => ({ status: true, message: 'ok', data: { reminders: { data: rows, meta: { total: rows.length } } } }),
    },
    rows: [
      { id: 1301, reference: 'Appointment', reference_type: 'appointment', summary: 'Call the lender', status: 'pending', reminder_date: '2026-04-01 10:00' },
      { id: 1302, reference: 'Activity', reference_type: 'activity', summary: 'Send documents', status: 'dismissed', reminder_date: '2026-03-01 10:00' },
    ],
    shows: ['Call the lender', 'Send documents'],
    emptyText: 'No reminders found',
    search: { placeholder: 'Search subject or client...' },
  },
  toast
)
