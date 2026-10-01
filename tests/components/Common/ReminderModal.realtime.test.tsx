import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { http, HttpResponse } from 'msw'
import { act, renderWithProviders, waitFor } from '../../test-utils'
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

describe('ReminderModal real-time updates', () => {
  let dueFetches = 0

  beforeEach(() => {
    fake = createFakeEcho()
    dueFetches = 0
    setAuthState({ token: 't', user: { id: 9 } as any })
    server.use(
      http.get('*/common/reminders/due', () => {
        dueFetches += 1
        return HttpResponse.json({ status: true, data: { reminders: [] } })
      })
    )
  })

  afterEach(() => clearAuthState())

  it('refetches due reminders when a reminder.due broadcast arrives', async () => {
    renderWithProviders(<ReminderModal />)
    await waitFor(() => expect(dueFetches).toBe(1))

    act(() => fake.emit(CHANNEL, '.reminder.due', { reminder: { id: 1, status: 'sent' } }))

    await waitFor(() => expect(dueFetches).toBe(2))
  })

  it('removes only its own listener on unmount, leaving the shared channel to others', async () => {
    const other = vi.fn()
    fake.echo.private(CHANNEL).listen('.reminder.due', other)
    const leave = vi.spyOn(fake.echo, 'leave')
    const { unmount } = renderWithProviders(<ReminderModal />)
    await waitFor(() => expect(dueFetches).toBe(1))
    expect(fake.listenerCount(CHANNEL, '.reminder.due')).toBe(2)

    unmount()

    expect(fake.listenerCount(CHANNEL, '.reminder.due')).toBe(1)
    expect(leave).not.toHaveBeenCalled()
  })
})
