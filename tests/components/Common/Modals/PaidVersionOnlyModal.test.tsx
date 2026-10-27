import { afterEach, describe, expect, it, vi } from 'vitest'
import { render, waitFor } from '@testing-library/react'
import Modal from 'bootstrap/js/dist/modal'
import PaidVersionOnlyModal from '../../../../src/components/Common/Modals/PaidVersionOnlyModal'

/**
 * Defect: on unmount the modal was hidden and disposed back to back. Unmounted
 * while still opening (a page test ending, or a page change), Bootstrap ignores
 * the hide and its show animation then called focus() on the disposed modal -
 * an uncaught "Cannot read properties of null (reading 'focus')" that failed
 * the CI run from Users.test.tsx.
 */
afterEach(() => vi.restoreAllMocks())

describe('PaidVersionOnlyModal', () => {
  it('is not disposed while it is still opening, only once that has settled', async () => {
    const dispose = vi.spyOn(Modal.prototype, 'dispose')
    const { unmount } = render(<PaidVersionOnlyModal show onHide={() => {}} message="Only in the paid version." />)

    unmount()

    expect(dispose).not.toHaveBeenCalled()
    await waitFor(() => expect(dispose).toHaveBeenCalledOnce(), { timeout: 2000 })
  })
})
