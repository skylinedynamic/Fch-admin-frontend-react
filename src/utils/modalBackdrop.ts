/**
 * Clear modal backdrops that no longer belong to anything on screen.
 *
 * Bootstrap, Reactstrap and Summernote all append `.modal-backdrop` to the body
 * and all clean up after themselves, but a modal torn down mid-transition can
 * leave one behind, greying the page with nothing on top of it. Several modals
 * dealt with that by removing *every* backdrop in the document, usually from an
 * unmount handler.
 *
 * That is too blunt. Closing or navigating away from one modal while another is
 * still open deleted the open one's overlay too, leaving it floating over an
 * undimmed page - and, because the sweep also cleared `modal-open`, over a page
 * that could still scroll underneath it.
 *
 * A backdrop is only stray when no modal is currently shown, so that is the
 * whole test: if anything is open, leave everything alone. GlobalModals already
 * guards its own sweep this way; this is that guard in one place, so the next
 * caller inherits it instead of rediscovering the bug.
 */
export function clearStrayModalBackdrops(): void {
  // Fires from timers and unmount handlers, where the document can already be
  // gone in a torn-down test environment.
  if (typeof document === 'undefined') return

  if (document.querySelector('.modal.show')) return

  document.querySelectorAll('.modal-backdrop').forEach((el) => el.remove())
  document.body.classList.remove('modal-open')
  document.body.style.overflow = ''
  document.body.style.paddingRight = ''
}

/**
 * Lift a Bootstrap modal that has just been shown - and its backdrop - above
 * any open PrimeReact dialog.
 *
 * A confirmation opened from inside a PrimeReact dialog (Manage Product
 * Categories, Funding Groups, ...) sits on Bootstrap's 1050/1055. PrimeReact
 * raises its dialog's z-index with every overlay opened on the page, so after a
 * while the dialog was above the confirmation and hid it. This puts the
 * backdrop just above the highest open dialog (dimming it) and the modal above
 * that. Nothing changes when no dialog is that high.
 */
export function raiseAboveOpenDialogs(modal: HTMLElement | null): void {
  if (typeof document === 'undefined' || !modal) return

  const highest = Math.max(0, ...Array.from(document.querySelectorAll('.p-dialog-mask'))
    .map((el) => Number(getComputedStyle(el).zIndex) || 0))
  if (highest < 1050) return

  const backdrops = document.querySelectorAll<HTMLElement>('.modal-backdrop')
  const backdrop = backdrops[backdrops.length - 1]
  if (backdrop) backdrop.style.zIndex = String(highest + 1)
  modal.style.zIndex = String(highest + 2)
}
