import { describe, expect, it } from 'vitest'
import { isMaskedValue, maskEIN } from '../../src/utils/borrowerFormatters'

/** BUG-014: the API sends an SSN or EIN masked; the portal masks the same way. */
describe('maskEIN', () => {
  it('keeps the last four, written like an EIN - as the API masks it', () => {
    expect(maskEIN('53-4534534')).toBe('**-***4534')
    expect(maskEIN('534534534')).toBe('**-***4534')
  })

  it('is empty for no number', () => {
    expect(maskEIN('')).toBe('')
  })
})

describe('isMaskedValue', () => {
  it('is true for a mask and false for a number or nothing', () => {
    expect(isMaskedValue('***-**-6789')).toBe(true)
    expect(isMaskedValue('**-***4534')).toBe(true)
    expect(isMaskedValue('123-45-6789')).toBe(false)
    expect(isMaskedValue('')).toBe(false)
    expect(isMaskedValue(null)).toBe(false)
    expect(isMaskedValue(undefined)).toBe(false)
  })
})
