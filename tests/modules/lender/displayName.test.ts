import { describe, expect, it } from 'vitest'
import { lenderDisplayName, lenderOptionLabel } from '../../../src/modules/lender/displayName'
import * as lenderModule from '../../../src/modules/lender'

/**
 * R2 BUG-008: two lenders named "Kabbage" looked the same everywhere. A lender
 * is shown as "Lender Name - Legal Name" - the API's display_name when sent.
 */
describe('lenderDisplayName', () => {
  it("uses the API's display_name", () => {
    expect(lenderDisplayName({ name: 'Kabbage', legal_name: 'Kabbage Inc.', display_name: 'Kabbage - Kabbage Inc.' })).toBe('Kabbage - Kabbage Inc.')
  })

  it('builds it from name and legal name when the API sent none', () => {
    expect(lenderDisplayName({ name: ' Kabbage ', legal_name: ' Kabbage Inc. ' })).toBe('Kabbage - Kabbage Inc.')
  })

  it.each([
    [{ name: 'Kabbage' }, 'Kabbage'],
    [{ name: 'Kabbage', legal_name: '  ' }, 'Kabbage'],
    [{ legal_name: 'Kabbage Inc.' }, 'Kabbage Inc.'],
    [null, ''],
    [undefined, ''],
  ])('falls back sensibly for %o', (lender, shown) => {
    expect(lenderDisplayName(lender as never)).toBe(shown)
  })

  it('is offered by the lender module', () => {
    expect(lenderModule.lenderDisplayName).toBe(lenderDisplayName)
  })
})

/**
 * Every lender dropdown names a lender "Lender Name - Lender Code" (2026-11-11):
 * names and legal names may repeat, the Lender Code never does.
 */
describe('lenderOptionLabel', () => {
  it('is the name and the Lender Code', () => {
    expect(lenderOptionLabel({ name: ' Kabbage ', legal_name: 'Kabbage Inc.', lender_code: 'LND-4821' })).toBe('Kabbage - LND-4821')
  })

  it('falls back to the usual name for a lender without a Lender Code yet', () => {
    expect(lenderOptionLabel({ name: 'Kabbage', legal_name: 'Kabbage Inc.' })).toBe('Kabbage - Kabbage Inc.')
    expect(lenderOptionLabel({ lender_code: 'LND-0007' })).toBe('LND-0007')
    expect(lenderOptionLabel(null)).toBe('')
  })

  it('is offered by the lender module', () => {
    expect(lenderModule.lenderOptionLabel).toBe(lenderOptionLabel)
  })
})
