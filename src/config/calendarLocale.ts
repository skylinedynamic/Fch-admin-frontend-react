import { updateLocaleOption } from 'primereact/api'

/**
 * Weekday column labels for PrimeReact's <Calendar>.
 *
 * Flatpickr heads its columns Sun/Mon/...; PrimeReact defaults to Su/Mo/...
 * Both are uppercased by the calendar stylesheets, so with these the two read
 * SUN MON ... alike. Text only - nothing about how a date is picked changes.
 *
 * The borrower (client-fch) and partner (Fch-admin-frontend-react) portals
 * carry identical copies of this file; keep the two in sync.
 */
export const CALENDAR_WEEKDAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

export const applyCalendarLocale = () => {
  updateLocaleOption('dayNamesMin', CALENDAR_WEEKDAY_LABELS, 'en')
}
