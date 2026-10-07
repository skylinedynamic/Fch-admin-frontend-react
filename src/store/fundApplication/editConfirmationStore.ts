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
  /**
   * The application is still loading, so `requiresConfirmation` is not an
   * answer yet. A save that arrives now waits for it instead of reading the
   * default `false` as "nothing is signed" and slipping past the dialog.
   */
  isResolving: boolean
  /**
   * Was the application already signed when it was opened? Then the dialog is
   * shown straight away, before any typing. Null until the first load answers;
   * an application that only becomes signed during this visit (the borrower just
   * submitted it) does not get a dialog thrown at them for it.
   */
  promptOnOpen: boolean | null
  /** The warning has been accepted for this visit, so saves stop asking. */
  hasConfirmed: boolean
  /** Is the dialog on screen right now? */
  isOpen: boolean
  /** Resolves the save that is waiting on the borrower's answer. */
  resolver: ((confirmed: boolean) => void) | null
}

export const useEditConfirmationStore = create<EditConfirmationState>(() => ({
  requiresConfirmation: false,
  isResolving: false,
  promptOnOpen: null,
  hasConfirmed: false,
  isOpen: false,
  resolver: null,
}))

/**
 * A yes survives a reload of the page, and nothing else. It is kept for the tab
 * only, against the one application it was given for, and dropped as soon as
 * the wizard is left - so coming back to the application asks again.
 */
const CONFIRMED_KEY = 'fundApplication.editConfirmedFor'

const readConfirmedFor = (): string | null => {
  try {
    return window.sessionStorage.getItem(CONFIRMED_KEY)
  } catch (_) {
    return null
  }
}

const writeConfirmedFor = (applicationId: string | null): void => {
  try {
    if (applicationId) {
      window.sessionStorage.setItem(CONFIRMED_KEY, applicationId)
    } else {
      window.sessionStorage.removeItem(CONFIRMED_KEY)
    }
  } catch (_) { }
}

// Which application the gate is currently answering for.
let currentApplicationId: string | null = null

export const getEditConfirmationState = (): EditConfirmationState => useEditConfirmationStore.getState()

/**
 * Tell the gate whether this application is in a state where an edit costs a
 * signature. Driven by the API rather than by a status list held here.
 */
export const setEditRequiresConfirmation = (
  requiresConfirmation: boolean,
  applicationId?: number | string | null
): void => {
  const { promptOnOpen } = useEditConfirmationStore.getState()

  currentApplicationId = applicationId != null ? String(applicationId) : null

  // Already said yes for this application before the page was reloaded.
  const confirmedBeforeReload =
    requiresConfirmation && currentApplicationId !== null && readConfirmedFor() === currentApplicationId

  // A loaded application that is no longer signed: an earlier yes covers
  // nothing now. (Leaving the wizard forgets it too, in resetEditConfirmation.)
  if (!requiresConfirmation && currentApplicationId !== null) writeConfirmedFor(null)

  useEditConfirmationStore.setState({
    requiresConfirmation,
    // Only the state it was opened in counts; once unsigned, the moment has passed.
    promptOnOpen: requiresConfirmation ? (promptOnOpen ?? true) : false,
    ...(requiresConfirmation ? {} : { hasConfirmed: false }),
    ...(confirmedBeforeReload ? { hasConfirmed: true } : {}),
  })

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
 * The wizard is closing. Forget everything, so nothing follows the user to the
 * next application they open.
 */
export const resetEditConfirmation = (): void => {
  setEditRequiresConfirmation(false)
  useEditConfirmationStore.setState({ isResolving: false, promptOnOpen: null, hasConfirmed: false })

  // Forget the remembered yes a tick later rather than now. In development
  // React unmounts and remounts the wizard once on load, and that must not wipe
  // the answer a reload is supposed to keep; the remount cancels this.
  pendingForget = setTimeout(() => {
    pendingForget = null
    writeConfirmedFor(null)
  }, 0)
}

let pendingForget: ReturnType<typeof setTimeout> | null = null

/**
 * Mark the flag as unknown while the application is being fetched, and as
 * settled once it has arrived (or failed - the API still enforces the rule).
 */
export const setEditConfirmationResolving = (isResolving: boolean): void => {
  // The wizard is mounted (again), so it was not really left.
  if (pendingForget !== null) {
    clearTimeout(pendingForget)
    pendingForget = null
  }

  useEditConfirmationStore.setState({ isResolving })
}

const whenResolved = (): Promise<void> =>
  new Promise<void>(resolve => {
    if (!useEditConfirmationStore.getState().isResolving) {
      resolve()
      return
    }

    const unsubscribe = useEditConfirmationStore.subscribe(state => {
      if (!state.isResolving) {
        unsubscribe()
        resolve()
      }
    })
  })

/**
 * Ask the borrower to confirm, if this edit would cost them a signature.
 * Resolves true to go ahead, false if they back out.
 */
export const requestEditConfirmation = (): Promise<boolean> => {
  // The step forms load before the application's status does, so a quick Save
  // can get here first. Wait for the real answer rather than guessing.
  if (useEditConfirmationStore.getState().isResolving) {
    return whenResolved().then(askForConfirmation)
  }

  return askForConfirmation()
}

const askForConfirmation = (): Promise<boolean> => {
  const { requiresConfirmation, hasConfirmed, isOpen, resolver } = useEditConfirmationStore.getState()

  if (!requiresConfirmation || hasConfirmed) {
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

  useEditConfirmationStore.setState({ isOpen: false, resolver: null, ...(confirmed ? { hasConfirmed: true } : {}) })

  if (confirmed) writeConfirmedFor(currentApplicationId)

  resolver?.(confirmed)
}
