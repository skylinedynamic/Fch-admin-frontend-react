import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { http, HttpResponse } from 'msw'
import { renderWithProviders } from '../../test-utils'
import { server } from '../../mocks/server'
import { setAuthState, clearAuthState } from '../../../src/store/auth'

vi.mock('../../../src/lib/realtime/echo', () => ({
  getEcho: () => null,
  disconnectEcho: () => {},
  userChannelName: (id: number | string) => `App.Models.User.${id}`,
}))

import Header from '../../../src/components/Layout/Header'

/**
 * Defect (R2 BUG-096, R2-OP-GLOB-02): at 200% zoom (a 768-991 px window) the
 * full sidebar stayed open on top of the page, covering its left 250 px and the
 * menu button. Below 992 px the app treats the screen as mobile (the page is not
 * shifted), so there the menu button opens and closes the off-canvas sidebar, as
 * on a phone, instead of switching the sidebar size.
 */
const setWidth = (width: number) => Object.defineProperty(window, 'innerWidth', { value: width, configurable: true, writable: true })
const initialWidth = window.innerWidth

beforeEach(() => {
  setAuthState({ token: 't', user: { id: 5, name: 'Host Admin' } as any })
  server.use(http.get('*/common/notifications', () => HttpResponse.json({ status: true, data: [], meta: { current_page: 1, last_page: 1, per_page: 10, total: 0, unread_count: 0 } })))
  document.body.classList.remove('vertical-sidebar-enable')
  document.documentElement.setAttribute('data-sidebar-size', 'lg')
})

afterEach(() => {
  clearAuthState()
  setWidth(initialWidth)
  document.body.classList.remove('vertical-sidebar-enable')
})

const menuButton = () => document.getElementById('topnav-hamburger-icon') as HTMLButtonElement

describe('Header - menu button at tablet width / 200% zoom', () => {
  it.each([768, 900, 991])('at %i px opens and closes the off-canvas sidebar, leaving the size alone', (width) => {
    setWidth(width)
    renderWithProviders(<Header />)

    menuButton().click()
    expect(document.body).toHaveClass('vertical-sidebar-enable')
    expect(document.documentElement.getAttribute('data-sidebar-size')).toBe('lg')

    menuButton().click()
    expect(document.body).not.toHaveClass('vertical-sidebar-enable')
  })

  it('from 992 px still switches the sidebar between full and icons', () => {
    setWidth(1024)
    renderWithProviders(<Header />)

    menuButton().click()
    expect(document.documentElement.getAttribute('data-sidebar-size')).toBe('sm')
    expect(document.body).not.toHaveClass('vertical-sidebar-enable')
  })
})
