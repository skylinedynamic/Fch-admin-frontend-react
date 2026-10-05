import { create } from 'zustand'

/**
 * The gate between a borrower editing an already-signed application and the
 * save actually going out.
 *
 * Once an application has been submitted, the borrower has signed for the
 * figures on it. Changing one withdraws that signature and drops the
 * application back to Draft until they sign again - the API enforces this
 * whatever the UI does. That is not something to discover after the fact, so
 * the first save after submission asks first.
 *
 * It is a store rather than component state because the save paths that need
 * to wait on it are the mutation functions in
 * `modules/funding-application/editConfirmation.ts`, which are plain async
 * functions outside the React tree. That is the same reason `authStore` exposes
 * plain getters for the axios interceptors.
 *
 * `requiresConfirmation` is driven by the API's `edit_requires_resign` flag -
 * the server decides which statuses carry a signature, not the client.
 */

type EditConfirmationState = {
  /** Does an edit to this application currently cost a signature? */
  requiresConfirmation: boolean
  /** Is the dialog on screen right now? */
  isOpen: boolean
  /** Resolves the save that is waiting on the borrower's answer. */
  resolver: ((confirmed: boolean) => void) | null
}

export const useEditConfirmationStore = create<EditConfirmationState>(() => ({
  requiresConfirmation: false,
  isOpen: false,
  resolver: null,
}))

export const getEditConfirmationState = (): EditConfirmationState => useEditConfirmationStore.getState()

/**
 * Tell the gate whether this application is in a state where an edit costs a
 * signature. Driven by the API rather than by a status list held here.
 */
export const setEditRequiresConfirmation = (requiresConfirmation: boolean): void => {
  useEditConfirmationStore.setState({ requiresConfirmation })

  // The application stopped being signed (it dropped to Draft, or the borrower
  // signed again) while a dialog was up. Release the waiting save rather than
  // leaving its button spinning against a question that no longer applies.
  if (!requiresConfirmation) {
    const { isOpen, resolver } = useEditConfirmationStore.getState()
    if (isOpen && resolver) {
      resolver(true)
      useEditConfirmationStore.setState({ isOpen: false, resolver: null })
    }
  }
}

/**
 * Ask the borrower to confirm, if this edit would cost them a signature.
 * Resolves true to go ahead, false if they back out.
 */
export const requestEditConfirmation = (): Promise<boolean> => {
  const { requiresConfirmation, isOpen, resolver } = useEditConfirmationStore.getState()

  if (!requiresConfirmation) {
    return Promise.resolve(true)
  }

  // A second save arrived while the dialog is already up - the borrower paged
  // through quickly, or a tab switch and a Save button fired together. Answer
  // the one already waiting so its button stops spinning, and let this one take
  // over the dialog. Never leave a promise with no dialog behind it.
  if (isOpen && resolver) {
    resolver(false)
  }

  return new Promise<boolean>(resolve => {
    useEditConfirmationStore.setState({ isOpen: true, resolver: resolve })
  })
}

/**
 * The borrower answered. Called by the dialog's buttons.
 */
export const resolveEditConfirmation = (confirmed: boolean): void => {
  const { resolver } = useEditConfirmationStore.getState()

  useEditConfirmationStore.setState({ isOpen: false, resolver: null })

  resolver?.(confirmed)
}
