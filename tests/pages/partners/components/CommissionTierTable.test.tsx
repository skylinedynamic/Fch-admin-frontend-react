import { useState } from 'react'
import { describe, expect, it, vi } from 'vitest'
import userEvent from '@testing-library/user-event'
import { render, screen, within } from '@testing-library/react'
import CommissionTierTable, { type TierRow } from '../../../../src/pages/partners/components/CommissionTierTable'

/** The table is controlled: hold its rows the way the Commissions tab does. */
function Harness({ initial, errors = {}, disabled = false, onRows }: {
  initial: TierRow[]
  errors?: Record<string, string>
  disabled?: boolean
  onRows?: (rows: TierRow[]) => void
}) {
  const [rows, setRows] = useState(initial)
  return (
    <CommissionTierTable
      idPrefix="partner-tier"
      rows={rows}
      errors={errors}
      errorPrefix="tiers"
      disabled={disabled}
      onChange={(next) => {
        setRows(next)
        onRows?.(next)
      }}
    />
  )
}

const ONE: TierRow[] = [{ min_count: 0, max_count: 10, percentage: '10' }]

describe('CommissionTierTable', () => {
  it('shows each tier with its range and %', () => {
    render(<Harness initial={ONE} />)

    expect(screen.getByLabelText('Tier 1 from')).toHaveValue(0)
    expect(screen.getByLabelText('Tier 1 to')).toHaveValue(10)
    expect(screen.getByLabelText('Tier 1 commission (%)')).toHaveValue(10)
  })

  it('adds a tier that starts right after the last one', async () => {
    const onRows = vi.fn()
    render(<Harness initial={ONE} onRows={onRows} />)

    await userEvent.click(screen.getByRole('button', { name: /add tier/i }))

    expect(screen.getByLabelText('Tier 2 from')).toHaveValue(11)
    expect(screen.getByLabelText('Tier 2 to')).toHaveValue(null)
    expect(onRows).toHaveBeenLastCalledWith([ONE[0], { min_count: 11, max_count: '', percentage: '' }])
  })

  it('always starts the first tier at 0: its From is fixed and the tier cannot be removed', async () => {
    render(<Harness initial={[{ min_count: 0, max_count: 10, percentage: '10' }, { min_count: 11, max_count: '', percentage: '12' }]} />)

    const from = screen.getByLabelText('Tier 1 from')
    expect(from).toHaveValue(0)
    expect(from).toHaveAttribute('readonly')
    expect(screen.getByRole('button', { name: 'Remove tier 1' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Remove tier 2' })).toBeEnabled()
    // Later tiers' starts stay editable.
    expect(screen.getByLabelText('Tier 2 from')).not.toHaveAttribute('readonly')
  })

  it('shows 0 for the first tier even if it came in blank', () => {
    render(<Harness initial={[{ min_count: '', max_count: '', percentage: '' }]} />)

    expect(screen.getByLabelText('Tier 1 from')).toHaveValue(0)
  })

  it('removes a later tier', async () => {
    render(<Harness initial={[...ONE, { min_count: 11, max_count: '', percentage: '12' }]} />)

    await userEvent.click(screen.getByRole('button', { name: 'Remove tier 2' }))

    expect(screen.queryByLabelText('Tier 2 from')).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Remove tier 1' })).toBeDisabled()
  })

  it('shows an error under the field it belongs to', () => {
    render(
      <Harness
        initial={[...ONE, { min_count: 12, max_count: '', percentage: '12' }]}
        errors={{
          'tiers.1.min_count': 'This tier must start at 11, right after the previous tier.',
          tiers: 'Send the commission tiers.',
        }}
      />
    )

    const from = screen.getByLabelText('Tier 2 from')
    expect(from).toHaveClass('is-invalid')
    expect(within(from.closest('td') as HTMLElement).getByText('This tier must start at 11, right after the previous tier.')).toBeInTheDocument()
    expect(screen.getByText('Send the commission tiers.')).toBeInTheDocument()
  })

  it('is read-only when disabled', () => {
    render(<Harness initial={ONE} disabled />)

    expect(screen.getByLabelText('Tier 1 from')).toBeDisabled()
    expect(screen.queryByRole('button', { name: /add tier/i })).not.toBeInTheDocument()
  })
})
