import { describe, expect, it } from 'vitest'
import { renderWithProviders, screen, within } from '../../test-utils'
import PageHeader from '../../../src/pages/common/PageHeader'

describe('PageHeader', () => {
  it('renders the title and always starts the trail at the dashboard', () => {
    renderWithProviders(<PageHeader title="Clients" breadcrumbs={[{ label: 'Clients' }]} />)

    expect(screen.getByRole('heading', { level: 4 })).toHaveTextContent('Clients')
    expect(screen.getByRole('link', { name: 'Dashboard' })).toHaveAttribute('href', '/')
  })

  it('links crumbs that have a path and marks the last one as the current page', () => {
    renderWithProviders(
      <PageHeader title="Client Profile" breadcrumbs={[{ label: 'Clients', path: '/clients' }, { label: 'Client Profile' }]} />
    )
    const trail = within(screen.getByRole('navigation', { name: 'breadcrumb' }))

    expect(trail.getByRole('link', { name: 'Clients' })).toHaveAttribute('href', '/clients')
    const current = trail.getByText('Client Profile')
    expect(current).toHaveAttribute('aria-current', 'page')
    expect(current.tagName).toBe('LI')
    expect(trail.queryByRole('link', { name: 'Client Profile' })).not.toBeInTheDocument()
  })

  it('renders the actions passed as children', () => {
    renderWithProviders(
      <PageHeader title="Clients" breadcrumbs={[]}>
        <button type="button">Add Client</button>
      </PageHeader>
    )

    expect(screen.getByRole('button', { name: 'Add Client' })).toBeInTheDocument()
  })

  it('renders no action area when there are no children', () => {
    const { container } = renderWithProviders(<PageHeader title="Clients" breadcrumbs={[]} />)

    expect(container.querySelector('.page-actions')).toBeNull()
  })

  it('is sticky by default and can be switched to the mobile header', () => {
    const sticky = renderWithProviders(<PageHeader title="A" breadcrumbs={[]} />)
    expect(sticky.container.firstElementChild).toHaveClass('page-subheader-sticky')
    sticky.unmount()

    const plain = renderWithProviders(<PageHeader title="A" breadcrumbs={[]} sticky={false} />)
    expect(plain.container.firstElementChild).toHaveClass('mobile-sticky-header')
    expect(plain.container.firstElementChild).not.toHaveClass('page-subheader-sticky')
  })

  it('accepts a node as the title, so a loading page can pass a skeleton', () => {
    renderWithProviders(<PageHeader title={<span data-testid="skeleton" />} breadcrumbs={[]} />)

    expect(screen.getByTestId('skeleton')).toBeInTheDocument()
  })
})
