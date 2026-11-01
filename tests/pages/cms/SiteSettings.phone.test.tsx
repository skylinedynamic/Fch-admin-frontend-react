import { describe, expect, it, vi } from 'vitest'
import userEvent from '@testing-library/user-event'
import { screen, waitFor } from '../../test-utils'
import { allowBackgroundCalls, api, renderPage, signIn } from '../pageHarness'

vi.mock('react-toastify', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-toastify')>()
  return { ...actual, toast: Object.assign(vi.fn(), { info: vi.fn(), success: vi.fn(), error: vi.fn(), warn: vi.fn() }) }
})

import SiteSettings from '../../../src/pages/cms/SiteSettings'

/**
 * CMS -> Site Settings: the site's phone number is a US number, written
 * (XXX) XXX-XXXX as it is typed and as it loads - the API checks it with
 * UsPhoneNumber, so the "+1 234 567 890" placeholder pointed the wrong way.
 */
const mount = (phone: string | null) => {
  signIn({ permissions: ['view site settings', 'update site settings'] })
  allowBackgroundCalls()
  api('get', '/admin/cms/site-settings', { status: true, data: { site_name: 'FCH', phone_number: phone } })
  const view = renderPage(<SiteSettings />, { path: '/cms/site-settings' })
  return () => view.container.querySelector('input[name="phone_number"]') as HTMLInputElement
}

describe('SiteSettings - phone number', () => {
  it('shows the stored number as (XXX) XXX-XXXX with a US example', async () => {
    const phone = mount('5552345678')

    await waitFor(() => expect(phone()).toHaveValue('(555) 234-5678'))
    expect(phone()).toHaveAttribute('placeholder', '(555) 555-5555')
  })

  it('writes the number as (XXX) XXX-XXXX while it is typed', async () => {
    const user = userEvent.setup()
    const phone = mount(null)
    await waitFor(() => expect(phone()).toBeInTheDocument())

    await user.type(phone(), '5552345678')

    expect(screen.getByDisplayValue('(555) 234-5678')).toBe(phone())
  })
})
