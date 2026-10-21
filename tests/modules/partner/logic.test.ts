import { describe, expect, it } from 'vitest'
import { partnerOptionLabel } from '../../../src/modules/partner/logic'

describe('partnerOptionLabel', () => {
  it('is the company with the name in brackets', () => {
    expect(partnerOptionLabel({ id: 2, full_name: 'Wil Label', company_name: 'WLP Co' })).toBe('WLP Co (Wil Label)')
  })

  it('is whichever of the two a partner has', () => {
    expect(partnerOptionLabel({ id: 2, full_name: 'Wil Label', company_name: null })).toBe('Wil Label')
    expect(partnerOptionLabel({ id: 2, full_name: '', company_name: 'WLP Co' })).toBe('WLP Co')
  })

  it('falls back to the partner number with neither', () => {
    expect(partnerOptionLabel({ id: 9, full_name: '', company_name: null })).toBe('Partner #9')
  })
})
