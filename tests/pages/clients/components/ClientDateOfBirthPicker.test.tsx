import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { http, HttpResponse } from 'msw'
import userEvent from '@testing-library/user-event'
import { screen, waitFor } from '@testing-library/react'
import { renderWithProviders } from '../../../test-utils'
import { server } from '../../../mocks/server'
import ClientInfoSection from '../../../../src/pages/clients/components/ClientInfoSection'

vi.mock('react-toastify', () => ({ toast: Object.assign(vi.fn(), { success: vi.fn(), error: vi.fn(), info: vi.fn(), warn: vi.fn() }) }))
vi.mock('bootstrap/js/dist/modal', () => import('../../../mocks/fakeBootstrapModal'))
vi.mock('../../../../src/hooks/useSummernote', () => ({ useSummernote: () => ({ editorRef: () => {} }) }))

/**
 * BUG-005 (QA round 2): Clients › Add/Edit Client offered every past date of
 * birth, so a 17-year-old (01 Jan 2009) was saved. The picker now opens on, and
 * stops at, the latest allowed date - 18 years ago - and the API refuses
 * anything outside 18 to 120.
 */
const CLIENT = {
  id: 5, first_name: 'Ada', last_name: 'Lovelace', email: 'ada@example.test', phone_number: '(555) 234-5678',
  country: 'United States', business_country: 'United States', date_of_birth: null,
}

describe('Client date of birth picker', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(new Date(2026, 9, 21, 10, 0, 0))
    server.use(
      http.get('*/common/borrowers/5', () => HttpResponse.json({ status: true, data: CLIENT })),
      http.all('*', () => HttpResponse.json({ status: true, data: [] }))
    )
  })

  afterEach(() => {
    vi.useRealTimers()
    server.resetHandlers()
  })

  it('opens 18 years back and does not offer a later day', async () => {
    const user = userEvent.setup()
    renderWithProviders(<ClientInfoSection clientId="5" countries={[]} states={[]} cities={[]} />)

    await screen.findByText('Date of Birth')
    const input = await waitFor(() => {
      const el = document.querySelector('#date_of_birth input, input#date_of_birth')
      expect(el).not.toBeNull()
      return el as HTMLInputElement
    })
    await user.click(input)

    const panel = await waitFor(() => {
      const el = document.querySelector('.p-datepicker')
      expect(el).not.toBeNull()
      return el as HTMLElement
    })

    // October 2008: the 21st (the 18th birthday) can be picked, the 22nd cannot.
    expect(panel.querySelector('.fp-yd-trigger[data-kind="year"]')).toHaveTextContent('2008')
    const day = (n: number) =>
      Array.from(panel.querySelectorAll('td:not(.p-datepicker-other-month) span')).find((s) => s.textContent === String(n))
    expect(day(21)).not.toHaveClass('p-disabled')
    expect(day(22)).toHaveClass('p-disabled')
  })
})
