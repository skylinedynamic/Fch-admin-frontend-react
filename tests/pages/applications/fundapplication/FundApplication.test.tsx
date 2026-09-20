import { afterEach, describe, expect, it, vi } from 'vitest'
import { http, HttpResponse } from 'msw'
import { QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router-dom'
import { server } from '../../../mocks/server'
import { createTestQueryClient, render, screen } from '../../../test-utils'
import FundApplication from '../../../../src/pages/applications/fundapplication/FundApplication'

// flatpickrPlugins.yearDropdownPlugin schedules setTimeout(build, 0); if the
// component unmounts before it fires, `build()` reads a stale calendarContainer
// and throws. Stubbed here (test-only, no source change) since date-picker
// chrome isn't what this test exercises — only the progress-badge computation.
vi.mock('../../../../src/utils/flatpickrPlugins', () => ({
  yearDropdownPlugin: () => () => ({}),
}))

afterEach(() => server.resetHandlers())

const renderWizard = (fundingRequestId: number) => {
  const queryClient = createTestQueryClient()
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter
        initialEntries={[{ pathname: '/applications/fund-application', state: { funding_request_id: fundingRequestId } }]}
      >
        <FundApplication />
      </MemoryRouter>
    </QueryClientProvider>
  )
}

const emptyOk = () => HttpResponse.json({ status: true, message: '', data: null })

const supportingHandlers = [
  http.get('*/common/funding-application/ownership-info', emptyOk),
  http.get('*/common/funding-application/financial-info', emptyOk),
  http.get('*/common/funding-application/disclosures-and-consent', emptyOk),
  http.get('*/common/funding-application/federal-compliance-disclosures', emptyOk),
  http.get('*/common/funding-application/documents/*', () => HttpResponse.json({ status: true, message: '', data: [] })),
  http.get('*/common/funding-sequencings/grouped', () => HttpResponse.json({ status: true, message: '', data: [] })),
  http.get('*/common/doc-types', () => HttpResponse.json({ status: true, message: '', data: [] })),
]

const businessInfoResponse = {
  status: true,
  message: '',
  data: {
    id: null,
    full_name: null,
    business_name: null,
    business_email: null,
    business_phone_no: null,
    business_country: null,
    business_country_code: null,
    business_address: null,
    business_city: null,
    business_state: null,
    business_postal_code: null,
    industry_type: null,
    entity_type: null,
    years_in_business: null,
    number_of_employees: null,
  },
}

describe('FundApplication progress badge', () => {
  it(
    'REGRESSION: isApplicationSubmitted was accidentally dropped in a refactor (restored in commit ' +
      '48e8e7c) — for an already-submitted funding request the wizard must show 100% progress ' +
      'regardless of per-step completeness, proven here through the real rendered page',
    async () => {
      server.use(
        http.get('*/common/funding-application/funding-request', () =>
          HttpResponse.json({
            status: true,
            message: '',
            data: {
              id: null,
              status: 'Submitted (Received)',
              requested_amount: null,
              purpose_of_funds: null,
              preferred_funding_type: null,
              timeframe_needed: null,
              collateral_available: null,
              purpose_note: null,
            },
          })
        ),
        http.get('*/common/funding-application/business-info', () => HttpResponse.json(businessInfoResponse)),
        ...supportingHandlers
      )

      renderWizard(42)

      const badges = await screen.findAllByText('100%', {}, { timeout: 10000 })
      expect(badges.length).toBeGreaterThan(0)
    },
    15000
  )

  it('shows a progress percentage under 100% for a Draft application with nothing completed', async () => {
    server.use(
      http.get('*/common/funding-application/funding-request', () =>
        HttpResponse.json({
          status: true,
          message: '',
          data: {
            id: null,
            status: 'Draft',
            requested_amount: null,
            purpose_of_funds: null,
            preferred_funding_type: null,
            timeframe_needed: null,
            collateral_available: null,
            purpose_note: null,
          },
        })
      ),
      http.get('*/common/funding-application/business-info', () => HttpResponse.json(businessInfoResponse)),
      ...supportingHandlers
    )

    renderWizard(43)

    await screen.findAllByText(/%$/, {}, { timeout: 10000 })
    expect(screen.queryByText('100%')).not.toBeInTheDocument()
  }, 15000)
})
