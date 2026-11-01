import { beforeEach, describe, expect, it, vi } from 'vitest'
import userEvent from '@testing-library/user-event'
import { screen, waitFor } from '../../test-utils'
import { allowBackgroundCalls, api, renderPage, signIn } from '../pageHarness'

vi.mock('react-toastify', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-toastify')>()
  return { ...actual, toast: Object.assign(vi.fn(), { info: vi.fn(), success: vi.fn(), error: vi.fn(), warn: vi.fn() }) }
})
vi.mock('bootstrap/js/dist/modal', () => import('../../mocks/fakeBootstrapModal'))

import SeoSettings from '../../../src/pages/cms/SeoSettings'

/**
 * Defect (BUG-124): the Page Name / Path / Meta Title column filters showed as
 * active but were never sent, so the list did not change; Clear left them set.
 * Each column filter is now sent to the API (filters[field] = {value, match_mode})
 * and Clear resets them along with the search box.
 */
const ROWS = [
  { id: 1, page_name: 'FAQ', path: '/faq', meta_title: 'Frequently Asked Questions' },
  { id: 2, page_name: 'Home', path: '/', meta_title: 'Welcome' },
]

beforeEach(() => {
  vi.clearAllMocks()
  signIn({ permissions: ['view seo settings', 'update seo settings', 'delete seo settings'] })
  allowBackgroundCalls()
})

const filterButton = (container: HTMLElement, column: number) =>
  container.querySelectorAll('.p-column-filter-menu-button')[column] as HTMLElement

const applyColumnFilter = async (user: ReturnType<typeof userEvent.setup>, container: HTMLElement, column: number, placeholder: string, value: string) => {
  await user.click(filterButton(container, column))
  await user.type(await screen.findByPlaceholderText(placeholder), value)
  const apply = Array.from(document.body.querySelectorAll('.p-column-filter-overlay button')).find((b) => b.textContent === 'Apply') as HTMLElement
  await user.click(apply)
}

describe('SEO Settings - column filters', () => {
  it.each([
    [0, 'Search page', 'FAQ', 'page_name'],
    [1, 'Search path', '/f', 'path'],
    [2, 'Search title', 'Partner', 'meta_title'],
  ])('sends the %s column filter ("Starts with %s") to the API', async (column, placeholder, value, field) => {
    const list = api('post', '/admin/cms/seo-settings', { status: true, data: ROWS, meta: { total: 2, last_page: 1 } })
    const user = userEvent.setup()
    const { container } = renderPage(<SeoSettings />, { path: '/cms/seo-settings' })
    await screen.findByText('Frequently Asked Questions')

    await applyColumnFilter(user, container, column as number, placeholder as string, value as string)

    await waitFor(() => expect(list.bodies.slice(-1)[0]).toMatchObject({ page: 1, filters: { [field as string]: { value, match_mode: 'startsWith' } } }))
  })

  it('Clear resets the column filters and the search box', async () => {
    const list = api('post', '/admin/cms/seo-settings', { status: true, data: ROWS, meta: { total: 2, last_page: 1 } })
    const user = userEvent.setup()
    const { container } = renderPage(<SeoSettings />, { path: '/cms/seo-settings' })
    await screen.findByText('Frequently Asked Questions')
    await applyColumnFilter(user, container, 0, 'Search page', 'FAQ')
    await waitFor(() => expect(list.bodies.slice(-1)[0]?.filters?.page_name?.value).toBe('FAQ'))

    await user.click(screen.getByText('Clear', { selector: '.btn' }))

    await waitFor(() => expect(list.bodies.slice(-1)[0]?.filters ?? {}).toEqual({}))
    expect(filterButton(container, 0)).not.toHaveClass('p-column-filter-menu-button-active')
  })
})
