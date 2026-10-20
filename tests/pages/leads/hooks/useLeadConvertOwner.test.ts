import { describe, expect, it, vi } from 'vitest'
import { act, renderHook } from '@testing-library/react'
import { useLeadConvertOwner } from '../../../../src/pages/leads/hooks/useLeadConvertOwner'
import { LEAD_CONVERT_AS } from '../../../../src/modules/leads/types'

const OPTIONS = [
  { value: LEAD_CONVERT_AS.HOST, company_name: 'Host Co' },
  { value: LEAD_CONVERT_AS.LEAD_PARTNER, company_name: 'WLP Co' },
]

describe('useLeadConvertOwner', () => {
  it('goes straight on to converting a lead that offers no owner choice', () => {
    const next = vi.fn()
    const { result } = renderHook(() => useLeadConvertOwner())

    act(() => result.current.chooseOwnerThen({ convert_as_options: [] }, next))

    expect(next).toHaveBeenCalledOnce()
    expect(result.current.ownerModalProps.show).toBe(false)
    expect(result.current.withConvertAs({ is_free_trail: false })).toEqual({ is_free_trail: false })
  })

  it('treats a lead without the field (an older API) as offering no choice', () => {
    const next = vi.fn()
    const { result } = renderHook(() => useLeadConvertOwner())

    act(() => result.current.chooseOwnerThen({}, next))

    expect(next).toHaveBeenCalledOnce()
  })

  it('asks whose borrower the lead becomes before converting, then sends the choice', () => {
    const next = vi.fn()
    const { result } = renderHook(() => useLeadConvertOwner())

    act(() => result.current.chooseOwnerThen({ convert_as_options: OPTIONS }, next))

    expect(next).not.toHaveBeenCalled()
    expect(result.current.ownerModalProps.show).toBe(true)
    expect(result.current.ownerModalProps.options).toEqual(OPTIONS)

    act(() => result.current.ownerModalProps.onSelect(LEAD_CONVERT_AS.LEAD_PARTNER))

    expect(next).toHaveBeenCalledOnce()
    expect(result.current.ownerModalProps.show).toBe(false)
    expect(result.current.withConvertAs({ is_free_trail: false })).toEqual({ is_free_trail: false, convert_as: 'lead_partner' })
  })

  it('converts nothing when the choice is cancelled', () => {
    const next = vi.fn()
    const { result } = renderHook(() => useLeadConvertOwner())

    act(() => result.current.chooseOwnerThen({ convert_as_options: OPTIONS }, next))
    act(() => result.current.ownerModalProps.onHide())

    expect(next).not.toHaveBeenCalled()
    expect(result.current.ownerModalProps.show).toBe(false)
    expect(result.current.withConvertAs({})).toEqual({})
  })

  it('forgets the previous lead\'s choice when another lead is converted', () => {
    const { result } = renderHook(() => useLeadConvertOwner())

    act(() => result.current.chooseOwnerThen({ convert_as_options: OPTIONS }, vi.fn()))
    act(() => result.current.ownerModalProps.onSelect(LEAD_CONVERT_AS.HOST))
    act(() => result.current.chooseOwnerThen({ convert_as_options: [] }, vi.fn()))

    expect(result.current.withConvertAs({})).toEqual({})
  })
})
