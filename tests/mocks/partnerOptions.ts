import { http, HttpResponse } from 'msw'
import { waitFor } from '@testing-library/react'
import type { UserEvent } from '@testing-library/user-event'
import { server } from './server'

/**
 * The host's partner filter dropdowns, as their page tests see them: twelve
 * partners from /common/get-all-partners - more than the ten the paginated
 * /admin/partners/fetch-partners returns by default - so a dropdown that still
 * read the table's endpoint would miss the last two.
 */
export const PARTNER_OPTIONS = Array.from({ length: 12 }, (_, i) => {
  const n = String(i + 1).padStart(2, '0')
  return { id: i + 1, full_name: `Partner ${n}`, company_name: `Company ${n}` }
})

/** Every other request a page makes: an empty, successful list. */
const emptyList = http.all('*', () =>
  HttpResponse.json({ status: true, message: 'ok', data: [], meta: { total: 0 }, statistics: {} })
)

/**
 * Serves the options endpoint and a ten-per-page fetch-partners, recording
 * calls to each. Handlers a test adds afterwards take precedence over these.
 */
export function servePartnerOptions() {
  const calls = { options: 0, fetchPartnersBodies: [] as Record<string, unknown>[] }
  server.use(emptyList)
  server.use(
    http.post('*/common/get-all-partners', () => {
      calls.options++
      return HttpResponse.json({ status: true, message: 'ok', data: PARTNER_OPTIONS })
    }),
    http.post('*/admin/partners/fetch-partners', async ({ request }) => {
      calls.fetchPartnersBodies.push(((await request.json().catch(() => ({}))) ?? {}) as Record<string, unknown>)
      const page = PARTNER_OPTIONS.slice(0, 10)
      return HttpResponse.json({ status: true, message: 'ok', data: page, meta: { total: PARTNER_OPTIONS.length }, statistics: {} })
    })
  )
  return calls
}

/** Opens a PrimeReact dropdown and returns the labels it lists. */
export async function dropdownLabels(user: UserEvent, dropdown: HTMLElement): Promise<string[]> {
  await user.click(dropdown)
  return waitFor(() => {
    const items = Array.from(document.body.querySelectorAll('.p-dropdown-panel .p-dropdown-item'))
    if (items.length === 0) throw new Error('the dropdown lists nothing')
    return items.map((el) => el.textContent?.trim() ?? '')
  })
}

/** Opens a PrimeReact dropdown, types into its search field, and returns the labels left. */
export async function searchDropdown(user: UserEvent, dropdown: HTMLElement, text: string): Promise<string[]> {
  await user.click(dropdown)
  const search = await waitFor(() => {
    const input = document.body.querySelector('.p-dropdown-panel .p-dropdown-filter')
    if (!input) throw new Error('the dropdown has no search field')
    return input as HTMLInputElement
  })
  await user.type(search, text)
  return waitFor(() => {
    const labels = Array.from(document.body.querySelectorAll('.p-dropdown-panel .p-dropdown-item')).map((el) => el.textContent?.trim() ?? '')
    if (labels.length !== 1) throw new Error(`the search left ${labels.length} options`)
    return labels
  })
}

/** The PrimeReact dropdown currently showing this placeholder or label. */
export const dropdownShowing = (text: string) =>
  waitFor(() => {
    const label = Array.from(document.querySelectorAll('.p-dropdown-label')).find((el) => el.textContent?.trim() === text)
    if (!label) throw new Error(`no dropdown showing "${text}"`)
    return label.closest('.p-dropdown') as HTMLElement
  })
