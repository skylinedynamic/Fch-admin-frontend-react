import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { http, HttpResponse } from 'msw'
import userEvent from '@testing-library/user-event'
import { act, renderWithProviders, screen, waitFor } from '../../test-utils'
import { server } from '../../mocks/server'
import { createFakeEcho, type FakeEcho } from '../../mocks/fakeEcho'
import { setAuthState, clearAuthState } from '../../../src/store/auth'

let fake: FakeEcho

vi.mock('../../../src/lib/realtime/echo', () => ({
  getEcho: () => fake.echo,
  disconnectEcho: () => {},
  userChannelName: (id: number | string) => `App.Models.User.${id}`,
}))

// Summernote (pulled in by the activity edit form) needs a real canvas at import time.
vi.mock('../../../src/hooks/useSummernote', () => ({
  useSummernote: () => ({ editorRef: () => { } }),
}))

import ReminderModal from '../../../src/components/Common/ReminderModal'

const CHANNEL = 'App.Models.User.9'

/** A reminder as the API renders it (GET /due and the Reverb pushes share this shape). */
const reminder = (id: number, summary: string, activityAt: Date, extra: Record<string, unknown> = {}) => ({
  id,
  status: 'sent',
  summary,
  title: summary,
  reference_type: 'Call',
  set_date_time: activityAt.toISOString(),
  reminder_date_time: new Date(activityAt.getTime() - 15 * 60_000).toISOString(),
  is_past_due: activityAt.getTime() <= Date.now(),
  display: { activity_time: '3:00 PM', reminder_time: '2:45 PM' },
  attachments: [],
  message: '',
  ...extra,
})

const inAnHour = () => new Date(Date.now() + 60 * 60_000)

/**
 * The pop-up asks the API for due reminders once, when the page loads, and
 * learns about everything after that over Reverb - it never polls.
 */
describe('ReminderModal real-time updates', () => {
  let dueFetches = 0
  let onLoad: unknown[] = []

  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true })
    fake = createFakeEcho()
    dueFetches = 0
    onLoad = []
    setAuthState({ token: 't', user: { id: 9 } as any })
    server.use(
      http.get('*/common/reminders/due', () => {
        dueFetches += 1
        return HttpResponse.json({ status: true, data: { reminders: onLoad } })
      })
    )
  })

  afterEach(() => {
    vi.useRealTimers()
    clearAuthState()
  })

  it('fetches due reminders once on page load and never polls after that', async () => {
    renderWithProviders(<ReminderModal />)
    await waitFor(() => expect(dueFetches).toBe(1))

    await act(async () => { await vi.advanceTimersByTimeAsync(10 * 60_000) })

    expect(dueFetches).toBe(1)
  })

  it('shows a reminder pushed over Reverb straight from the push, without calling the API', async () => {
    renderWithProviders(<ReminderModal />)
    await waitFor(() => expect(dueFetches).toBe(1))

    act(() => fake.emit(CHANNEL, '.reminder.due', { reminder: reminder(1, 'Call Jane about renewal', inAnHour()) }))

    expect(await screen.findByText(/call jane about renewal/i)).toBeInTheDocument()
    expect(screen.getAllByText(/you have an upcoming call/i).length).toBeGreaterThan(0)
    expect(dueFetches).toBe(1)
  })

  it('replaces a shown reminder with its pushed new details, and drops one pushed as gone', async () => {
    onLoad = [reminder(1, 'Call Jane', inAnHour()), reminder(2, 'Email Bob', inAnHour())]
    renderWithProviders(<ReminderModal />)
    expect(await screen.findByText('Call Jane')).toBeInTheDocument()

    act(() => fake.emit(CHANNEL, '.reminder.updated', { id: 1, active: true, reminder: reminder(1, 'Call Jane at noon', inAnHour()) }))
    expect(await screen.findByText('Call Jane at noon')).toBeInTheDocument()

    act(() => fake.emit(CHANNEL, '.reminder.updated', { id: 2, active: false, reminder: null }))
    await waitFor(() => expect(screen.queryByText('Email Bob')).not.toBeInTheDocument())

    act(() => fake.emit(CHANNEL, '.reminder.updated', { id: 1, active: false, reminder: null }))
    await waitFor(() => expect(screen.queryByText('Call Jane at noon')).not.toBeInTheDocument())
    expect(dueFetches).toBe(1)
  })

  it('brings a reminder closed with X back after 30 seconds, without calling the API', async () => {
    onLoad = [reminder(1, 'Call Jane', inAnHour())]
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
    renderWithProviders(<ReminderModal />)
    expect(await screen.findByText('Call Jane')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /close reminder/i }))
    await waitFor(() => expect(screen.queryByText('Call Jane')).not.toBeInTheDocument())

    await act(async () => { await vi.advanceTimersByTimeAsync(30_000) })

    expect(await screen.findByText('Call Jane')).toBeInTheDocument()
    expect(dueFetches).toBe(1)
  })

  it('turns an upcoming reminder into a missed one when its time passes, on its own clock', async () => {
    onLoad = [reminder(1, 'Call Jane', new Date(Date.now() + 60_000))]
    renderWithProviders(<ReminderModal />)
    expect((await screen.findAllByText(/you have an upcoming call/i)).length).toBeGreaterThan(0)

    await act(async () => { await vi.advanceTimersByTimeAsync(2 * 60_000) })

    expect((await screen.findAllByText(/you missed a call/i)).length).toBeGreaterThan(0)
    expect(dueFetches).toBe(1)
  })

  it('removes only its own listeners on unmount, leaving the shared channel to others', async () => {
    const other = vi.fn()
    fake.echo.private(CHANNEL).listen('.reminder.due', other)
    const leave = vi.spyOn(fake.echo, 'leave')
    const { unmount } = renderWithProviders(<ReminderModal />)
    await waitFor(() => expect(dueFetches).toBe(1))
    expect(fake.listenerCount(CHANNEL, '.reminder.due')).toBe(2)
    expect(fake.listenerCount(CHANNEL, '.reminder.updated')).toBe(1)

    unmount()

    expect(fake.listenerCount(CHANNEL, '.reminder.due')).toBe(1)
    expect(fake.listenerCount(CHANNEL, '.reminder.updated')).toBe(0)
    expect(leave).not.toHaveBeenCalled()
  })
})
