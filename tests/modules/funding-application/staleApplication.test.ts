import { afterEach, describe, expect, it, vi } from 'vitest'

vi.mock('react-toastify', () => ({ toast: { success: vi.fn(), error: vi.fn(), info: vi.fn() } }))

import { render, screen } from '@testing-library/react'
import { toast } from 'react-toastify'
import {
  reportStaleApplication,
  STALE_APPLICATION_MESSAGE,
  STALE_APPLICATION_TOAST_ID,
} from '../../../src/modules/funding-application/staleApplication'

/**
 * Defect: R2 BUG-033 - a partner's save from a tab showing an older copy of
 * the application silently overwrote the newer one. The API now refuses it
 * (409); the wizard says why and offers a reload instead of "Please resolve
 * validation errors" or a generic failure.
 */
describe('reportStaleApplication', () => {
  afterEach(() => vi.clearAllMocks())

  it('shows the API message with a Reload button, kept on screen', () => {
    const message = 'This application was changed in another tab or by someone else since you opened it. Reload to see the latest before saving.'

    expect(reportStaleApplication({ response: { status: 409, data: { message } } })).toBe(true)

    const [content, options] = (toast.error as any).mock.calls[0]
    expect(options).toMatchObject({ toastId: STALE_APPLICATION_TOAST_ID, autoClose: false })
    render(content)
    expect(screen.getByText(message)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /reload/i })).toBeInTheDocument()
  })

  it('has its own words when the API sends none', () => {
    reportStaleApplication({ response: { status: 409, data: {} } })

    render((toast.error as any).mock.calls[0][0])
    expect(screen.getByText(STALE_APPLICATION_MESSAGE)).toBeInTheDocument()
  })

  it('leaves every other failure to the step', () => {
    expect(reportStaleApplication({ response: { status: 422, data: { errors: { name: 'x' } } } })).toBe(false)
    expect(reportStaleApplication(new Error('Network Error'))).toBe(false)
    expect(toast.error).not.toHaveBeenCalled()
  })
})
