import { describe, expect, it, vi } from 'vitest'
import userEvent from '@testing-library/user-event'
import { render, screen } from '@testing-library/react'
import CustomDropdown from '../../../src/components/Common/CustomDropdown'

const OPTIONS = [
  { value: 'percentage', label: 'Percentage' },
  { value: 'flat', label: 'Flat Amount' },
]

describe('CustomDropdown', () => {
  it('shows the selected option and picks another', async () => {
    const onChange = vi.fn()
    render(<CustomDropdown options={OPTIONS} value="percentage" onChange={onChange} optionLabel="label" optionValue="value" />)

    const toggle = screen.getByRole('button', { name: 'Percentage' })
    await userEvent.click(toggle)
    await userEvent.click(screen.getByRole('button', { name: 'Flat Amount' }))

    expect(onChange).toHaveBeenCalledWith('flat')
  })

  // A dropdown with no <label> - a table cell, say - is named by ariaLabel.
  it('takes an accessible name', () => {
    render(<CustomDropdown options={OPTIONS} value="flat" onChange={vi.fn()} optionLabel="label" optionValue="value" ariaLabel="Tier 1 commission type" />)

    expect(screen.getByRole('button', { name: 'Tier 1 commission type' })).toHaveTextContent('Flat Amount')
  })

  it('does not open when disabled', async () => {
    render(<CustomDropdown options={OPTIONS} value="flat" onChange={vi.fn()} optionLabel="label" optionValue="value" ariaLabel="Type" disabled />)

    expect(screen.getByRole('button', { name: 'Type' })).toBeDisabled()
    expect(screen.queryByRole('button', { name: 'Percentage' })).not.toBeInTheDocument()
  })
})
