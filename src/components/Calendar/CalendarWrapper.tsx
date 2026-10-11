import { forwardRef, useContext, useImperativeHandle, useRef } from 'react'
import { Calendar as PrimeCalendar } from '@primereact/calendar'
import { PrimeReactContext, PrimeReactProvider } from 'primereact/api'
import type { CalendarProps } from 'primereact/calendar'
import CalendarNavDropdown from './CalendarNavDropdown'

/**
 * Every `import { Calendar } from 'primereact/calendar'` in the app resolves
 * here (vite.config.js alias), the same way primereact/datatable resolves to
 * components/Table/DataTableWrapper.jsx.
 *
 * It is PrimeReact's own <Calendar> with one change: the header's month and
 * year become dropdown lists in the borrower calendar design (see
 * CalendarNavDropdown) instead of buttons that switch to a month/year grid.
 * Any prop a page passes still wins, so a page can opt out.
 *
 * It also makes the popup behave on phones: it is kept on the screen, and
 * turning the phone or scrolling the page under it no longer throws.
 *
 * The borrower (client-fch) and partner (Fch-admin-frontend-react) portals
 * carry identical copies of this file; keep the two in sync.
 */
export * from '@primereact/calendar'

const dayStart = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime()

/**
 * Flatpickr shows the neighbouring months' days in light grey while they are
 * inside minDate/maxDate, and in the disabled grey once they are not.
 * PrimeReact marks all of them disabled, so the stylesheet cannot tell the two
 * apart; this marks the in-range ones (primereact-calendar.css colours them).
 */
const dayTemplate = (minDate?: Date | null, maxDate?: Date | null) =>
  (meta: { day: number; month: number; year: number; otherMonth: boolean }) => {
    if (!meta.otherMonth) return meta.day
    const t = new Date(meta.year, meta.month, meta.day).getTime()
    const inRange = (!minDate || t >= dayStart(minDate)) && (!maxDate || t <= dayStart(maxDate))
    return inRange ? <span className="p-cal-other-in-range">{meta.day}</span> : meta.day
  }

/** Years the year list offers: minDate/maxDate when set, else 1900 to ten years ahead. */
export const yearRangeFor = (minDate?: Date | null, maxDate?: Date | null, now = new Date()) =>
  `${minDate ? minDate.getFullYear() : 1900}:${maxDate ? maxDate.getFullYear() : now.getFullYear() + 10}`

/**
 * Moves an open popup back onto the screen if it runs off the right (or left)
 * edge, the way PrimeReact itself does on a desktop.
 *
 * PrimeReact measures against window.innerWidth, but a phone widens that as
 * soon as the popup overflows the page, so on a phone the check passed and a
 * popup under a right-hand field hung off the screen. The page's own width
 * (documentElement.clientWidth) does not move, so this measures against that.
 */
export const keepOnScreen = (panel: HTMLElement) => {
  const screenWidth = document.documentElement.clientWidth
  const { left, right } = panel.getBoundingClientRect()
  let shift = 0
  if (right > screenWidth) shift = screenWidth - right
  if (left + shift < 0) shift = -left
  if (shift) panel.style.left = `${(parseFloat(panel.style.left) || 0) + shift}px`
}

export const Calendar = forwardRef<PrimeCalendar, CalendarProps>((props, ref) => {
  // Neither app has a <PrimeReactProvider>. Without one, PrimeReact's popup
  // reads its settings from an undefined context whenever the page scrolls or
  // the phone turns, and throws - leaving the popup where it was. Calendars
  // get one here, with PrimeReact's own default settings.
  const context = useContext(PrimeReactContext)

  // Our own handle on the calendar (for its popup), passed on to the page's ref.
  const calendarRef = useRef<PrimeCalendar>(null)
  useImperativeHandle(ref, () => calendarRef.current as PrimeCalendar)

  // Month-only and year-only pickers have no day view to navigate.
  const navigates = !props.view || props.view === 'date'

  const defaults: Partial<CalendarProps> = navigates
    ? {
        monthNavigator: true,
        yearNavigator: true,
        yearRange: yearRangeFor(props.minDate, props.maxDate),
        monthNavigatorTemplate: (e: any) => (
          <CalendarNavDropdown kind="month" options={e.options} value={e.value} onChange={e.onChange} />
        ),
        yearNavigatorTemplate: (e: any) => (
          <CalendarNavDropdown kind="year" options={e.options} value={e.value} onChange={e.onChange} />
        ),
        dateTemplate: dayTemplate(props.minDate, props.maxDate),
      }
    : {}

  // Runs right after PrimeReact has placed the popup - one microtask later,
  // once the calendar's ref is set in this commit, and still before the
  // browser paints. A page's own transitionOptions still run too.
  const transitionOptions = {
    ...props.transitionOptions,
    onEnter: (...args: any[]) => {
      queueMicrotask(() => {
        const panel = calendarRef.current?.getOverlay()
        if (panel) keepOnScreen(panel)
      })
      ;(props.transitionOptions?.onEnter as ((...a: any[]) => void) | undefined)?.(...args)
    },
  }

  const calendar = <PrimeCalendar ref={calendarRef} {...defaults} {...(props as any)} transitionOptions={transitionOptions} />
  return context ? calendar : <PrimeReactProvider>{calendar}</PrimeReactProvider>
})

Calendar.displayName = 'Calendar'
