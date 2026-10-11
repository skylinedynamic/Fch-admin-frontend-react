import { requestEditConfirmation } from '../../store/fundApplication/editConfirmationStore'

/**
 * Thrown when the borrower backs out of the "this will need a new signature"
 * dialog. It is not a failure - nothing was attempted - so the steps check for
 * it and stay quiet rather than toasting "Failed to save".
 */
export class EditConfirmationCancelled extends Error {
  constructor() {
    super('Edit cancelled by the borrower')
    this.name = 'EditConfirmationCancelled'
  }
}

export const isEditConfirmationCancelled = (error: unknown): boolean =>
  error instanceof EditConfirmationCancelled

/**
 * Wrap a save so it asks before changing an application the borrower has
 * already signed.
 *
 * Applied to the mutation functions rather than to each step's button, because
 * every step saves through one of these and a step can save from two places
 * (its own button, and the wizard auto-saving on a tab switch). Gating at the
 * single point they share is what makes "no save slips past the confirmation"
 * true rather than true-in-the-places-we-remembered.
 *
 * The signing step is deliberately not wrapped: signing is the thing that
 * resolves the warning, not another edit that needs one.
 */
export const withEditConfirmation =
  <TPayload, TResult>(save: (payload: TPayload) => Promise<TResult>) =>
  async (payload: TPayload): Promise<TResult> => {
    const confirmed = await requestEditConfirmation()

    if (!confirmed) {
      throw new EditConfirmationCancelled()
    }

    return save(payload)
  }
