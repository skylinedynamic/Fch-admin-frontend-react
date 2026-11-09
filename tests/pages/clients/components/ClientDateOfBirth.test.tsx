import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { http, HttpResponse } from 'msw'
import { act, fireEvent, screen, waitFor } from '@testing-library/react'
import { renderWithProviders } from '../../../test-utils'
import { server } from '../../../mocks/server'
import ClientInfoSection from '../../../../src/pages/clients/components/ClientInfoSection'

vi.mock('react-toastify', () => ({ toast: Object.assign(vi.fn(), { success: vi.fn(), error: vi.fn(), info: vi.fn(), warn: vi.fn() }) }))
vi.mock('bootstrap/js/dist/modal', () => import('../../../mocks/fakeBootstrapModal'))
vi.mock('../../../../src/hooks/useSummernote', () => ({ useSummernote: () => ({ editorRef: () => {} }) }))

/**
 * Add Client / Client -> Profile Date of Birth: every year up to today can be
 * picked; an empty field opens 18 years back (the platform minimum age, as the
 * API checks it); a saved date opens on that date; and an under-18 pick shows
 * the API's message under the field straight away.
 */
const MESSAGE = 'You must be at least 18 years old to continue.'

const trigger = (kind: 'month' | 'year') =>
  document.querySelector<HTMLButtonElement>(`.p-datepicker .fp-yd-trigger[data-kind="${kind}"]`)!

const openDateOfBirth = async () => {
  act(() => {
    fireEvent.focus(document.querySelector<HTMLInputElement>('#date_of_birth input')!)
  })
  for (let i = 0; i < 3; i++) await act(() => new Promise(r => setTimeout(r, 100)))
}

const pick = async (year: string, day: string) => {
  fireEvent.click(trigger('year'))
  fireEvent.click(document.querySelector(`.fp-yd-list[data-kind="year"] .fp-yd-opt[data-value="${year}"]`)!)
  const cell = Array.from(document.querySelectorAll<HTMLElement>('.p-datepicker td:not(.p-datepicker-other-month) > span'))
    .find(s => s.textContent === day)!
  await act(async () => {
    fireEvent.click(cell)
  })
}

const addClient = () => {
  server.use(http.all('*', () => HttpResponse.json({ status: true, data: [] })))
  renderWithProviders(<ClientInfoSection countries={[]} states={[]} cities={[]} errors={{}} setErrors={() => {}} />)
}

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] })
  vi.setSystemTime(new Date(2026, 10, 9, 10, 0))
})
afterEach(() => {
  vi.useRealTimers()
  server.resetHandlers()
})

describe('client Date of Birth calendar', () => {
  it('Add Client: opens on November 2008 and still offers every year up to 2026', async () => {
    addClient()

    await openDateOfBirth()

    expect(trigger('month').textContent).toBe('November')
    expect(trigger('year').textContent).toBe('2008')
    const years = Array.from(document.querySelectorAll('.fp-yd-list[data-kind="year"] .fp-yd-opt')).map(o => o.textContent)
    expect(years[years.length - 1]).toBe('2026')
  })

  it('Add Client: picking a date in 2026 shows the minimum-age message', async () => {
    addClient()
    await openDateOfBirth()

    await pick('2026', '1')

    expect(await screen.findByText(MESSAGE)).toBeInTheDocument()
    // The field itself is marked too (red border), not just the message.
    expect(document.querySelector('#date_of_birth')).toHaveClass('is-invalid')
  })

  it('Add Client: picking someone turning 18 today shows no message', async () => {
    addClient()
    await openDateOfBirth()

    await pick('2008', '9')

    await waitFor(() => expect(document.querySelector<HTMLInputElement>('#date_of_birth input')!.value).toBe('09 Nov, 2008'))
    expect(screen.queryByText(MESSAGE)).not.toBeInTheDocument()
    expect(document.querySelector('#date_of_birth')).not.toHaveClass('is-invalid')
  })

  it('Client -> Profile: opens on the saved date of birth', async () => {
    server.use(
      http.get('*/common/borrowers/5', () => HttpResponse.json({
        status: true,
        data: { id: 5, first_name: 'Ada', last_name: 'Lovelace', email: 'ada@example.test', country: 'United States', business_country: 'United States', date_of_birth: '1990-05-12' },
      })),
      http.all('*', () => HttpResponse.json({ status: true, data: [] }))
    )
    renderWithProviders(<ClientInfoSection clientId="5" countries={[]} states={[]} cities={[]} />)
    await waitFor(() => expect(document.querySelector('#date_of_birth input')).toHaveValue('12 May, 1990'))

    await openDateOfBirth()

    expect(trigger('month').textContent).toBe('May')
    expect(trigger('year').textContent).toBe('1990')
  })

  it('Add Client in March 2027 opens on March 2009', async () => {
    vi.setSystemTime(new Date(2027, 2, 15, 10, 0))
    addClient()

    await openDateOfBirth()

    expect(trigger('month').textContent).toBe('March')
    expect(trigger('year').textContent).toBe('2009')
  })
})
