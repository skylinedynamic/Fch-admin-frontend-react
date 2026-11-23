import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { Route, Routes } from 'react-router-dom'
import { renderWithProviders, screen, waitFor } from '../../test-utils'
import { allowBackgroundCalls, api } from '../pageHarness'
import { server } from '../../mocks/server'
import { clearLocationCache, loadLocations } from '../../../src/modules/location'

vi.mock('react-toastify', () => ({ toast: { success: vi.fn(), error: vi.fn() } }))
// A rich-text editor; it needs a real canvas, which jsdom has not.
vi.mock('../../../src/hooks/useSummernote', () => ({ useSummernote: () => ({ editorRef: () => {} }) }))

import LenderForm from '../../../src/pages/lenders/LenderForm'

/**
 * Add/Edit Lender (2026-11-11): Country, State, City and Address - all
 * optional. State lists the picked country's states, City the picked state's
 * cities; a new country clears both. Saved by name.
 */
const LOCATIONS = [
  { name: 'United States', code: 'USA', currency: 'USD', phone_code: '+1', flag: 'us', states: [
    { name: 'Texas', code: 'TX', cities: ['Austin', 'Dallas'] },
    { name: 'Ohio', code: 'OH', cities: ['Columbus'] },
  ] },
  { name: 'Canada', code: 'CAN', currency: 'CAD', phone_code: '+1', flag: 'ca', states: [{ name: 'Ontario', code: 'ON', cities: ['Toronto'] }] },
]
const KABBAGE = {
  id: 7, lender_code: 'LND-48217', name: 'Kabbage', legal_name: 'Kabbage Inc.', product_categories: [], contact_name: 'Lee',
  contact_title: 'Partnerships', contact_email: 'lee@kabbage.example.org', contact_phone: '(555) 234-0100', status: 'Active',
}

beforeEach(async () => {
  clearLocationCache()
  server.use(http.get('*/common/locations', () => HttpResponse.json({ status: true, message: 'ok', data: LOCATIONS })))
  await loadLocations()
})
afterEach(() => clearLocationCache())

const mount = (route: string) => {
  const user = userEvent.setup()
  renderWithProviders(
    <Routes>
      <Route path="/lenders/create" element={<LenderForm />} />
      <Route path="/lenders/:id" element={<LenderForm />} />
      <Route path="/lenders" element={<p>Lenders list</p>} />
    </Routes>,
    { route }
  )
  return user
}

/** The PrimeReact dropdown of a field, by its id. */
const dropdown = (id: string) => document.getElementById(id)?.closest('.p-dropdown') as HTMLElement

// Each select opens its list inside itself (appendTo="self"), so read only that one -
// another select's list can still be closing.
const itemsOf = (id: string) => Array.from(dropdown(id).querySelectorAll('.p-dropdown-panel .p-dropdown-item'))

const optionsOf = async (user: ReturnType<typeof userEvent.setup>, id: string) => {
  await user.click(dropdown(id))
  return waitFor(() => {
    const items = itemsOf(id).map((el) => el.textContent?.trim())
    if (items.length === 0) throw new Error(`no ${id} options`)
    return items
  })
}

const pick = async (user: ReturnType<typeof userEvent.setup>, id: string, option: string) => {
  await user.click(dropdown(id))
  const item = await waitFor(() => {
    const found = itemsOf(id).find((el) => el.textContent?.trim() === option)
    if (!found) throw new Error(`no "${option}" in ${id}`)
    return found as HTMLElement
  })
  await user.click(item)
}

const shown = (id: string) => dropdown(id).querySelector('.p-dropdown-label')?.textContent?.trim()

describe('Lender form › location', () => {
  it('offers the states of the picked country and the cities of the picked state, and saves them with the address', async () => {
    allowBackgroundCalls()
    api('get', '/admin/lenders/7', { status: true, data: KABBAGE })
    api('post', '/admin/lenders/check-duplicates', { status: true, data: { name: [], legal_name: [] } })
    const update = api('put', '/admin/lenders/7', { status: true, data: KABBAGE })
    const user = mount('/lenders/7')
    await screen.findByDisplayValue('Kabbage Inc.')

    expect(await optionsOf(user, 'lender_country')).toEqual(['United States', 'Canada'])
    await user.keyboard('{Escape}')
    await pick(user, 'lender_country', 'United States')

    expect(await optionsOf(user, 'lender_state')).toEqual(['Texas', 'Ohio'])
    await user.keyboard('{Escape}')
    await pick(user, 'lender_state', 'Texas')

    expect(await optionsOf(user, 'lender_city')).toEqual(['Austin', 'Dallas', 'Others'])
    await user.keyboard('{Escape}')
    await pick(user, 'lender_city', 'Austin')

    await user.type(screen.getByLabelText('Address'), '500 Congress Ave')
    await user.click(screen.getByRole('button', { name: /update/i }))

    await waitFor(() => expect(update.bodies).toHaveLength(1))
    expect(update.bodies[0]).toMatchObject({ country: 'United States', state: 'Texas', city: 'Austin', address: '500 Congress Ave' })
  })

  it('clears State and City when another country is picked', async () => {
    allowBackgroundCalls()
    api('get', '/admin/lenders/7', { status: true, data: { ...KABBAGE, country: 'United States', state: 'Texas', city: 'Austin' } })
    const user = mount('/lenders/7')
    await screen.findByDisplayValue('Kabbage Inc.')
    await waitFor(() => expect(shown('lender_city')).toBe('Austin'))

    await pick(user, 'lender_country', 'Canada')

    expect(shown('lender_state')).toBe('Select state')
    // City waits for a state, and says so.
    expect(shown('lender_city')).toBe('Select a state first')
    expect(await optionsOf(user, 'lender_state')).toEqual(['Ontario'])
  })

  it('clears City when another state is picked', async () => {
    allowBackgroundCalls()
    api('get', '/admin/lenders/7', { status: true, data: { ...KABBAGE, country: 'United States', state: 'Texas', city: 'Austin' } })
    const user = mount('/lenders/7')
    await screen.findByDisplayValue('Kabbage Inc.')
    await waitFor(() => expect(shown('lender_city')).toBe('Austin'))

    await pick(user, 'lender_state', 'Ohio')

    expect(shown('lender_city')).toBe('Select city')
    expect(await optionsOf(user, 'lender_city')).toEqual(['Columbus', 'Others'])
  })

  it("shows a lender's saved location when editing", async () => {
    allowBackgroundCalls()
    api('get', '/admin/lenders/7', { status: true, data: { ...KABBAGE, country: 'Canada', state: 'Ontario', city: 'Toronto', address: '1 King St W' } })
    mount('/lenders/7')

    await screen.findByDisplayValue('1 King St W')
    expect(shown('lender_country')).toBe('Canada')
    expect(shown('lender_state')).toBe('Ontario')
    expect(shown('lender_city')).toBe('Toronto')
  })

  it('is all optional: a lender saves with no location, sent as empty', async () => {
    allowBackgroundCalls()
    api('get', '/admin/lenders/7', { status: true, data: KABBAGE })
    const update = api('put', '/admin/lenders/7', { status: true, data: KABBAGE })
    const user = mount('/lenders/7')
    await screen.findByDisplayValue('Kabbage Inc.')

    expect(screen.getByText('Country').querySelector('.text-danger')).toBeNull()
    expect(screen.getByText('Address').querySelector('.text-danger')).toBeNull()
    await user.click(screen.getByRole('button', { name: /update/i }))

    expect(await screen.findByText('Lenders list')).toBeInTheDocument()
    expect(update.bodies[0]).toMatchObject({ country: null, state: null, city: null, address: null })
  })

  it('clears Country - and with it State and City - with its clear button', async () => {
    allowBackgroundCalls()
    api('get', '/admin/lenders/7', { status: true, data: { ...KABBAGE, country: 'United States', state: 'Texas', city: 'Austin' } })
    const user = mount('/lenders/7')
    await screen.findByDisplayValue('Kabbage Inc.')
    await waitFor(() => expect(shown('lender_city')).toBe('Austin'))

    await user.click(dropdown('lender_country').querySelector('.p-dropdown-clear-icon') as HTMLElement)

    expect(shown('lender_country')).toBe('Select country')
    expect(shown('lender_state')).toBe('Select a country first')
    expect(shown('lender_city')).toBe('Select a state first')
  })

  it("shows the API's refusal under a location field until it is changed", async () => {
    allowBackgroundCalls()
    api('get', '/admin/lenders/7', { status: true, data: { ...KABBAGE, country: 'United States', state: 'Texas', city: 'Austin' } })
    api('put', '/admin/lenders/7', { status: false, message: 'Invalid', errors: {
      city: 'The city may not be greater than 255 characters.',
      address: 'The address may not be greater than 500 characters.',
      product_categories: 'Pick at least one product category.',
    } }, 422)
    const user = mount('/lenders/7')
    await screen.findByDisplayValue('Kabbage Inc.')
    await waitFor(() => expect(shown('lender_city')).toBe('Austin'))

    await user.click(screen.getByRole('button', { name: /update/i }))

    expect(await screen.findByText('The city may not be greater than 255 characters.')).toBeInTheDocument()
    expect(screen.getByText('The address may not be greater than 500 characters.')).toBeInTheDocument()
    expect(dropdown('lender_city')).toHaveClass('p-invalid')
    expect(screen.getByLabelText('Address')).toHaveClass('is-invalid')
    expect(document.querySelector('.lender-categories-field .p-multiselect')).toHaveClass('p-invalid')

    await pick(user, 'lender_city', 'Dallas')
    expect(screen.queryByText('The city may not be greater than 255 characters.')).not.toBeInTheDocument()
    expect(dropdown('lender_city')).not.toHaveClass('p-invalid')
  })

  // Found 2026-11-11: a disabled select drew half grey with a broken border.
  // State and City look like Country; until there is something to pick they
  // say what to pick first - in the box and in the opened list.
  it('offers no state or city until a country is picked, says to pick one first, and looks like Country', async () => {
    allowBackgroundCalls()
    const user = mount('/lenders/create')
    await screen.findByPlaceholderText('Enter lender name')

    expect(dropdown('lender_state')).not.toHaveClass('p-disabled')
    expect(dropdown('lender_city')).not.toHaveClass('p-disabled')
    expect(shown('lender_state')).toBe('Select a country first')
    expect(shown('lender_city')).toBe('Select a state first')

    await user.click(dropdown('lender_state'))
    await waitFor(() => expect(dropdown('lender_state').querySelector('.p-dropdown-empty-message')).toHaveTextContent('Select a country first'))
    expect(itemsOf('lender_state')).toHaveLength(0)
  })
  /**
   * 2026-11-23: City > Others, as on a client's profile - a city the list does
   * not have is typed in "Other City" (required) and saved as the city; a
   * lender whose city is not in the list opens with Others and the name typed.
   */
  it('offers Others after the cities, and saves the city typed in Other City', async () => {
    allowBackgroundCalls()
    api('get', '/admin/lenders/7', { status: true, data: { ...KABBAGE, country: 'United States', state: 'Texas', city: 'Austin' } })
    const update = api('put', '/admin/lenders/7', { status: true, data: KABBAGE })
    const user = mount('/lenders/7')
    await screen.findByDisplayValue('Kabbage Inc.')
    await waitFor(() => expect(shown('lender_city')).toBe('Austin'))
    expect(screen.queryByLabelText(/Other City/)).not.toBeInTheDocument()

    await pick(user, 'lender_city', 'Others')
    const other = screen.getByLabelText(/Other City/)
    expect(other).toHaveAttribute('placeholder', 'Enter city name')
    await user.type(other, 'Round Top Village')
    await user.click(screen.getByRole('button', { name: /update/i }))

    expect(await screen.findByText('Lenders list')).toBeInTheDocument()
    // The API checks the name and saves it as the city (as for a client).
    expect(update.bodies[0]).toMatchObject({ country: 'United States', state: 'Texas', city: 'Others', other_city: 'Round Top Village' })
  })

  it("shows the API's refusal under Other City when Others has no name", async () => {
    allowBackgroundCalls()
    api('get', '/admin/lenders/7', { status: true, data: { ...KABBAGE, country: 'United States', state: 'Texas', city: 'Austin' } })
    const update = api('put', '/admin/lenders/7', { status: false, message: 'Invalid', errors: { other_city: ['Other City is required.'] } }, 422)
    const user = mount('/lenders/7')
    await screen.findByDisplayValue('Kabbage Inc.')
    await waitFor(() => expect(shown('lender_city')).toBe('Austin'))

    await pick(user, 'lender_city', 'Others')
    await user.click(screen.getByRole('button', { name: /update/i }))

    expect(await screen.findByText('Other City is required.')).toBeInTheDocument()
    expect(screen.getByLabelText(/Other City/)).toHaveClass('is-invalid')
    expect(update.bodies[0]).toMatchObject({ city: 'Others', other_city: null })

    // Typing the name clears the message.
    await user.type(screen.getByLabelText(/Other City/), 'Shiner')
    expect(screen.queryByText('Other City is required.')).not.toBeInTheDocument()
  })

  it('sends no Other City for a city from the list', async () => {
    allowBackgroundCalls()
    api('get', '/admin/lenders/7', { status: true, data: { ...KABBAGE, country: 'United States', state: 'Texas', city: 'Austin' } })
    const update = api('put', '/admin/lenders/7', { status: true, data: KABBAGE })
    const user = mount('/lenders/7')
    await screen.findByDisplayValue('Kabbage Inc.')
    await waitFor(() => expect(shown('lender_city')).toBe('Austin'))

    await user.click(screen.getByRole('button', { name: /update/i }))

    expect(await screen.findByText('Lenders list')).toBeInTheDocument()
    expect(update.bodies[0]).toMatchObject({ city: 'Austin' })
    expect(update.bodies[0]).not.toHaveProperty('other_city')
  })

  it('opens a lender whose city is not in the list with Others and the name typed', async () => {
    allowBackgroundCalls()
    api('get', '/admin/lenders/7', { status: true, data: { ...KABBAGE, country: 'United States', state: 'Texas', city: 'Round Top Village' } })
    mount('/lenders/7')
    await screen.findByDisplayValue('Kabbage Inc.')

    await waitFor(() => expect(shown('lender_city')).toBe('Others'))
    expect(screen.getByLabelText(/Other City/)).toHaveValue('Round Top Village')
  })
})
