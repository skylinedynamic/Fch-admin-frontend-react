import { useState } from 'react'
import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import UsesField, { usesOptionsFor } from '../../../../src/pages/funding/components/UsesField'
import { USES_OPTIONS } from '../../../../src/config/funding'

/**
 * Edit Funding Sequence -> Uses: a sequence holds several uses
 * (funding_sequencings.uses is an array), so the field selects several. It was
 * a single-select showing only the first, and a save then kept only that one.
 */
function Harness({ initial }: { initial: string[] }) {
  const [uses, setUses] = useState<string[]>(initial)
  return (
    <>
      <UsesField value={uses} onChange={setUses} />
      <output data-testid="uses">{JSON.stringify(uses)}</output>
    </>
  )
}

const chips = (container: HTMLElement) =>
  Array.from(container.querySelectorAll('.p-multiselect-token-label')).map((el) => el.textContent)

describe('usesOptionsFor', () => {
  it('is the standard list when every saved use is on it', () => {
    expect(usesOptionsFor(['Inventory', 'Payroll'])).toEqual(USES_OPTIONS)
  })

  it('adds a saved use that is not on the list, so it is neither hidden nor lost', () => {
    const options = usesOptionsFor(['Inventory', 'Travel'])

    expect(options).toHaveLength(USES_OPTIONS.length + 1)
    expect(options).toContainEqual({ label: 'Travel', value: 'Travel' })
  })
})

describe('UsesField', () => {
  it('uses the shared taxonomy picker look, like Lenders -> Product Categories', async () => {
    const user = userEvent.setup()
    const { container } = render(<Harness initial={['Inventory']} />)

    // Labelled, inside the taxonomy-field wrapper, no slim style.
    const control = container.querySelector('.p-multiselect') as HTMLElement
    expect(screen.getByLabelText('Uses')).toBeInTheDocument()
    expect(control.closest('.taxonomy-field')).not.toBeNull()
    expect(control).not.toHaveClass('slim-multiselect')

    await user.click(container.querySelector('.p-multiselect-trigger') as HTMLElement)
    const panel = container.querySelector('.p-multiselect-panel') as HTMLElement
    expect(panel).toHaveClass('taxonomy-field-panel')
    // No "select all" box in the header: just the search.
    expect(panel.querySelector('.p-multiselect-header .p-checkbox')).toBeNull()
  })

  it('shows every saved use, not just the first', () => {
    const { container } = render(<Harness initial={['Working Capital', 'Inventory', 'Payroll', 'Marketing']} />)

    expect(chips(container)).toEqual(['Working Capital', 'Inventory', 'Payroll', 'Marketing'])
  })

  it('adds a use without dropping the others', async () => {
    const user = userEvent.setup()
    const { container } = render(<Harness initial={['Inventory', 'Travel']} />)

    await user.click(container.querySelector('.p-multiselect-trigger') as HTMLElement)
    await user.click(await screen.findByText('Payroll', { selector: '.p-multiselect-item span' }))

    expect(JSON.parse(screen.getByTestId('uses').textContent || '[]')).toEqual(['Inventory', 'Travel', 'Payroll'])
  })

  it('removes one use by its chip', async () => {
    const user = userEvent.setup()
    const { container } = render(<Harness initial={['Inventory', 'Payroll']} />)

    const inventoryChip = Array.from(container.querySelectorAll('.p-multiselect-token')).find((el) => el.textContent?.includes('Inventory')) as HTMLElement
    await user.click(inventoryChip.querySelector('.p-multiselect-token-icon') as Element)

    expect(JSON.parse(screen.getByTestId('uses').textContent || '[]')).toEqual(['Payroll'])
  })
})
