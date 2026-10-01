import { describe, expect, it } from 'vitest'
import { groupNotificationsByDay } from '../../../src/modules/notifications/grouping'
import type { AppNotification } from '../../../src/modules/notifications/types'

const at = (id: string, date: Date | null): AppNotification => ({
  id,
  type: 'system.test',
  title: id,
  body: '',
  url: null,
  icon: null,
  category: 'system',
  is_read: false,
  read_at: null,
  created_at: date ? date.toISOString() : null,
})

describe('groupNotificationsByDay', () => {
  // Local times, so the test means the same thing in every timezone.
  const now = new Date(2026, 9, 1, 15, 0)

  it('groups newest-first notifications under Today, Yesterday and the date', () => {
    const groups = groupNotificationsByDay(
      [
        at('a', new Date(2026, 9, 1, 14, 0)),
        at('b', new Date(2026, 9, 1, 0, 5)),
        at('c', new Date(2026, 8, 30, 23, 59)),
        at('d', new Date(2026, 8, 28, 9, 0)),
        at('e', new Date(2026, 8, 28, 8, 0)),
      ],
      now
    )

    expect(groups.map((g) => [g.label, g.items.map((n) => n.id)])).toEqual([
      ['Today', ['a', 'b']],
      ['Yesterday', ['c']],
      ['Sep 28, 2026', ['d', 'e']],
    ])
  })

  it('puts notifications without a date under "Earlier"', () => {
    const groups = groupNotificationsByDay([at('x', null)], now)

    expect(groups).toEqual([{ key: 'earlier', label: 'Earlier', items: [expect.objectContaining({ id: 'x' })] }])
  })

  it('returns no groups for no notifications', () => {
    expect(groupNotificationsByDay([], now)).toEqual([])
  })
})
