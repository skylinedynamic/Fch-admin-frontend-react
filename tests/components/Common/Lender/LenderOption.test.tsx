import { describe, expect, it } from 'vitest'
import { render } from '@testing-library/react'
import LenderOption, { lenderOptionParts } from '../../../../src/components/Common/Lender/LenderOption'

/**
 * How a lender reads in a lender dropdown (2026-11-11, design A): the name on
 * the left, the Lender Code right-aligned in a small grey monospace font - on
 * one line, never wrapped. The selected value shows the code right after the name.
 */
describe('LenderOption', () => {
  it('shows the name and, apart from it, the Lender Code', () => {
    const { container } = render(<LenderOption name="National Funding" code="LND-72648" />)

    expect(container.querySelector('.lender-option-name')).toHaveTextContent('National Funding')
    expect(container.querySelector('.lender-option-code')).toHaveTextContent('LND-72648')
    expect(container.querySelector('.lender-option')).not.toHaveClass('lender-option-inline')
  })

  it('puts the code right after the name for the selected value', () => {
    const { container } = render(<LenderOption name="Mara Lloyd" code="LND-726221" inline />)

    expect(container.querySelector('.lender-option')).toHaveClass('lender-option-inline')
  })

  it('shows the name alone when there is no code, and a suffix after the name', () => {
    const { container } = render(<LenderOption name="Kabbage - Kabbage Inc." suffix=" (Inactive)" />)

    expect(container.querySelector('.lender-option-name')).toHaveTextContent('Kabbage - Kabbage Inc. (Inactive)')
    expect(container.querySelector('.lender-option-code')).toBeNull()
  })
})

describe('lenderOptionParts', () => {
  it('is the lender name and its code', () => {
    expect(lenderOptionParts({ name: ' Kiavi ', legal_name: 'Kiavi Funding', lender_code: 'LND-93245' })).toEqual({ name: 'Kiavi', code: 'LND-93245' })
  })

  it('falls back to "Lender Name - Legal Name" without a code', () => {
    expect(lenderOptionParts({ name: 'Kiavi', legal_name: 'Kiavi Funding' })).toEqual({ name: 'Kiavi - Kiavi Funding', code: null })
  })

  it('uses the code as the name when a lender has no name', () => {
    expect(lenderOptionParts({ name: '  ', lender_code: 'LND-00075' })).toEqual({ name: 'LND-00075', code: 'LND-00075' })
    expect(lenderOptionParts({ name: null, lender_code: 'LND-00075' })).toEqual({ name: 'LND-00075', code: 'LND-00075' })
  })
})

describe('LenderOption extra classes', () => {
  it('adds a given class, e.g. the picker\'s green "already chosen" look', () => {
    const { container } = render(<LenderOption name="Kiavi" code="LND-93245" className="text-success fw-bold" />)

    expect(container.querySelector('.lender-option')).toHaveClass('text-success', 'fw-bold')
  })
})
