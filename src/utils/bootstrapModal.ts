/**
 * Close and tear down a Bootstrap modal instance from a React unmount cleanup.
 *
 * Calling `hide()` and then `dispose()` straight away races Bootstrap: dispose
 * nulls the instance's element, and the queued animation callback then uses
 * it, throwing an uncaught "Cannot read properties of null". The hide
 * animation writes `element.style` (E2E-018 in fch-borrower-react); a modal
 * unmounted while still opening ignores `hide()` and its show animation calls
 * `element.focus()` - the unhandled error that failed CI in Users.test.tsx.
 * So dispose waits for `hidden.bs.modal`, with a fallback for a modal that
 * sends no event (already closed, or still opening).
 *
 * Same helper as fch-borrower-react's `src/utils/bootstrapModal.ts`.
 */
interface DisposableModal {
  hide: () => void
  dispose: () => void
}

const FALLBACK_MS = 1000

export function hideAndDisposeModal(modal: DisposableModal | null | undefined, element: HTMLElement | null | undefined): void {
  if (!modal) return

  let disposed = false
  const dispose = () => {
    if (disposed) return
    disposed = true
    try {
      modal.dispose()
    } catch {
      /* already torn down */
    }
  }

  element?.addEventListener('hidden.bs.modal', dispose, { once: true })
  try {
    modal.hide()
  } catch {
    /* already torn down */
  }
  setTimeout(dispose, FALLBACK_MS)
}
