import { beforeEach, describe, expect, it, vi } from 'vitest'
import { http, HttpResponse } from 'msw'

vi.mock('react-toastify', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-toastify')>()
  return { ...actual, toast: Object.assign(vi.fn(), { info: vi.fn(), success: vi.fn(), error: vi.fn(), warn: vi.fn() }) }
})
vi.mock('bootstrap/js/dist/modal', () => import('../../mocks/fakeBootstrapModal'))
vi.mock('../../../src/hooks/useSummernote', () => ({ useSummernote: () => ({ editorRef: () => {} }) }))

import userEvent from '@testing-library/user-event'
import { renderWithProviders, screen, waitFor, within } from '../../test-utils'
import { server } from '../../mocks/server'
import { setAuthState, clearAuthState } from '../../../src/store/auth'
import ReminderList from '../../../src/pages/reminders/ReminderList'

const inTwoDays = new Date(Date.now() + 2 * 86_400_000 + 60_000).toISOString()
const ROWS = [
  {
    id: 1, activity_log_id: 77, reference: 'Call', reference_type: 'Call', summary: 'Call Jane about renewal', status: 'pending',
    set_date_time: inTwoDays, display: { activity_date: 'November 2, 2026', activity_time: '3:00 PM', activity_datetime: 'Nov 2, 2026, 03:00 PM' },
    client: { type: 'borrower', type_label: 'Client', id: 5, name: 'Jane Doe', business_name: 'Doe Bakery' },
  },
]

/** The reminders list: status tabs, a toolbar, rich rows, a bulk bar and a helpful empty state. */
describe('Task & Reminders list - redesign', () => {
  let bodies: Record<string, unknown>[]
  let rows: unknown[]
  let bulk: unknown
  let dismissedAll: boolean

  beforeEach(() => {
    bodies = []
    rows = ROWS
    bulk = null
    dismissedAll = false
    setAuthState({ token: 't', user: { id: 9 } as any, permissions: ['view reminders'] } as any)
    server.use(
      http.post('*/common/reminders/fetch-reminders', async ({ request }) => {
        const body = (await request.json()) as Record<string, unknown>
        bodies.push(body)
        const data = body.status === 'dismissable' ? ROWS : rows
        return HttpResponse.json({ status: true, data: { reminders: { data, meta: { total: data.length } } } })
      }),
      http.post('*/common/reminders/bulk-dismiss', async ({ request }) => {
        bulk = await request.json()
        return HttpResponse.json({ status: true, message: 'ok', data: null })
      }),
      http.post('*/common/reminders/dismiss-all', () => {
        dismissedAll = true
        return HttpResponse.json({ status: true, message: 'ok', data: { count: 1 } })
      })
    )
    return () => clearAuthState()
  })

  const listBodies = () => bodies.filter((b) => b.status !== 'dismissable')
  const lastListBody = () => listBodies()[listBodies().length - 1]

  it('filters by status from the tabs', async () => {
    const user = userEvent.setup()
    renderWithProviders(<ReminderList />, { route: '/reminders' })
    await screen.findByText('Call Jane about renewal')

    const tabs = screen.getByRole('tablist', { name: 'Reminder status' })
    expect(within(tabs).getAllByRole('tab').map((t) => t.textContent?.trim())).toEqual(['All', 'Pending', 'Sent', 'Missed', 'Dismissed'])
    expect(within(tabs).getByRole('tab', { name: 'All' })).toHaveAttribute('aria-selected', 'true')

    await user.click(within(tabs).getByRole('tab', { name: 'Missed' }))

    await waitFor(() => expect(lastListBody()).toMatchObject({ status: 'missed', page: 1 }))
    expect(within(tabs).getByRole('tab', { name: 'Missed' })).toHaveAttribute('aria-selected', 'true')
  })

  it('colours Filters and Clear like the other list pages', async () => {
    renderWithProviders(<ReminderList />, { route: '/reminders' })
    await screen.findByText('Call Jane about renewal')

    expect(screen.getByRole('button', { name: /filters/i })).toHaveClass('btn-warning')
    expect(screen.getByRole('button', { name: /^clear$/i })).toHaveClass('btn-default')
  })

  it('shows each row with its type, client link and when it happens', async () => {
    renderWithProviders(<ReminderList />, { route: '/reminders' })

    const row = (await screen.findByText('Call Jane about renewal')).closest('tr')!
    expect(within(row).getByText('Call', { selector: '.reminder-row__type' })).toBeInTheDocument()
    expect(within(row).getByRole('link', { name: 'Jane Doe' })).toHaveAttribute('href', '/clients/5')
    expect(within(row).getByText('Nov 2, 2026, 03:00 PM')).toBeInTheDocument()
    expect(within(row).getByText('in 2 days')).toBeInTheDocument()
  })

  it('shows the Actions button, as on Partners, only once a row is ticked, and dismisses the selected rows after confirming', async () => {
    const user = userEvent.setup()
    const { container } = renderWithProviders(<ReminderList />, { route: '/reminders' })
    await screen.findByText('Call Jane about renewal')
    expect(screen.queryByRole('button', { name: /^actions$/i })).not.toBeInTheDocument()

    await user.click(container.querySelector('.p-datatable-tbody .p-checkbox input')!)
    const actions = await screen.findByRole('button', { name: /^actions$/i })
    expect(actions).toHaveClass('bg-success')
    expect(screen.getByRole('button', { name: 'Toggle Dropdown' })).toBeInTheDocument()
    expect(screen.queryByText(/\d+ selected/)).not.toBeInTheDocument()

    await user.click(actions)
    await user.click(await screen.findByRole('menuitem', { name: /dismiss selected/i }))
    await user.click(await screen.findByRole('button', { name: 'Yes, Dismiss' }))

    await waitFor(() => expect(bulk).toEqual({ ids: [1] }))
  })

  it('clicking a row opens its details and leaves its checkbox alone - only the checkbox selects', async () => {
    const user = userEvent.setup()
    const { container } = renderWithProviders(<ReminderList />, { route: '/reminders' })

    await user.click(await screen.findByText('Call Jane about renewal'))

    expect(await screen.findByText('Task & Reminder Details')).toBeInTheDocument()
    expect(container.querySelector('.p-datatable-tbody .p-checkbox input')).not.toBeChecked()
    expect(screen.queryByRole('button', { name: /^actions$/i })).not.toBeInTheDocument()
  })

  it('dismisses everything from the header, after confirming', async () => {
    const user = userEvent.setup()
    renderWithProviders(<ReminderList />, { route: '/reminders' })
    await screen.findByText('Call Jane about renewal')

    await user.click(screen.getByRole('button', { name: /^dismiss all$/i }))
    await user.click(await screen.findByRole('button', { name: 'Yes, Dismiss' }))

    await waitFor(() => expect(dismissedAll).toBe(true))
  })

  it('suggests clearing the filters when nothing matches', async () => {
    const user = userEvent.setup()
    rows = []
    renderWithProviders(<ReminderList />, { route: '/reminders' })

    // It opens on today (BUG-056), so the empty state names the day
    expect(await screen.findByText('No reminders for today.')).toBeInTheDocument()
    expect(screen.getByText(/Try another date range or status/)).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Clear filters' }))
    await waitFor(() => expect(lastListBody()).not.toHaveProperty('start_date'))
    expect(await screen.findByText('No reminders found')).toBeInTheDocument()
  })
})
