import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import CommissionKpiCard from '../../../../src/pages/dashboard/components/CommissionKpiCard'
import type { DashboardCommission } from '../../../../src/modules/dashboard'

const show = (commission: DashboardCommission | undefined, isLoading = false) =>
  render(
    <MemoryRouter>
      <CommissionKpiCard commission={commission} isLoading={isLoading} />
    </MemoryRouter>
  )

describe('CommissionKpiCard', () => {
  // One figure only - what was earned (funded deals, paid out or not). The
  // paid/unpaid breakdown lives on the Commissions page.
  it('shows the host owner what was earned, paid out or not', () => {
    show({ viewer: 'host_owner', earned_amount: 22500, paid_amount: 16000, pending_amount: 2000, unpaid_amount: 6500, paid_to_staff: 2000 })

    expect(screen.getByText('Commission Earned')).toBeInTheDocument()
    expect(screen.getByText('$22,500')).toBeInTheDocument()
    expect(screen.queryByText(/Pending|Unpaid|Paid to staff/)).not.toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'View all commissions' })).toHaveAttribute('href', '/commissions')
  })

  it('shows a partner owner its earned share, paid out or not', () => {
    show({ viewer: 'partner_owner', earned_amount: 5500, paid_amount: 4000, pending_amount: 0, unpaid_amount: 1500 })

    expect(screen.getByText('Commission Earned')).toBeInTheDocument()
    expect(screen.getByText('$5,500')).toBeInTheDocument()
    expect(screen.queryByText(/Pending|Unpaid/)).not.toBeInTheDocument()
  })

  it('shows host staff their earned payout, paid or expected', () => {
    show({ viewer: 'host_staff', earned_amount: 3000, paid_amount: 2000, expected_amount: 1000, expected_deals: 1 })

    expect(screen.getByText('My Commission')).toBeInTheDocument()
    expect(screen.getByText('$3,000')).toBeInTheDocument()
    expect(screen.queryByText(/Expected/)).not.toBeInTheDocument()
  })

  it('shows partner staff their deals instead of any commission money', () => {
    show({ viewer: 'partner_staff', deals: 3, completed_deals: 1 })

    expect(screen.getByText('My Deals')).toBeInTheDocument()
    expect(screen.getByText('3')).toBeInTheDocument()
    expect(screen.queryByText(/completed/)).not.toBeInTheDocument()
    expect(screen.queryByText(/\$/)).not.toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'View my deals' })).toHaveAttribute('href', '/commissions')
  })

  // An API from before the per-viewer card sends only counts.total_commission.
  it('falls back to the plain total when the API sends no commission card', () => {
    render(
      <MemoryRouter>
        <CommissionKpiCard commission={undefined} legacyTotal={6000} isLoading={false} />
      </MemoryRouter>
    )

    expect(screen.getByText('Total Commission')).toBeInTheDocument()
    expect(screen.getByText('$6,000')).toBeInTheDocument()
  })

  it('shows a placeholder while loading', () => {
    const { container } = show(undefined, true)

    expect(container.querySelector('.skeleton-line')).not.toBeNull()
  })
})
