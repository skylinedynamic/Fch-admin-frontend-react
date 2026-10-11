import { afterEach, describe, expect, it } from 'vitest'
import { http, HttpResponse } from 'msw'
import { renderHook, waitFor, act } from '@testing-library/react'
import { QueryClientProvider } from '@tanstack/react-query'
import type { ReactNode } from 'react'
import { server } from '../../mocks/server'
import { createTestQueryClient } from '../../test-utils'
import { queryKeys } from '../../../src/lib/query/queryKeys'
import {
  useLatestNotifications,
  useUnreadNotificationCount,
  useMarkNotificationRead,
  useMarkAllNotificationsRead,
  useDeleteNotification,
} from '../../../src/modules/notifications/queries'
import { LATEST_NOTIFICATIONS_LIMIT } from '../../../src/config/notifications'

afterEach(() => server.resetHandlers())

const item = (id: string, is_read = false) => ({
  id,
  type: 'system.test',
  title: id,
  body: '',
  url: null,
  icon: null,
  category: 'system',
  is_read,
  read_at: is_read ? '2026-10-01T12:00:00+00:00' : null,
  created_at: '2026-10-01T12:00:00+00:00',
})

const wrapperFor = (qc = createTestQueryClient()) => ({
  qc,
  wrapper: ({ children }: { children: ReactNode }) => <QueryClientProvider client={qc}>{children}</QueryClientProvider>,
})

describe('useLatestNotifications', () => {
  it(`fetches the latest ${LATEST_NOTIFICATIONS_LIMIT} notifications`, async () => {
    let perPage: string | null = null
    server.use(
      http.get('*/common/notifications', ({ request }) => {
        perPage = new URL(request.url).searchParams.get('per_page')
        return HttpResponse.json({ status: true, data: [item('a')], meta: { current_page: 1, last_page: 1, per_page: 10, total: 1, unread_count: 1 } })
      })
    )
    const { wrapper } = wrapperFor()

    const { result } = renderHook(() => useLatestNotifications(), { wrapper })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(perPage).toBe(String(LATEST_NOTIFICATIONS_LIMIT))
    expect(result.current.data?.data.map((n) => n.id)).toEqual(['a'])
  })

  it('does not fetch while disabled', () => {
    const { wrapper } = wrapperFor()
    const { result } = renderHook(() => useLatestNotifications(false), { wrapper })
    expect(result.current.fetchStatus).toBe('idle')
  })
})

/**
 * The latest-notifications response already carries the unread count
 * (meta.unread_count), so the badge reads it from there instead of a second
 * request to /unread-count.
 */
describe('useUnreadNotificationCount', () => {
  const countRequests = { list: 0, count: 0 }

  const mockServer = (unread: () => number) => {
    countRequests.list = 0
    countRequests.count = 0
    server.use(
      http.get('*/common/notifications', () => {
        countRequests.list += 1
        return HttpResponse.json({ status: true, data: [item('a')], meta: { current_page: 1, last_page: 1, per_page: LATEST_NOTIFICATIONS_LIMIT, total: 1, unread_count: unread() } })
      }),
      http.get('*/common/notifications/unread-count', () => {
        countRequests.count += 1
        return HttpResponse.json({ status: true, data: { unread_count: 99 } })
      })
    )
  }

  it('reads the unread count from the latest notifications', async () => {
    mockServer(() => 4)
    const { wrapper } = wrapperFor()

    const { result } = renderHook(() => useUnreadNotificationCount(), { wrapper })

    await waitFor(() => expect(result.current.data).toBe(4))
    expect(countRequests).toEqual({ list: 1, count: 0 })
  })

  it('shares one request with the latest-notifications list when both load together', async () => {
    mockServer(() => 3)
    const { wrapper } = wrapperFor()

    const { result } = renderHook(() => ({ latest: useLatestNotifications(), count: useUnreadNotificationCount() }), { wrapper })

    await waitFor(() => expect(result.current.count.data).toBe(3))
    await waitFor(() => expect(result.current.latest.isSuccess).toBe(true))
    expect(countRequests).toEqual({ list: 1, count: 0 })
  })

  it('refreshes the count and the list together on a refetch', async () => {
    let unread = 1
    mockServer(() => unread)
    const { qc, wrapper } = wrapperFor()
    const { result } = renderHook(() => ({ latest: useLatestNotifications(), count: useUnreadNotificationCount() }), { wrapper })
    await waitFor(() => expect(result.current.count.data).toBe(1))

    unread = 5
    await act(() => qc.invalidateQueries({ queryKey: queryKeys.notifications.all }))

    await waitFor(() => expect(result.current.count.data).toBe(5))
    expect(countRequests.list).toBe(2)
    expect(countRequests.count).toBe(0)
  })
})

describe('notification mutations', () => {
  const seed = () => {
    const ctx = wrapperFor()
    ctx.qc.setQueryData(queryKeys.notifications.unreadCount(), 2)
    ctx.qc.setQueryData(queryKeys.notifications.list({ per_page: 10 }), {
      data: [item('a'), item('b')],
      meta: { current_page: 1, last_page: 1, per_page: 10, total: 2, unread_count: 2 },
    })
    return ctx
  }

  it('useMarkNotificationRead marks it read in the cache with the server count', async () => {
    server.use(
      http.post('*/common/notifications/a/read', () =>
        HttpResponse.json({ status: true, data: { notification: item('a', true), unread_count: 1 } })
      )
    )
    const { qc, wrapper } = seed()
    const { result } = renderHook(() => useMarkNotificationRead(), { wrapper })

    await act(() => result.current.mutateAsync('a'))

    expect(qc.getQueryData(queryKeys.notifications.unreadCount())).toBe(1)
    expect((qc.getQueryData(queryKeys.notifications.list({ per_page: 10 })) as any).data[0].is_read).toBe(true)
  })

  it('useMarkAllNotificationsRead marks everything read', async () => {
    server.use(http.post('*/common/notifications/read-all', () => HttpResponse.json({ status: true, data: { updated: 2, unread_count: 0 } })))
    const { qc, wrapper } = seed()
    const { result } = renderHook(() => useMarkAllNotificationsRead(), { wrapper })

    await act(() => result.current.mutateAsync())

    expect(qc.getQueryData(queryKeys.notifications.unreadCount())).toBe(0)
    expect((qc.getQueryData(queryKeys.notifications.list({ per_page: 10 })) as any).data.every((n: any) => n.is_read)).toBe(true)
  })

  it('useDeleteNotification removes it and refreshes the lists', async () => {
    server.use(http.delete('*/common/notifications/a', () => HttpResponse.json({ status: true, data: { unread_count: 1 } })))
    const { qc, wrapper } = seed()
    const { result } = renderHook(() => useDeleteNotification(), { wrapper })

    await act(() => result.current.mutateAsync('a'))

    expect(qc.getQueryData(queryKeys.notifications.unreadCount())).toBe(1)
    const cached = qc.getQueryData(queryKeys.notifications.list({ per_page: 10 })) as any
    expect(cached.data.map((n: any) => n.id)).toEqual(['b'])
    expect(qc.getQueryState(queryKeys.notifications.list({ per_page: 10 }))!.isInvalidated).toBe(true)
  })
})
