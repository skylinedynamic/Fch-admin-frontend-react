import { describe, expect, it, vi } from 'vitest'
import { act, renderHook } from '@testing-library/react'
import { useLeadConvertOwner } from '../../../../src/pages/leads/hooks/useLeadConvertOwner'

const WLP = { id: 2, company_name: 'WLP Co' }

describe('useLeadConvertOwner', () => {
  it('goes straight on to converting a lead not converted on another partner\'s behalf', () => {
    const next = vi.fn()
    const { result } = renderHook(() => useLeadConvertOwner())

    act(() => result.current.confirmOwnerThen({ convert_on_behalf_of: null }, next))

    expect(next).toHaveBeenCalledOnce()
    expect(result.current.ownerModalProps.show).toBe(false)
  })

  it('treats a lead without the field (an older API) the same', () => {
    const next = vi.fn()
    const { result } = renderHook(() => useLeadConvertOwner())

    act(() => result.current.confirmOwnerThen({}, next))

    expect(next).toHaveBeenCalledOnce()
  })

  it('first tells the host it converts on the lead partner\'s behalf, then converts', () => {
    const next = vi.fn()
    const { result } = renderHook(() => useLeadConvertOwner())

    act(() => result.current.confirmOwnerThen({ convert_on_behalf_of: WLP }, next))

    expect(next).not.toHaveBeenCalled()
    expect(result.current.ownerModalProps.show).toBe(true)

    act(() => result.current.ownerModalProps.onContinue())

    expect(next).toHaveBeenCalledOnce()
    expect(result.current.ownerModalProps.show).toBe(false)
  })

  it('converts nothing when cancelled', () => {
    const next = vi.fn()
    const { result } = renderHook(() => useLeadConvertOwner())

    act(() => result.current.confirmOwnerThen({ convert_on_behalf_of: WLP }, next))
    act(() => result.current.ownerModalProps.onHide())
    act(() => result.current.ownerModalProps.onContinue())

    expect(next).not.toHaveBeenCalled()
    expect(result.current.ownerModalProps.show).toBe(false)
  })
})
