import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import RevealableValue from '../../../src/components/Common/RevealableValue'
import { formatEIN } from '../../../src/utils/borrowerFormatters'

/**
 * BUG-014: a masked SSN or EIN shown read-only (client details, change
 * requests) - the eye button fetches it once, written out; the eye again hides it.
 */
describe('RevealableValue', () => {
  it('shows the mask, then the number written out on the eye button', async () => {
    const user = userEvent.setup()
    const onReveal = vi.fn().mockResolvedValue('534534534')
    render(<RevealableValue value="**-***4534" name="EIN" onReveal={onReveal} format={formatEIN} />)

    expect(screen.getByText('**-***4534')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Show EIN' }))
    expect(await screen.findByText('53-4534534')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Hide EIN' }))
    expect(screen.getByText('**-***4534')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Show EIN' }))
    expect(screen.getByText('53-4534534')).toBeInTheDocument()
    expect(onReveal).toHaveBeenCalledTimes(1)
  })

  it('shows a dash and no eye when there is no number', () => {
    render(<RevealableValue value={null} name="EIN" onReveal={vi.fn()} format={formatEIN} />)

    expect(screen.getByText('-')).toBeInTheDocument()
    expect(screen.queryByRole('button')).not.toBeInTheDocument()
  })
})
