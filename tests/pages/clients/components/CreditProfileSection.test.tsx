import { describe, expect, it } from 'vitest'
import { renderWithProviders } from '../../../test-utils'
import CreditProfileSection from '../../../../src/pages/clients/components/CreditProfileSection'

/**
 * The section locks scrolling on .page-content. That makes .page-content the
 * sticky page header's scroll container, so the header's `top: 70px` (meant to
 * clear the fixed topbar) pushed it 70px down inside the page instead.
 */
describe('Client credit profile section', () => {
  const mountInPage = () => {
    const page = document.createElement('div')
    page.className = 'page-content'
    document.body.appendChild(page)
    const view = renderWithProviders(<CreditProfileSection clientId={3} />, { container: page })
    return { page, view }
  }

  it('marks the page as scroll-locked while it is shown', () => {
    const { page, view } = mountInPage()

    expect(page).toHaveClass('page-content-scroll-locked')

    view.unmount()
    expect(page).not.toHaveClass('page-content-scroll-locked')
    page.remove()
  })
})
