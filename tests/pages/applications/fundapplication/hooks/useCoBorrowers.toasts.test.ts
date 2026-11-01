import { describe, expect, it, vi } from 'vitest'
import { act, renderHook } from '@testing-library/react'

vi.mock('react-toastify', () => ({ toast: { success: vi.fn(), error: vi.fn() } }))
vi.mock('bootstrap/js/dist/modal', () => ({
  default: class {
    static getOrCreateInstance = () => ({ show: vi.fn(), hide: vi.fn() })
    static getInstance = () => ({ hide: vi.fn() })
  },
}))

import { toast } from 'react-toastify'
import { useCoBorrowers } from '../../../../../src/pages/applications/fundapplication/hooks/useCoBorrowers'

const submitEvent = () => ({ preventDefault: vi.fn(), stopPropagation: vi.fn() }) as any

/** BUG-108 (admin): the toasts read in full - "added / updated / removed successfully". */
describe('useCoBorrowers toasts', () => {
  it('says added, updated and removed successfully', () => {
    const { result } = renderHook(() => useCoBorrowers())

    act(() => result.current.addCoBorrower())
    act(() => result.current.submitCoBorrower(submitEvent()))
    expect(toast.success).toHaveBeenLastCalledWith('Co-borrower added successfully')

    act(() => result.current.editCoBorrower(0))
    act(() => result.current.submitCoBorrower(submitEvent()))
    expect(toast.success).toHaveBeenLastCalledWith('Co-borrower updated successfully')

    act(() => result.current.deleteCoBorrower(0))
    expect(toast.success).toHaveBeenLastCalledWith('Co-borrower removed successfully')
    expect(result.current.coBorrowers).toHaveLength(0)
  })
})
