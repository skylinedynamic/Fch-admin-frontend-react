import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import SsnValue from '../../../src/components/Common/SsnValue'

/**
 * A Social Security Number shown read-only, the way the SSN field shows one:
 * masked ***-**-1234, the digits written XXX-XX-XXXX on the eye button.
 */
describe('SsnValue', () => {
  it('shows a full SSN masked, and written XXX-XX-XXXX on the eye button', async () => {
    const user = userEvent.setup()
    render(<SsnValue value="325555555" />)

    expect(screen.getByText('***-**-5555')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Show SSN' }))
    expect(screen.getByText('325-55-5555')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Hide SSN' }))
    expect(screen.getByText('***-**-5555')).toBeInTheDocument()
  })

  it('reads a written SSN the same way', async () => {
    const user = userEvent.setup()
    render(<SsnValue value="325-55-5555" />)

    await user.click(screen.getByRole('button', { name: 'Show SSN' }))
    expect(screen.getByText('325-55-5555')).toBeInTheDocument()
  })

  it('shows only the last four, with nothing to reveal, when that is all there is', () => {
    render(<SsnValue value="6789" />)

    expect(screen.getByText('***-**-6789')).toBeInTheDocument()
    expect(screen.queryByRole('button')).not.toBeInTheDocument()
  })

  // R3-BUG-044: the details now send the SSN masked; the eye asks the API
  // for the full number (a logged reveal) instead of showing a copy it holds.
  it('reveals a masked SSN through onReveal, once, and hides it again', async () => {
    const user = userEvent.setup()
    const onReveal = vi.fn().mockResolvedValue('123456789')
    render(<SsnValue value="***-**-6789" onReveal={onReveal} />)

    expect(screen.getByText('***-**-6789')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Show SSN' }))
    expect(await screen.findByText('123-45-6789')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Hide SSN' }))
    expect(screen.getByText('***-**-6789')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Show SSN' }))
    expect(screen.getByText('123-45-6789')).toBeInTheDocument()
    expect(onReveal).toHaveBeenCalledTimes(1)
  })

  it('keeps a masked SSN masked when the reveal fails', async () => {
    const user = userEvent.setup()
    render(<SsnValue value="***-**-6789" onReveal={vi.fn().mockRejectedValue(new Error('no'))} />)

    await user.click(screen.getByRole('button', { name: 'Show SSN' }))

    expect(await screen.findByText('***-**-6789')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Show SSN' })).toBeInTheDocument()
  })

  it('shows a dash for no SSN', () => {
    render(<SsnValue value={null} />)

    expect(screen.getByText('-')).toBeInTheDocument()
    expect(screen.queryByRole('button')).not.toBeInTheDocument()
  })
})
