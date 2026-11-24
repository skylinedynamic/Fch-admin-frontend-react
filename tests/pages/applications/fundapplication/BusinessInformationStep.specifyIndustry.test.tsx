import { afterEach, describe, expect, it, vi } from 'vitest'
import { useState } from 'react'
import { http, HttpResponse } from 'msw'
import { server } from '../../../mocks/server'
import { fireEvent, renderWithProviders, screen, waitFor } from '../../../test-utils'
import BusinessInformationStep from '../../../../src/pages/applications/fundapplication/components/steps/BusinessInformationStep'
import type { BusinessDetails, PersonalInfo } from '../../../../src/pages/applications/fundapplication/types'
import { INDUSTRY_TYPE_NOTE_REQUIRED } from '../../../../src/data/profile'

afterEach(() => {
  server.resetHandlers()
  vi.restoreAllMocks()
})

const savedBusinessInfo = (overrides: Record<string, unknown> = {}) => ({
  id: 21, full_name: 'Juan Alvarado', business_name: 'M&H Telecom, Inc', business_email: 'owner@mh.test',
  business_phone_no: '(561) 603-5852', business_country: 'United States', business_country_code: '+1',
  business_address: '3554 Cypress Edge Drive', business_city: 'Lake Worth', business_state: 'Florida',
  business_postal_code: '33467', industry_type: 'Other', industry_type_note: null, entity_type: 'S-Corporation',
  years_in_business: '7 Years 9 Months 30 Days', number_of_employees: '3', funding_request_id: 86,
  ...overrides,
})

/** Serves the saved step and records every save the step posts. */
const serve = (data: Record<string, unknown>) => {
  const posted: Record<string, unknown>[] = []
  server.use(
    http.get('*/common/funding-application/business-info', () => HttpResponse.json({ status: true, message: 'ok', data })),
    http.post('*/common/funding-application/business-info', async ({ request }) => {
      const body = (await request.json()) as Record<string, unknown>
      posted.push(body)
      return HttpResponse.json({ status: true, message: 'saved', data: { ...data, ...body } })
    }),
  )
  return posted
}

function Harness({ onNext }: { onNext: () => void }) {
  const [personal, setPersonal] = useState<PersonalInfo>({
    fullName: '', businessName: '', email: '', phoneCountry: 'USA (+1)', phoneNumber: '',
  })
  const [business, setBusiness] = useState<BusinessDetails>({
    businessName: '', businessAddress: '', city: '', state: '', incorporationState: '', zip: '',
    industryType: '', industryTypeNote: '', entityType: '', yearsInBusiness: '', employees: '',
  })
  return (
    <BusinessInformationStep
      personal={personal}
      setPersonal={setPersonal}
      business={business}
      setBusiness={setBusiness}
      canProceed
      onNext={onNext}
      loading={false}
      fundingRequestId={86}
    />
  )
}

const saveAndNext = () => fireEvent.click(screen.getByRole('button', { name: /Save & Next/ }))

/**
 * Ticket 509: the partner / host wizard's Step 1 shows a required "Specify
 * Industry" field when Industry Type is Other, saves it with the application,
 * and hides it for every other industry.
 */
describe('BusinessInformationStep (partner wizard) - Specify Industry', () => {
  it('is hidden when the industry is not Other', async () => {
    serve(savedBusinessInfo({ industry_type: 'Manufacturing' }))
    renderWithProviders(<Harness onNext={() => {}} />)

    await screen.findByDisplayValue('Juan Alvarado')
    expect(screen.queryByLabelText(/Specify Industry/)).not.toBeInTheDocument()
  })

  it('is shown for Other and stops Save & Next until it is filled in', async () => {
    const posted = serve(savedBusinessInfo())
    const onNext = vi.fn()
    renderWithProviders(<Harness onNext={onNext} />)

    const field = await screen.findByLabelText(/Specify Industry/)
    expect(field).toHaveValue('')

    fireEvent.change(field, { target: { value: '   ' } })
    saveAndNext()
    expect(await screen.findByText(INDUSTRY_TYPE_NOTE_REQUIRED)).toBeInTheDocument()
    expect(posted).toHaveLength(0)
    expect(onNext).not.toHaveBeenCalled()

    fireEvent.change(field, { target: { value: ' Telecommunications Infrastructure ' } })
    saveAndNext()
    await waitFor(() => expect(onNext).toHaveBeenCalledTimes(1))
    expect(posted[0]).toMatchObject({ industry_type: 'Other', industry_type_note: 'Telecommunications Infrastructure' })
  })

  it('reopens with the saved value filled in', async () => {
    serve(savedBusinessInfo({ industry_type_note: 'Telecommunications Infrastructure' }))
    renderWithProviders(<Harness onNext={() => {}} />)

    expect(await screen.findByLabelText(/Specify Industry/)).toHaveValue('Telecommunications Infrastructure')
  })
})
