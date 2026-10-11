import type { AppNotification } from './types'

export interface NotificationGroup {
  key: string
  /** "Today", "Yesterday", a date ("Sep 28, 2026"), or "Earlier" when undated. */
  label: string
  items: AppNotification[]
}

const startOfDay = (date: Date) => new Date(date.getFullYear(), date.getMonth(), date.getDate())

/**
 * Splits a newest-first list into consecutive day groups for display. Days are
 * the viewer's local calendar days.
 */
export function groupNotificationsByDay(items: AppNotification[], now: Date = new Date()): NotificationGroup[] {
  const today = startOfDay(now)
  const yesterday = new Date(today.getFullYear(), today.getMonth(), today.getDate() - 1)
  const groups: NotificationGroup[] = []

  for (const item of items) {
    const created = item.created_at ? new Date(item.created_at) : null
    const valid = created && !Number.isNaN(created.getTime()) ? created : null

    let key = 'earlier'
    let label = 'Earlier'

    if (valid) {
      const day = startOfDay(valid)
      key = String(day.getTime())
      label = day.getTime() === today.getTime()
        ? 'Today'
        : day.getTime() === yesterday.getTime()
          ? 'Yesterday'
          : day.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    }

    const last = groups[groups.length - 1]
    if (last && last.key === key) {
      last.items.push(item)
    } else {
      groups.push({ key, label, items: [item] })
    }
  }

  return groups
}
