import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { http, HttpResponse } from 'msw'
import { renderWithProviders, waitFor } from '../../test-utils'
import { server } from '../../mocks/server'
import SignIn from '../../../src/pages/singin/SignIn.jsx'

/**
 * BUG-118: the login footer names the company the portal is branded as. With
 * no name - the branding request failed, or the domain resolved to no partner
 * - it read "(c) 2026 . All rights reserved."
 */
const year = new Date().getFullYear()
const footer = (container: HTMLElement) => container.querySelector('footer')?.textContent?.trim()

const branding = (siteName: string | null) =>
  server.use(
    http.get('*/common/branding', () =>
      HttpResponse.json({ success: true, data: { branding: { site_name: siteName }, css_vars: null } })
    )
  )

beforeEach(() => localStorage.clear())
afterEach(() => {
  server.resetHandlers()
  localStorage.clear()
})

describe('Login page footer', () => {
  it('names the company the portal is branded as', async () => {
    branding('Four Corner Funding')
    const { container } = renderWithProviders(<SignIn />)

    await waitFor(() => expect(footer(container)).toBe(`© ${year} Four Corner Funding. All rights reserved.`))
  })

  it.each([[null], ['']])('leaves no gap when the branding has no name (%j)', async (siteName) => {
    branding(siteName)
    const { container } = renderWithProviders(<SignIn />)

    await waitFor(() => expect(footer(container)).toBe(`© ${year}. All rights reserved.`))
  })

  it('leaves no gap when the branding request fails', async () => {
    server.use(http.get('*/common/branding', () => HttpResponse.json({ message: 'Server Error' }, { status: 500 })))
    const { container } = renderWithProviders(<SignIn />)

    await waitFor(() => expect(footer(container)).toBe(`© ${year}. All rights reserved.`))
  })
})
