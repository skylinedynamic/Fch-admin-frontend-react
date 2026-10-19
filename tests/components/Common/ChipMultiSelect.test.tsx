import { useState } from 'react'
import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import ChipMultiSelect from '../../../src/components/Common/ChipMultiSelect'

/**
 * The one look for a several-at-once picker in the portal (Purpose of Funds,
 * Additional Funding Types): chips inside the field, a search-only header, no
 * "select all" box.
 */
const OPTIONS = [
  { label: 'Inventory', value: 'Inventory' },
  { label: 'Payroll', value: 'Payroll' },
  { label: 'Working Capital', value: 'Working Capital' },
]

function Harness({ initial = [] as string[], invalid = false, filter = false }) {
  const [value, setValue] = useState<string[]>(initial)
  return (
    <>
      <label htmlFor="picker">Picker</label>
      <ChipMultiSelect
        inputId="picker"
        value={value}
        options={OPTIONS}
        onChange={setValue}
        placeholder="Pick some"
        invalid={invalid}
        filter={filter}
        filterPlaceholder="Search"
      />
      <output data-testid="value">{JSON.stringify(value)}</output>
    </>
  )
}

const control = (container: HTMLElement) => container.querySelector('.p-multiselect') as HTMLElement
const chips = (container: HTMLElement) =>
  Array.from(container.querySelectorAll('.p-multiselect-token-label')).map((el) => el.textContent)

describe('ChipMultiSelect', () => {
  it('is labelled, and styled as the chip picker', () => {
    const { container } = render(<Harness />)

    expect(screen.getByLabelText('Picker')).toBeInTheDocument()
    expect(control(container).closest('.chip-multiselect')).not.toBeNull()
  })

  it('shows the chosen values as chips', () => {
    const { container } = render(<Harness initial={['Payroll', 'Inventory']} />)

    expect(chips(container)).toEqual(['Payroll', 'Inventory'])
  })

  it('opens a list with no select-all box, and adds to what was chosen', async () => {
    const user = userEvent.setup()
    const { container } = render(<Harness initial={['Inventory']} />)

    await user.click(container.querySelector('.p-multiselect-trigger') as HTMLElement)
    const panel = container.querySelector('.p-multiselect-panel') as HTMLElement
    expect(panel).toHaveClass('chip-multiselect-panel')
    expect(panel.querySelector('.p-multiselect-header .p-checkbox')).toBeNull()

    await user.click(await screen.findByText('Payroll', { selector: '.p-multiselect-item span' }))
    expect(JSON.parse(screen.getByTestId('value').textContent || '[]')).toEqual(['Inventory', 'Payroll'])
  })

  it('removes a value by its chip', async () => {
    const user = userEvent.setup()
    const { container } = render(<Harness initial={['Inventory', 'Payroll']} />)

    const chip = Array.from(container.querySelectorAll('.p-multiselect-token')).find((el) => el.textContent?.includes('Inventory')) as HTMLElement
    await user.click(chip.querySelector('.p-multiselect-token-icon') as Element)

    expect(JSON.parse(screen.getByTestId('value').textContent || '[]')).toEqual(['Payroll'])
  })

  it('offers a search box when asked to', async () => {
    const user = userEvent.setup()
    const { container } = render(<Harness filter />)

    await user.click(container.querySelector('.p-multiselect-trigger') as HTMLElement)

    expect(screen.getByPlaceholderText('Search')).toBeInTheDocument()
  })

  it('marks the field invalid', () => {
    const { container } = render(<Harness invalid />)

    expect(control(container)).toHaveClass('p-invalid')
  })
})
