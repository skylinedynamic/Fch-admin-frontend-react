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
