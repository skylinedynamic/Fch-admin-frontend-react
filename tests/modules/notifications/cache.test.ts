import { describe, expect, it } from 'vitest'
import { createTestQueryClient } from '../../test-utils'
import { queryKeys } from '../../../src/lib/query/queryKeys'
import {
  addIncomingNotification,
  applyNotificationsRead,
  fromBroadcast,
} from '../../../src/modules/notifications/cache'
import type { AppNotification, NotificationListResponse } from '../../../src/modules/notifications/types'

const make = (id: string, overrides: Partial<AppNotification> = {}): AppNotification => ({
  id,
  type: 'system.test',
  title: `Title ${id}`,
  body: '',
  url: null,
  icon: null,
  category: 'system',
  is_read: false,
  read_at: null,
  created_at: '2026-10-01T12:00:00+00:00',
  ...overrides,
})

const list = (items: AppNotification[], meta: Partial<NotificationListResponse['meta']> = {}): NotificationListResponse => ({
  data: items,
  meta: { current_page: 1, last_page: 1, per_page: 2, total: items.length, unread_count: items.filter((n) => !n.is_read).length, ...meta },
})

describe('fromBroadcast', () => {
  it('turns a Reverb notification payload into an unread inbox entry', () => {
    expect(
      fromBroadcast({
        id: 'n9',
        type: 'borrower.funding_request.status_changed',
        title: 'Funding request Approved',
        body: 'Body',
        url: '/funding-requests/1',
        icon: 'ri-hand-coin-line',
        category: 'funding',
        read_at: null,
        created_at: '2026-10-01T12:00:00+00:00',
      })
    ).toEqual({
      id: 'n9',
      type: 'borrower.funding_request.status_changed',
      title: 'Funding request Approved',
      body: 'Body',
      url: '/funding-requests/1',
      icon: 'ri-hand-coin-line',
      category: 'funding',
      is_read: false,
      read_at: null,
      created_at: '2026-10-01T12:00:00+00:00',
    })
  })
})

describe('addIncomingNotification', () => {
  it('bumps the unread count and puts the notification at the top of first-page lists', () => {
    const qc = createTestQueryClient()
    const firstPage = { per_page: 2 }
    const unreadPage = { per_page: 2, status: 'unread' as const }
    const readPage = { per_page: 2, status: 'read' as const }
    const secondPage = { per_page: 2, page: 2 }
    qc.setQueryData(queryKeys.notifications.unreadCount(), 1)
    qc.setQueryData(queryKeys.notifications.list(firstPage), list([make('a'), make('b', { is_read: true })]))
    qc.setQueryData(queryKeys.notifications.list(unreadPage), list([make('a')]))
    qc.setQueryData(queryKeys.notifications.list(readPage), list([make('b', { is_read: true })]))
    qc.setQueryData(queryKeys.notifications.list(secondPage), list([make('c')], { current_page: 2 }))

    addIncomingNotification(qc, make('new'))

    expect(qc.getQueryData(queryKeys.notifications.unreadCount())).toBe(2)

    const first = qc.getQueryData<NotificationListResponse>(queryKeys.notifications.list(firstPage))!
    expect(first.data.map((n) => n.id)).toEqual(['new', 'a'])
    expect(first.meta).toMatchObject({ total: 3, unread_count: 2 })

    expect(qc.getQueryData<NotificationListResponse>(queryKeys.notifications.list(unreadPage))!.data.map((n) => n.id)).toEqual(['new', 'a'])
    expect(qc.getQueryData<NotificationListResponse>(queryKeys.notifications.list(readPage))!.data.map((n) => n.id)).toEqual(['b'])
    expect(qc.getQueryData<NotificationListResponse>(queryKeys.notifications.list(secondPage))!.data.map((n) => n.id)).toEqual(['c'])
    expect(qc.getQueryState(queryKeys.notifications.list(secondPage))!.isInvalidated).toBe(true)
  })

  it('ignores a notification that is already listed (e.g. delivered twice)', () => {
    const qc = createTestQueryClient()
    qc.setQueryData(queryKeys.notifications.unreadCount(), 1)
    qc.setQueryData(queryKeys.notifications.list({ per_page: 2 }), list([make('a')]))

    addIncomingNotification(qc, make('a'))

    expect(qc.getQueryData(queryKeys.notifications.unreadCount())).toBe(1)
    expect(qc.getQueryData<NotificationListResponse>(queryKeys.notifications.list({ per_page: 2 }))!.data).toHaveLength(1)
  })
})

describe('applyNotificationsRead', () => {
  it('marks the given notifications read everywhere and sets the count', () => {
    const qc = createTestQueryClient()
    qc.setQueryData(queryKeys.notifications.unreadCount(), 2)
    qc.setQueryData(queryKeys.notifications.list({ per_page: 2 }), list([make('a'), make('b')]))
    qc.setQueryData(queryKeys.notifications.list({ per_page: 2, status: 'unread' }), list([make('a'), make('b')]))

    applyNotificationsRead(qc, ['a'], 1)

    expect(qc.getQueryData(queryKeys.notifications.unreadCount())).toBe(1)
    const all = qc.getQueryData<NotificationListResponse>(queryKeys.notifications.list({ per_page: 2 }))!
    expect(all.data.map((n) => n.is_read)).toEqual([true, false])
    expect(all.data[0].read_at).not.toBeNull()
    expect(all.meta.unread_count).toBe(1)
    const unread = qc.getQueryData<NotificationListResponse>(queryKeys.notifications.list({ per_page: 2, status: 'unread' }))!
    expect(unread.data.map((n) => n.id)).toEqual(['b'])
    expect(unread.meta.total).toBe(1)
  })

  it('marks everything read when no ids are given', () => {
    const qc = createTestQueryClient()
    qc.setQueryData(queryKeys.notifications.unreadCount(), 2)
    qc.setQueryData(queryKeys.notifications.list({ per_page: 2 }), list([make('a'), make('b')]))

    applyNotificationsRead(qc, null, 0)

    expect(qc.getQueryData(queryKeys.notifications.unreadCount())).toBe(0)
    expect(qc.getQueryData<NotificationListResponse>(queryKeys.notifications.list({ per_page: 2 }))!.data.every((n) => n.is_read)).toBe(true)
  })
})
