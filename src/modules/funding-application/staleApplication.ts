import { createElement } from 'react'
import { toast } from 'react-toastify'
import { isStaleApplicationError } from './applicationVersion'

export const STALE_APPLICATION_MESSAGE = 'This application was changed in another tab or by someone else since you opened it. Reload to see the latest before saving.'
export const STALE_APPLICATION_TOAST_ID = 'funding-application-stale'

/**
 * A step save refused because it came from an older copy of the application
 * (R2 BUG-033): says why, with a Reload button, and stays until acted on.
 * Returns whether it was that refusal, so the step can stop there.
 */
export function reportStaleApplication(error: unknown): boolean {
  if (!isStaleApplicationError(error)) return false

  const message = (error as any)?.response?.data?.message || STALE_APPLICATION_MESSAGE
  toast.error(
    createElement('div', null,
      createElement('div', null, message),
      createElement('button', {
        type: 'button',
        className: 'btn btn-sm btn-light mt-2',
        onClick: () => window.location.reload(),
      }, 'Reload')
    ),
    { toastId: STALE_APPLICATION_TOAST_ID, autoClose: false, closeOnClick: false }
  )

  return true
}
