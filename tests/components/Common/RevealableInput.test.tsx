import { useState } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import RevealableInput from '../../../src/components/Common/RevealableInput'
import { formatSSN, maskSSN } from '../../../src/utils/borrowerFormatters'

/**
 * BUG-014: an SSN or EIN on file arrives masked from the API. The field shows
 * the mask, read-only; the eye button fetches the number and opens it for
 * editing; the eye again hides it. With no number on file it is a plain input.
 */
function Harness({ initial, onReveal, initiallyHidden }: { initial: string; onReveal: () => Promise<string | null>; initiallyHidden?: boolean }) {
  const [value, setValue] = useState(initial)
  return (
    <>
      <label htmlFor="ssn">Social Security Number</label>
      <RevealableInput id="ssn" name="SSN" value={value} onChange={setValue} onReveal={onReveal} format={formatSSN} mask={maskSSN} placeholder="XXX-XX-XXXX" initiallyHidden={initiallyHidden} />
      <output data-testid="value">{value}</output>
    </>
  )
}

const input = () => screen.getByLabelText('Social Security Number') as HTMLInputElement

describe('RevealableInput', () => {
  it('shows a number on file masked and read-only, fetching nothing', () => {
    const onReveal = vi.fn()
    render(<Harness initial="***-**-6789" onReveal={onReveal} />)

    expect(input().value).toBe('***-**-6789')
    expect(input()).toHaveAttribute('readonly')
    expect(onReveal).not.toHaveBeenCalled()
  })

  it('the eye button fetches the number, shows it written out and opens it for editing', async () => {
    const user = userEvent.setup()
    const onReveal = vi.fn().mockResolvedValue('123456789')
    render(<Harness initial="***-**-6789" onReveal={onReveal} />)

    await user.click(screen.getByRole('button', { name: 'Show SSN' }))

    await waitFor(() => expect(input().value).toBe('123-45-6789'))
    expect(input()).not.toHaveAttribute('readonly')
    expect(screen.getByTestId('value')).toHaveTextContent('123-45-6789')
    expect(onReveal).toHaveBeenCalledTimes(1)

    await user.clear(input())
    await user.type(input(), '234567890')
    expect(screen.getByTestId('value')).toHaveTextContent('234-56-7890')
  })

  it('the eye again hides the number, and showing it once more fetches nothing new', async () => {
    const user = userEvent.setup()
    const onReveal = vi.fn().mockResolvedValue('123456789')
    render(<Harness initial="***-**-6789" onReveal={onReveal} />)

    await user.click(screen.getByRole('button', { name: 'Show SSN' }))
    await waitFor(() => expect(input().value).toBe('123-45-6789'))
    await user.click(screen.getByRole('button', { name: 'Hide SSN' }))

    expect(input().value).toBe('***-**-6789')
    expect(input()).toHaveAttribute('readonly')

    await user.click(screen.getByRole('button', { name: 'Show SSN' }))
    expect(input().value).toBe('123-45-6789')
    expect(onReveal).toHaveBeenCalledTimes(1)
  })

  it('a failed reveal leaves the mask in place', async () => {
    const user = userEvent.setup()
    render(<Harness initial="***-**-6789" onReveal={vi.fn().mockRejectedValue(new Error('403'))} />)

    await user.click(screen.getByRole('button', { name: 'Show SSN' }))

    await waitFor(() => expect(screen.getByRole('button', { name: 'Show SSN' })).not.toBeDisabled())
    expect(input().value).toBe('***-**-6789')
  })

  it('with no number on file it is a plain input, written out as typed', async () => {
    const user = userEvent.setup()
    const onReveal = vi.fn()
    render(<Harness initial="" onReveal={onReveal} />)

    await user.type(input(), '123456789')

    expect(input().value).toBe('123-45-6789')
    expect(onReveal).not.toHaveBeenCalled()
  })

  /** BUG-145: an SSN read from a credit report is held in full until saved - it still starts masked. */
  it('starts a number held in full masked when asked to, opening it without a fetch', async () => {
    const user = userEvent.setup()
    const onReveal = vi.fn()
    render(<Harness initial="123-45-6789" onReveal={onReveal} initiallyHidden />)

    expect(input().value).toBe('***-**-6789')
    expect(input()).toHaveAttribute('readonly')

    await user.click(screen.getByRole('button', { name: 'Show SSN' }))

    expect(input().value).toBe('123-45-6789')
    expect(onReveal).not.toHaveBeenCalled()
  })
})
