import { afterEach, describe, expect, it } from 'vitest'
import { http, HttpResponse } from 'msw'
import { server } from '../../mocks/server'
import {
  getNotifications,
  getUnreadNotificationCount,
  markNotificationRead,
  markAllNotificationsRead,
  deleteNotification,
} from '../../../src/modules/notifications/services'

afterEach(() => server.resetHandlers())

const notification = {
  id: 'n1',
  type: 'borrower.funding_request.status_changed',
  title: 'Funding request Approved',
  body: 'Your funding request #1 is now Approved.',
  url: '/funding-requests/1',
  icon: 'ri-hand-coin-line',
  category: 'funding',
  is_read: false,
  read_at: null,
  created_at: '2026-10-01T12:00:00+00:00',
}

describe('notifications services', () => {
  it('getNotifications sends the paging/filter params and returns the list with its meta', async () => {
    let query: URLSearchParams | null = null
    const meta = { current_page: 2, last_page: 3, per_page: 10, total: 25, unread_count: 4 }
    server.use(
      http.get('*/common/notifications', ({ request }) => {
        query = new URL(request.url).searchParams
        return HttpResponse.json({ status: true, message: 'ok', data: [notification], meta })
      })
    )

    const result = await getNotifications({ page: 2, per_page: 10, status: 'unread' })

    expect(query!.get('page')).toBe('2')
    expect(query!.get('per_page')).toBe('10')
    expect(query!.get('status')).toBe('unread')
    expect(result).toEqual({ data: [notification], meta })
  })

  it('getNotifications leaves out the "all" status filter', async () => {
    let query: URLSearchParams | null = null
    server.use(
      http.get('*/common/notifications', ({ request }) => {
        query = new URL(request.url).searchParams
        return HttpResponse.json({ status: true, data: [], meta: { current_page: 1, last_page: 1, per_page: 15, total: 0, unread_count: 0 } })
      })
    )

    await getNotifications({ status: 'all' })

    expect(query!.has('status')).toBe(false)
  })

  it('getUnreadNotificationCount returns the number', async () => {
    server.use(
      http.get('*/common/notifications/unread-count', () =>
        HttpResponse.json({ status: true, data: { unread_count: 7 } })
      )
    )

    await expect(getUnreadNotificationCount()).resolves.toBe(7)
  })

  it('markNotificationRead posts to the notification and returns it with the new count', async () => {
    server.use(
      http.post('*/common/notifications/n1/read', () =>
        HttpResponse.json({ status: true, data: { notification: { ...notification, is_read: true }, unread_count: 2 } })
      )
    )

    await expect(markNotificationRead('n1')).resolves.toEqual({
      notification: { ...notification, is_read: true },
      unread_count: 2,
    })
  })

  it('markAllNotificationsRead returns how many were updated', async () => {
    server.use(
      http.post('*/common/notifications/read-all', () =>
        HttpResponse.json({ status: true, data: { updated: 3, unread_count: 0 } })
      )
    )

    await expect(markAllNotificationsRead()).resolves.toEqual({ updated: 3, unread_count: 0 })
  })

  it('deleteNotification deletes it and returns the new count', async () => {
    server.use(
      http.delete('*/common/notifications/n1', () => HttpResponse.json({ status: true, data: { unread_count: 1 } }))
    )

    await expect(deleteNotification('n1')).resolves.toEqual({ unread_count: 1 })
  })
})
