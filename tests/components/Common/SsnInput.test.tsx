import { useState } from 'react'
import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import SsnInput from '../../../src/components/Common/SsnInput'

/**
 * The full SSN input: masked at rest (***-**-6789); a click on the field makes
 * it editable, hidden as dots like a number being typed; the eye button shows
 * the digits; leaving the field masks it again.
 */
function Harness({ initial = '123-45-6789' }: { initial?: string }) {
  const [value, setValue] = useState(initial)
  return (
    <>
      <label htmlFor="ssn">Social Security Number</label>
      <SsnInput id="ssn" value={value} onChange={setValue} />
      <output data-testid="value">{value}</output>
      <button type="button">Elsewhere</button>
    </>
  )
}

const input = () => screen.getByLabelText(/social security number/i) as HTMLInputElement

describe('SsnInput', () => {
  it('shows a complete number masked while the field is not in use', () => {
    render(<Harness />)

    expect(input().value).toBe('***-**-6789')
    expect(input()).toHaveAttribute('type', 'text')
  })

  it('becomes editable when the field is clicked, the number hidden as dots', async () => {
    const user = userEvent.setup()
    render(<Harness />)

    await user.click(input())

    expect(input()).not.toHaveAttribute('readonly')
    expect(input().value).toBe('123-45-6789')
    expect(input()).toHaveAttribute('type', 'password')
  })

  it('takes a new number typed after clicking the field, formatted', async () => {
    const user = userEvent.setup()
    render(<Harness />)

    await user.click(input())
    await user.clear(input())
    await user.type(input(), '234567890')

    expect(screen.getByTestId('value')).toHaveTextContent('234-56-7890')
  })

  it('masks the number again once the field is left', async () => {
    const user = userEvent.setup()
    render(<Harness />)

    await user.click(input())
    await user.click(screen.getByRole('button', { name: 'Elsewhere' }))

    expect(input().value).toBe('***-**-6789')
  })

  it('shows the digits on the eye button, and hides them again', async () => {
    const user = userEvent.setup()
    render(<Harness />)

    await user.click(screen.getByRole('button', { name: /show ssn/i }))
    expect(input().value).toBe('123-45-6789')
    expect(input()).toHaveAttribute('type', 'text')

    await user.click(screen.getByRole('button', { name: /hide ssn/i }))
    expect(input().value).toBe('***-**-6789')
  })
})
