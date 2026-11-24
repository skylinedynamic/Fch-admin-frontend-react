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

  // R3-BUG-053: the edit page (opened by application id) asked for the
  // funding request three times - by id, once with no id at all (404 "Funding
  // request information not found"), and by id again. The Documents step read
  // it by the id the first answer brings instead of the URL's.
  it('the edit page reads the funding request once, by application id, never without an id', async () => {
    const fundingRequestCalls: string[] = []
    const ok = (data: unknown) => () => HttpResponse.json({ status: true, message: '', data })
    server.use(
      http.get('*/common/funding-application/funding-request', ({ request }) => {
        const query = new URL(request.url).search
        fundingRequestCalls.push(query)
        return query
          ? HttpResponse.json({ status: true, message: '', data: { id: 113, funding_request_id: 18, status: 'Draft' } })
          : HttpResponse.json({ status: false, message: 'Funding request information not found' }, { status: 404 })
      }),
      http.get('*/common/funding-application/business-info', ok(null)),
      http.get('*/common/funding-application/ownership-info', ok(null)),
      http.get('*/common/funding-application/financial-info', ok(null)),
      http.get('*/common/funding-application/disclosures-and-consent', ok(null)),
      http.get('*/common/funding-application/federal-compliance-disclosures', ok(null)),
      http.get('*/common/funding-application/documents/*', ok([])),
      http.get('*/common/funding-sequencings/grouped', ok([])),
      http.get('*/common/doc-types', ok([])),
    )

    render(
      <QueryClientProvider client={createTestQueryClient()}>
        <MemoryRouter initialEntries={['/intake-review/funding-application/113/edit']}>
          <Routes>
            <Route path="/intake-review/funding-application/:applicationId/edit" element={<FundApplication />} />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>
    )

    await screen.findAllByText(/Business Information/, {}, { timeout: 10000 })
    await waitFor(() => expect(fundingRequestCalls.length).toBeGreaterThan(0), { timeout: 10000 })
    await new Promise((resolve) => setTimeout(resolve, 1500))

    expect(fundingRequestCalls).toEqual(['?funding_application_id=113'])
  }, 25000)
})
