import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { http, HttpResponse } from 'msw'
import { server } from '../../mocks/server'
import { clearLocationCache, loadLocations } from '../../../src/modules/location'
import { cityOptions, countryOptions, stateOptions } from '../../../src/modules/location/options'

/**
 * Country / State / City pickers that store names (as the Lender form does):
 * each list follows the one picked before it.
 */
const USA = {
  name: 'United States', code: 'USA', currency: 'USD', phone_code: '+1', flag: 'us',
  states: [
    { name: 'Texas', code: 'TX', cities: ['Austin', 'Dallas'] },
    { name: 'Ohio', code: 'OH', cities: ['Columbus'] },
  ],
}
const CAN = { name: 'Canada', code: 'CAN', currency: 'CAD', phone_code: '+1', flag: 'ca', states: [{ name: 'Ontario', code: 'ON', cities: ['Toronto'] }] }

beforeEach(async () => {
  clearLocationCache()
  server.use(http.get('*/common/locations', () => HttpResponse.json({ status: true, message: 'ok', data: [USA, CAN] })))
  await loadLocations()
})
afterEach(() => {
  server.resetHandlers()
  clearLocationCache()
})

const labels = (options: { label: string; value: string }[]) => options.map((o) => o.value)

describe('location options by name', () => {
  it('lists the countries by name, label and value alike', () => {
    expect(countryOptions()).toEqual([
      { label: 'United States', value: 'United States' },
      { label: 'Canada', value: 'Canada' },
    ])
  })

  it("lists a country's states", () => {
    expect(labels(stateOptions('United States'))).toEqual(['Texas', 'Ohio'])
    expect(labels(stateOptions('Canada'))).toEqual(['Ontario'])
  })

  it("lists a state's cities", () => {
    expect(labels(cityOptions('United States', 'Texas'))).toEqual(['Austin', 'Dallas'])
  })

  it('lists nothing before a country or state is picked, or for one it does not know', () => {
    expect(stateOptions(null)).toEqual([])
    expect(stateOptions('Atlantis')).toEqual([])
    expect(cityOptions('United States', null)).toEqual([])
    expect(cityOptions('United States', 'Ontario')).toEqual([])
    expect(cityOptions(undefined, 'Texas')).toEqual([])
  })
})
