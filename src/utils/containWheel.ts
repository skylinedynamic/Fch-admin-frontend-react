/**
 * Make a mouse wheel over `el` scroll `el` and nothing else.
 *
 * By default, once a scrollable list reaches its end (or if it is too short
 * to scroll at all) the browser hands the wheel to the page behind it - which
 * scrolled the whole screen while picking a month or year, and, for
 * PrimeReact, closed the calendar, since it hides on any page scroll.
 *
 * Returns a function that removes the handling again.
 *
 * The borrower (client-fch) and partner (Fch-admin-frontend-react) portals
 * carry identical copies of this file; keep the two in sync.
 */
const LINE_HEIGHT_PX = 16

export const containWheel = (el: HTMLElement): (() => void) => {
  const onWheel = (e: WheelEvent) => {
    e.preventDefault()
    const unit = e.deltaMode === WheelEvent.DOM_DELTA_LINE
      ? LINE_HEIGHT_PX
      : e.deltaMode === WheelEvent.DOM_DELTA_PAGE ? el.clientHeight : 1
    el.scrollTop += e.deltaY * unit
  }
  // Not passive, or preventDefault() is ignored.
  el.addEventListener('wheel', onWheel, { passive: false })
  return () => el.removeEventListener('wheel', onWheel)
}
