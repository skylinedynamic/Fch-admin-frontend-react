import { afterEach, describe, expect, it, vi } from 'vitest'
import userEvent from '@testing-library/user-event'
import { screen, within } from '../../test-utils'
import { allowBackgroundCalls, api, renderPage, signIn } from '../pageHarness'

vi.mock('react-toastify', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-toastify')>()
  return { ...actual, toast: Object.assign(vi.fn(), { info: vi.fn(), success: vi.fn(), error: vi.fn(), warn: vi.fn() }) }
})
vi.mock('bootstrap/js/dist/modal', () => import('../../mocks/fakeBootstrapModal'))
vi.mock('../../../src/hooks/useSummernote', () => ({ useSummernote: () => ({ editorRef: () => {} }) }))

import ClientDetails from '../../../src/pages/clients/ClientDetails'

/**
 * Client details' tabs are on one line like the partner profile's
 * (OverflowTabs): the ones that do not fit go into More.
 */
const client = { status: true, message: 'ok', data: { id: 136, user_id: 55, first_name: 'Bo', last_name: 'Rower', email: 'bo@example.test', has_sign: true } }

const TABS = ['Client Info', 'Business Financials', 'Documents', 'Task List', 'Credit Profile', 'Capital Access', 'Funding Sequence', 'Funding Requests', 'Funding Applications', 'Agreement']

/** jsdom has no layout: the line is `line` px, every tab 150px, More 80px. */
const layout = (line: number) => {
  vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(function (this: HTMLElement) {
    const width = this.classList.contains('overflow-tabs') ? line : this.dataset.tabKey ? 150 : this.dataset.more !== undefined ? 80 : 0
    return { width, height: 0, top: 0, left: 0, right: width, bottom: 0, x: 0, y: 0, toJSON: () => ({}) } as DOMRect
  })
}

const open = () => {
  signIn({ is_host: 1, permissions: ['view clients', 'update clients'] })
  allowBackgroundCalls()
  api('get', '/common/borrowers/136', client)
  renderPage(<ClientDetails />, { path: '/clients/:id', route: '/clients/136' })
}

const tablist = async () => within(await screen.findByRole('tablist', { name: 'Client sections' }))

afterEach(() => vi.restoreAllMocks())

describe('ClientDetails - tabs on one line', () => {
  it('shows every tab when the line is wide enough, with no More', async () => {
    layout(5000)
    open()

    const tabs = await tablist()
    await tabs.findByRole('tab', { name: 'Agreement' })
    expect(tabs.getAllByRole('tab').map((t) => t.textContent?.trim())).toEqual(TABS)
    expect(screen.queryByRole('button', { name: /^More/ })).not.toBeInTheDocument()
  })

  it('puts the tabs that do not fit into More, and opens one from there', async () => {
    layout(700)
    open()
    const tabs = await tablist()
    await screen.findByRole('button', { name: /^More/ })

    // 700 - 80 for More: four 150px tabs fit.
    expect(tabs.getAllByRole('tab')).toHaveLength(4)
    await userEvent.click(screen.getByRole('button', { name: /^More/ }))
    await userEvent.click(within(screen.getByRole('menu')).getByRole('menuitem', { name: 'Funding Applications' }))

    expect(tabs.getByRole('tab', { name: 'Funding Applications' })).toHaveAttribute('aria-selected', 'true')
  })

  it('keeps the tabs that need a saved client disabled while one is being created', async () => {
    layout(5000)
    signIn({ is_host: 1, permissions: ['view clients', 'create clients'] })
    allowBackgroundCalls()
    renderPage(<ClientDetails />, { path: '/clients/create', route: '/clients/create' })

    const tabs = await tablist()
    expect(tabs.getByRole('tab', { name: 'Client Info' })).toBeEnabled()
    expect(tabs.getByRole('tab', { name: 'Documents' })).toBeDisabled()
    expect(tabs.getByRole('tab', { name: 'Funding Applications' })).toBeDisabled()
  })
})
