import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { screen, waitFor, within } from '../../test-utils'
import { server } from '../../mocks/server'
import { allowBackgroundCalls, api, renderPage, signIn } from '../pageHarness'

vi.mock('react-toastify', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-toastify')>()
  return { ...actual, toast: Object.assign(vi.fn(), { info: vi.fn(), success: vi.fn(), error: vi.fn(), warn: vi.fn() }) }
})

import Resource from '../../../src/pages/resources/Resource'

/**
 * R3-BUG-003: resource files are private, so file_url is a signed link
 * (…/ein.pdf?expires=…&signature=…). The preview framed that link and the API
 * refused to be framed by the portal (frame-ancestors 'self'), leaving a blank
 * window. The preview now reads the file through the API and shows a local
 * blob: link. Host and partners share this page.
 */
const SIGNED = 'https://api.test/private-files/resources/ein.pdf?expires=1&signature=abc'
const GROUPED = {
  legal_registration: [{ id: 102, title: 'EIN Checklist', subtitle: 'IRS form SS-4', icon: 'ri-list-check', status: true, is_partner: true, file_url: SIGNED }],
  business_services: [],
  download_assets: [],
  education_help: [],
  training_academy: [],
}

const pdf = () => new HttpResponse('%PDF-1.4', { headers: { 'Content-Type': 'application/pdf' } })

const mount = (user: Record<string, unknown>, file: () => Response = pdf) => {
  signIn({ permissions: ['view resources'], ...user })
  allowBackgroundCalls()
  api('get', '/common/resources', { status: true, data: GROUPED })
  const downloads: string[] = []
  server.use(http.get('*/common/resources/download/:id', ({ params }) => { downloads.push(String(params.id)); return file() }))
  renderPage(<Resource />, { path: '/resources' })
  return downloads
}

const openPreview = async () => {
  await userEvent.click(await screen.findByText('EIN Checklist'))
  return screen.findByRole('dialog')
}

beforeEach(() => {
  Object.defineProperty(URL, 'createObjectURL', { configurable: true, writable: true, value: vi.fn(() => 'blob:preview-102') })
  Object.defineProperty(URL, 'revokeObjectURL', { configurable: true, writable: true, value: vi.fn() })
})
afterEach(() => vi.restoreAllMocks())

describe('Resource preview', () => {
  it.each([
    ['the host', { is_host: 1 }],
    ['a partner', { is_host: 0, partner_id: 5 }],
  ])('shows %s a PDF behind a signed link, read through the API', async (_who, user) => {
    const downloads = mount(user)
    const dialog = await openPreview()

    const frame = await within(dialog).findByTitle('EIN Checklist')
    expect(frame.tagName).toBe('IFRAME')
    expect(frame.getAttribute('src')).toMatch(/^blob:preview-102/)
    expect(frame.getAttribute('src')).not.toContain('signature')
    expect(downloads).toContain('102')
  })

  it('says so when the file cannot be read', async () => {
    mount({ is_host: 1 }, () => HttpResponse.json({ status: false, message: 'File not found on server' }, { status: 400 }))
    const dialog = await openPreview()

    expect(await within(dialog).findByText('The preview could not be loaded.')).toBeInTheDocument()
    expect(within(dialog).queryByTitle('EIN Checklist')).not.toBeInTheDocument()
  })

  it('downloads under the title with the real extension, not the signed link\'s query', async () => {
    const names: string[] = []
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (this: HTMLAnchorElement) {
      if (this.download) names.push(this.download)
    })
    mount({ is_host: 1 })
    const dialog = await openPreview()

    await userEvent.click(within(dialog).getByRole('button', { name: /download/i }))

    await waitFor(() => expect(names).toEqual(['EIN Checklist.pdf']))
  })
})
