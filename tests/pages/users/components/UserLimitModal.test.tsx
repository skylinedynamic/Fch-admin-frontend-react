import { afterEach, describe, expect, it, vi } from 'vitest'
import { render, waitFor } from '@testing-library/react'
// @ts-expect-error -- untyped third-party module
import Modal from 'bootstrap/js/dist/modal'
import UserLimitModal from '../../../../src/pages/users/components/UserLimitModal'

/**
 * Defect: the modal had no unmount cleanup. Opened with /users/create at the
 * seat limit, Cancel goes to the Users list, which unmounts it while open -
 * Bootstrap never hid it, so its backdrop stayed over the list.
 */
afterEach(() => vi.restoreAllMocks())

describe('UserLimitModal', () => {
  it('hides itself, and so its backdrop, when unmounted while open', async () => {
    const hide = vi.spyOn(Modal.prototype, 'hide')
    const dispose = vi.spyOn(Modal.prototype, 'dispose')
    const { unmount } = render(
      <UserLimitModal show onHide={() => {}} onProceed={() => {}} userCount={3} freeLimit={3} perUserPrice={49} />
    )

    unmount()

    expect(hide).toHaveBeenCalled()
    await waitFor(() => expect(dispose).toHaveBeenCalledOnce(), { timeout: 2000 })
  })
})

/**
 * BUG-070: inactive users still take a seat (only a deleted user frees one).
 * The message must say so and how to free a seat, not only "Payment is required".
 */
describe('UserLimitModal › message', () => {
  it('says inactive users take a seat and how to free one', () => {
    const { container } = render(
      <UserLimitModal show onHide={() => {}} onProceed={() => {}} userCount={3} freeLimit={3} perUserPrice={49} />
    )

    const message = container.querySelector('[data-testid="user-limit-message"]') as HTMLElement
    expect(message).toHaveTextContent('All 3 user seats are in use.')
    expect(message).toHaveTextContent('Inactive users still take a seat.')
    expect(message).toHaveTextContent('To free one, delete a user you no longer need, or buy an additional seat below.')
    expect(message).not.toHaveTextContent('Payment is required')
  })
})
