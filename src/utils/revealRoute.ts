/**
 * Shows the page the user was just sent to: scrolls it smoothly to the top and
 * brings its sidebar entry into view.
 *
 * Called right after navigate(). It waits a tick so the new route (and the
 * sidebar's active link) has rendered first. Navigating to the page already
 * open does not move it, so the scroll is what makes "Take Me There" visible
 * there too.
 */
export function revealRoute(): void {
  window.setTimeout(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' })

    const activeLink = document.querySelector<HTMLElement>('#scrollbar .active')
    activeLink?.scrollIntoView?.({ block: 'nearest', behavior: 'smooth' })
  }, 0)
}
