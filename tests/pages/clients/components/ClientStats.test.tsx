import { describe, expect, it } from 'vitest'
import { render } from '@testing-library/react'
import ClientStats from '../../../../src/pages/clients/components/ClientStats'

const STATS = {
  total_borrowers: 49, active_borrowers: 32, inactive_borrowers: 13, suspended_borrowers: 4,
  host_borrowers: 36, partner_borrowers: 13, new_this_month: 2,
}

/** Each card as [title, value], in order. */
const cards = (container: HTMLElement) =>
  Array.from(container.querySelectorAll('.card')).map((card) => [
    card.querySelector('.kpi-title')?.textContent?.trim(),
    card.querySelector('.counter-value')?.textContent?.trim(),
  ])

describe('ClientStats', () => {
  it('shows the host its whole book and how it splits between its own and its partners’ clients', () => {
    const { container } = render(<ClientStats isHost stats={STATS} />)

    expect(cards(container)).toEqual([
      ['Total Clients', '49'],
      ['Host Clients', '36'],
      ['Partner Clients', '13'],
      ['Active Clients', '32'],
    ])
  })

  it('shows a partner its own clients by status', () => {
    const { container } = render(<ClientStats isHost={false} stats={STATS} />)

    expect(cards(container)).toEqual([
      ['Total Clients', '49'],
      ['Active Clients', '32'],
      ['Inactive Clients', '13'],
      ['Suspended Clients', '4'],
    ])
  })

  it('shows placeholders while loading', () => {
    const { container } = render(<ClientStats isHost stats={null} isLoading />)

    expect(container.querySelectorAll('.statistics-skeleton')).toHaveLength(4)
    expect(container.querySelectorAll('.kpi-title')).toHaveLength(0)
  })
})
