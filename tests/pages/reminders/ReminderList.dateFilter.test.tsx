import { beforeEach, describe, expect, it, vi } from 'vitest'
import userEvent from '@testing-library/user-event'
import { screen, waitFor } from '../../test-utils'
import { allowBackgroundCalls, api, renderPage, signIn } from '../pageHarness'

vi.mock('react-toastify', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-toastify')>()
  return { ...actual, toast: Object.assign(vi.fn(), { info: vi.fn(), success: vi.fn(), error: vi.fn(), warn: vi.fn() }) }
})
vi.mock('bootstrap/js/dist/modal', () => import('../../mocks/fakeBootstrapModal'))
// Summernote (reached through shared modals) needs a real canvas at import time.
vi.mock('../../../src/hooks/useSummernote', () => ({ useSummernote: () => ({ editorRef: () => {} }) }))

import ReminderList from '../../../src/pages/reminders/ReminderList'

/**
 * BUG-056: the list opens on today's reminders, but nothing said so - an empty
 * day read as "No reminders found", and the Dismissed filter (also held to
 * today) found none, so older reminders looked lost. Today stays the default;
 * the page now says what it shows and lets you drop the date in one click.
 */
const FETCH = '/common/reminders/fetch-reminders'
const listOf = (rows: unknown[]) => ({ status: true, message: 'ok', data: { reminders: { data: rows, meta: { total: rows.length } } } })
const OLD_DISMISSED = { id: 9, reference: 'Meeting', summary: 'Older dismissed reminder', status: 'cancelled' }

const ymd = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`

beforeEach(() => {
  signIn({ permissions: ['view reminders'] })
  allowBackgroundCalls()
})

describe('Reminders list - date filter', () => {
  it("opens on today's reminders, and says so", async () => {
    const fetch = api('post', FETCH, listOf([]))
    renderPage(<ReminderList />, { path: '/reminders', route: '/reminders' })

    expect(await screen.findByText(/showing reminders for/i)).toHaveTextContent("Showing reminders for today.")
    const first = fetch.bodies.find((b) => b.per_page !== 1)
    expect(first).toMatchObject({ start_date: ymd(new Date()), end_date: ymd(new Date()) })
  })

  it('an empty day says it is the day that is empty, not that there are no reminders', async () => {
    api('post', FETCH, listOf([]))
    renderPage(<ReminderList />, { path: '/reminders', route: '/reminders' })

    expect(await screen.findByText('No reminders for today.')).toBeInTheDocument()
    expect(screen.queryByText('No reminders found')).not.toBeInTheDocument()
  })

  it('Show all dates drops the date and lists every reminder', async () => {
    api('post', FETCH, listOf([]))
    const user = userEvent.setup()
    renderPage(<ReminderList />, { path: '/reminders', route: '/reminders' })
    await screen.findByText('No reminders for today.')

    const fetch = api('post', FETCH, listOf([OLD_DISMISSED]))
    await user.click(screen.getByRole('button', { name: 'Show all dates' }))

    expect(await screen.findByText('Older dismissed reminder')).toBeInTheDocument()
    const pageFetches = fetch.bodies.filter((b) => b.per_page !== 1)
    const last = pageFetches[pageFetches.length - 1]
    expect(last).not.toHaveProperty('start_date')
    expect(last).not.toHaveProperty('end_date')
    expect(screen.queryByText(/showing reminders for/i)).not.toBeInTheDocument()
  })
})
