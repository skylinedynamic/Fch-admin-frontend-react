import { describe, expect, it } from 'vitest'
import { hasMoreDecimalsThan } from '../../src/utils/amountInput'

// BUG-076: a price is kept to the cent. The Plan & Fee boxes take at most 2
// digits after the decimal point - a 3rd one is not typed in.
describe('hasMoreDecimalsThan', () => {
  it.each(['', '10', '10.', '10.2', '10.22', '0.01', '.5', '.55'])('%s fits in 2 decimal places', (value) => {
    expect(hasMoreDecimalsThan(value, 2)).toBe(false)
  })

  it.each(['10.222', '10.555', '0.001', '.555', '1.0000'])('%s has more than 2 decimal places', (value) => {
    expect(hasMoreDecimalsThan(value, 2)).toBe(true)
  })

  it('counts against the places it is given', () => {
    expect(hasMoreDecimalsThan('1.5', 0)).toBe(true)
    expect(hasMoreDecimalsThan('1', 0)).toBe(false)
    expect(hasMoreDecimalsThan('1.555', 3)).toBe(false)
  })
})
