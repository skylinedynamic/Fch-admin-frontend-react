import { afterEach, describe, expect, it, vi } from 'vitest'
import { http, HttpResponse } from 'msw'
import { QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { server } from '../../../mocks/server'
import { createTestQueryClient, render, screen, waitFor } from '../../../test-utils'
import FundApplication from '../../../../src/pages/applications/fundapplication/FundApplication'

vi.mock('../../../../src/utils/flatpickrPlugins', () => ({
  yearDropdownPlugin: () => () => ({}),
}))

afterEach(() => server.resetHandlers())

/**
 * Defect: opening /fund-application/18 loaded every step twice. The request
 * id comes from the URL as "18", then the loaded application sets it again as
 * the number 18; the step queries keyed on the raw id, so "18" and 18 were two
 * different queries - each step fetched again and showed its loading skeleton
 * a second time. Each step is fetched once now.
 */
describe('FundApplication - opening an application', () => {
  it('fetches each step once, though the request id turns from "18" into 18', async () => {
    const calls: Record<string, number> = {}
    const count = (step: string) => () => {
      calls[step] = (calls[step] ?? 0) + 1
      return HttpResponse.json({ status: true, message: '', data: null })
    }
    server.use(
      http.get('*/common/funding-application/funding-request', () =>
        HttpResponse.json({ status: true, message: '', data: { id: 21, funding_request_id: 18, status: 'Draft' } })
      ),
      http.get('*/common/funding-application/business-info', count('business-info')),
      http.get('*/common/funding-application/ownership-info', count('ownership-info')),
      http.get('*/common/funding-application/financial-info', count('financial-info')),
      http.get('*/common/funding-application/disclosures-and-consent', count('disclosures')),
      http.get('*/common/funding-application/federal-compliance-disclosures', count('federal')),
      http.get('*/common/funding-application/documents/*', () => HttpResponse.json({ status: true, message: '', data: [] })),
      http.get('*/common/funding-sequencings/grouped', () => HttpResponse.json({ status: true, message: '', data: [] })),
      http.get('*/common/doc-types', () => HttpResponse.json({ status: true, message: '', data: [] })),
    )

    render(
      <QueryClientProvider client={createTestQueryClient()}>
        <MemoryRouter initialEntries={['/fund-application/18']}>
          <Routes>
            <Route path="/fund-application/:id" element={<FundApplication />} />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>
    )

    await screen.findAllByText(/Business Information/, {}, { timeout: 10000 })
    await waitFor(() => expect(calls['business-info']).toBeGreaterThan(0), { timeout: 10000 })
    await new Promise((resolve) => setTimeout(resolve, 1500))

    for (const step of ['business-info', 'ownership-info', 'financial-info', 'disclosures', 'federal']) {
      expect(calls[step] ?? 0, step).toBeLessThanOrEqual(1)
    }
  }, 25000)
})
