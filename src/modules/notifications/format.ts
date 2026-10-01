/** Unread badge text: the count, capped at "99+". */
export const formatUnreadCount = (count: number): string => (count > 99 ? '99+' : String(count))
