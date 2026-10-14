import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { http, HttpResponse } from 'msw'
import { server } from '../../mocks/server'
import {
  clearLocationCache,
  countries,
  loadLocations,
  locationData,
  locationsLoaded,
} from '../../../src/modules/location'

const USA = {
  name: 'United States', code: 'USA', currency: 'USD', phone_code: '+1', flag: 'us',
  states: [
    { name: 'Texas', code: 'TX', cities: ['Austin', 'Dallas'] },
    { name: 'Unknown', code: '', cities: [] },
  ],
}
const CAN = { name: 'Canada', code: 'CAN', currency: 'CAD', phone_code: '+1', flag: 'ca', states: [{ name: 'Ontario', code: 'ON', cities: ['Toronto'] }] }

const serve = (list: unknown[], counter?: { hits: number }) =>
  server.use(
    http.get('*/common/locations', () => {
      if (counter) counter.hits += 1
      return HttpResponse.json({ status: true, message: 'ok', data: list })
    })
  )

beforeEach(() => clearLocationCache())
afterEach(() => {
  server.resetHandlers()
  clearLocationCache()
})

describe('loadLocations', () => {
  it('fills the list in the API order', async () => {
    serve([USA, CAN])

    const result = await loadLocations()

    expect(result).toBe(countries)
    expect(countries.map((c) => c.code)).toEqual(['USA', 'CAN'])
  })

  it('derives the keyed tree from the same response', async () => {
    serve([USA, CAN])

    await loadLocations()

    expect(Object.keys(locationData)).toEqual(['USA', 'CAN'])
    expect(locationData.USA.states.TX.cities).toEqual(['Austin', 'Dallas'])
    expect(locationData.CAN.states.ON.name).toBe('Ontario')
    expect(locationData.USA.currency).toBe('USD')
  })

  it('keys a state without a code by its name', async () => {
    serve([USA])

    await loadLocations()

    expect(locationData.USA.states.Unknown).toMatchObject({ name: 'Unknown', cities: [] })
  })

  it('keys a country without a code by its name', async () => {
    serve([{ ...CAN, code: '' }])

    await loadLocations()

    expect(Object.keys(locationData)).toEqual(['Canada'])
  })

  it('tolerates a country with no states', async () => {
    serve([{ ...CAN, states: undefined }])

    await loadLocations()

    expect(locationData.CAN.states).toEqual({})
  })

  it('treats a response without data as an empty list', async () => {
    server.use(http.get('*/common/locations', () => HttpResponse.json({ status: true, message: 'ok' })))

    await loadLocations()

    expect(countries).toEqual([])
    expect(locationsLoaded()).toBe(false)
  })

  it('shares one request between concurrent and repeated callers', async () => {
    const counter = { hits: 0 }
    serve([USA], counter)

    await Promise.all([loadLocations(), loadLocations()])
    await loadLocations()

    expect(counter.hits).toBe(1)
  })

  it('does not cache a failure, so the next caller retries', async () => {
    server.use(http.get('*/common/locations', () => HttpResponse.json({ message: 'down' }, { status: 500 })))
    await expect(loadLocations()).rejects.toBeTruthy()
    expect(locationsLoaded()).toBe(false)

    serve([USA])
    await loadLocations()

    expect(countries.map((c) => c.code)).toEqual(['USA'])
  })

  it('replaces previous data in place instead of appending', async () => {
    serve([USA, CAN])
    await loadLocations()
    const listRef = countries
    const treeRef = locationData

    clearLocationCache()
    serve([CAN])
    await loadLocations()

    // Same objects (call sites hold references), new contents.
    expect(countries).toBe(listRef)
    expect(locationData).toBe(treeRef)
    expect(countries.map((c) => c.code)).toEqual(['CAN'])
    expect(Object.keys(locationData)).toEqual(['CAN'])
  })
})

describe('locationsLoaded / clearLocationCache', () => {
  it('reports false before loading and true after', async () => {
    expect(locationsLoaded()).toBe(false)
    serve([USA])
    await loadLocations()
    expect(locationsLoaded()).toBe(true)
  })

  it('clearing empties both shapes and forces a new request', async () => {
    const counter = { hits: 0 }
    serve([USA], counter)
    await loadLocations()

    clearLocationCache()

    expect(countries).toEqual([])
    expect(locationData).toEqual({})
    await loadLocations()
    expect(counter.hits).toBe(2)
  })
})
