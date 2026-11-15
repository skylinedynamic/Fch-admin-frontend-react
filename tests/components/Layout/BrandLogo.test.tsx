import { describe, expect, it } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import BrandLogo from '../../../src/components/Layout/BrandLogo'

/**
 * BrandLogo (BUG-170): the site name replaces a logo that can't load; with no
 * name to show it renders nothing rather than a broken-image box.
 */
describe('BrandLogo', () => {
  it('uses its own alt text when given one', () => {
    render(<BrandLogo src="/logo.png" fallbackText="Site" alt="Custom alt" />)

    expect(screen.getByRole('img')).toHaveAttribute('alt', 'Custom alt')
  })

  it('has an empty alt when there is no name at all', () => {
    const { container } = render(<BrandLogo src="/logo.png" />)

    expect(container.querySelector('img')).toHaveAttribute('alt', '')
  })

  it('shows the fallback name when there is no logo address', () => {
    render(<BrandLogo src={null} fallbackText="Site" />)

    expect(screen.getByText('Site')).toHaveClass('brand-logo-text')
  })

  it('renders nothing when the logo fails and there is no name', () => {
    const { container } = render(<BrandLogo src="/logo.png" />)

    fireEvent.error(container.querySelector('img')!)

    expect(container).toBeEmptyDOMElement()
  })
})
