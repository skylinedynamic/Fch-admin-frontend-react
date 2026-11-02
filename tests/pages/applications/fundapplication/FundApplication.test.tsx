import { afterEach, describe, expect, it, vi } from 'vitest'
import { http, HttpResponse } from 'msw'
import { QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router-dom'
import { server } from '../../../mocks/server'
import { createTestQueryClient, fireEvent, render, screen, waitFor, within } from '../../../test-utils'
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

/** Business Information as a submitted application has it - every required field filled. */
const validBusinessInfoResponse = () => ({ ...businessInfoResponse, data: { ...businessInfoResponse.data, id: 21, full_name: 'Ada Lovelace', business_name: 'Acme', business_email: 'ada@acme.test', business_phone_no: '(555) 010-0001', business_country: 'United States', business_address: '1 Main St', business_city: 'Austin', business_state: 'Texas', industry_type: 'Retail', entity_type: 'LLC', years_in_business: '2020-01-01' } })

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

/** A submitted application whose step flags say which steps were saved. */
const submittedRequest = (status: string, saved: Partial<Record<string, boolean>>) =>
  http.get('*/common/funding-application/funding-request', () =>
    HttpResponse.json({
      status: true,
      message: '',
      data: {
        id: 21,
        status,
        requested_amount: null,
        purpose_of_funds: null,
        preferred_funding_type: null,
        timeframe_needed: null,
        collateral_available: null,
        purpose_note: null,
        is_business_info_saved: true,
        is_ownership_info_saved: true,
        is_financial_info_saved: true,
        is_funding_request_saved: true,
        is_disclosures_saved: true,
        is_federal_compliance_saved: true,
        ...saved,
      },
    })
  )

describe('FundApplication progress badge', () => {
  it('a submitted application with every step saved shows 100%', async () => {
    server.use(
      submittedRequest('Submitted (Received)', {}),
      http.get('*/common/funding-application/business-info', () => HttpResponse.json(validBusinessInfoResponse())),
      http.get('*/common/funding-application/documents/*', () =>
        HttpResponse.json({ status: true, message: '', data: [{ id: 1, document_name: 'Bank statement', file_name: 'bank.pdf' }] })
      ),
      ...supportingHandlers
    )

    renderWizard(42)

    const badges = await screen.findAllByText('100%', {}, { timeout: 10000 })
    expect(badges.length).toBeGreaterThan(0)
  }, 15000)

  /**
   * Defect: application 18 was set to Closed (Completed) from Update Status
   * without Disclosures and Federal Compliance ever being saved. The wizard
   * took any status past Draft as "submitted": it showed "7 of 7 / 100%" and
   * opened every step, so Federal Compliance could be opened (and its save
   * attempted) before Disclosures and consent. Progress and the open steps
   * now follow the steps actually saved, whatever the status.
   */
  it('a closed application with Disclosures not saved shows its real progress and keeps Federal Compliance locked', async () => {
    server.use(
      submittedRequest('Closed (Completed)', { is_disclosures_saved: false, is_federal_compliance_saved: false }),
      http.get('*/common/funding-application/business-info', () => HttpResponse.json(businessInfoResponse)),
      ...supportingHandlers
    )

    renderWizard(18)

    await screen.findAllByText(/%$/, {}, { timeout: 10000 })
    expect(screen.queryAllByText('100%')).toHaveLength(0)
    expect(screen.queryAllByText(/Completed 7 of 7 steps/)).toHaveLength(0)
    for (const step of screen.getAllByRole('button', { name: /Federal Compliance Disclosures/ })) {
      expect(step).toBeDisabled()
    }
  }, 15000)

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

describe("FundApplication — Can't edit a locked application", () => {
  const reason = 'This application can no longer be edited because it is "Funded". Contact your funding advisor if something needs to change.'

  const lockedRequest = (overrides: Record<string, unknown> = {}) =>
    http.get('*/common/funding-application/funding-request', () =>
      HttpResponse.json({
        status: true,
        message: '',
        data: { id: 7, status: 'Funded', is_locked: true, is_editable: false, locked_reason: reason, ...overrides },
      })
    )

  it('shows why instead of the form when the edit URL is opened on a locked application', async () => {
    server.use(lockedRequest(), http.get('*/common/funding-application/business-info', () => HttpResponse.json(businessInfoResponse)), ...supportingHandlers)

    renderWizard(44)

    expect(await screen.findByRole('heading', { name: /can't edit funding application/i }, { timeout: 10000 })).toBeInTheDocument()
    expect(screen.getByText(reason)).toBeInTheDocument()
    expect(screen.queryByText(/^Step \d+ of/)).not.toBeInTheDocument()
  }, 15000)

  it('names the status when the server sends no reason', async () => {
    server.use(
      lockedRequest({ status: 'Closed - Error', locked_reason: null }),
      http.get('*/common/funding-application/business-info', () => HttpResponse.json(businessInfoResponse)),
      ...supportingHandlers
    )

    renderWizard(45)

    expect(await screen.findByText(/because it is "Closed - Error"/, {}, { timeout: 10000 })).toBeInTheDocument()
  }, 15000)
})

/**
 * Defect: every step is rendered twice - the desktop pane and the mobile
 * accordion - and both registered their save, the hidden mobile copy last.
 * Moving on from the sidebar ran the hidden copy's save, so a refused save
 * ("You must authorize the credit pull.", "The business name is required.")
 * put its message on the hidden copy: on a desktop only the toast "Please
 * resolve validation errors" showed. Only the copy on screen registers now.
 */
describe('FundApplication - a refused save from the sidebar', () => {
  const desktop = (matches: boolean) => (query: string) => ({
    matches: query.includes('min-width: 992px') ? matches : false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  }) as unknown as MediaQueryList

  afterEach(() => vi.restoreAllMocks())

  it('shows the field message on the desktop pane, not on the hidden mobile copy', async () => {
    vi.spyOn(window, 'matchMedia').mockImplementation(desktop(true))
    server.use(
      submittedRequest('Draft', { is_financial_info_saved: false, is_funding_request_saved: false, is_disclosures_saved: false, is_federal_compliance_saved: false }),
      http.get('*/common/funding-application/business-info', () =>
        HttpResponse.json(validBusinessInfoResponse())
      ),
      http.post('*/common/funding-application/business-info', () =>
        HttpResponse.json({ status: false, message: 'Invalid', errors: { business_name: 'The business name is required.' } }, { status: 422 })
      ),
      ...supportingHandlers
    )

    const { container } = renderWizard(44)
    const desktopPane = container.querySelector('.col-xl-9.col-lg-8.d-none.d-lg-block') as HTMLElement
    const sidebar = container.querySelector('.col-xl-3.col-lg-4.d-none.d-lg-block') as HTMLElement
    const ownership = await within(sidebar).findByRole('button', { name: /Ownership Information/ }, { timeout: 10000 })
    await waitFor(() => expect(ownership).toBeEnabled(), { timeout: 10000 })

    fireEvent.click(ownership)

    expect(await within(desktopPane).findByText('The business name is required.', {}, { timeout: 10000 })).toBeInTheDocument()
  }, 20000)
})
