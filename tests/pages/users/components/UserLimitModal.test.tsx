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
