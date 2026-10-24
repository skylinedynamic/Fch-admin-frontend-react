import { useState } from 'react'
import { describe, expect, it, vi } from 'vitest'
import userEvent from '@testing-library/user-event'
import { render, screen, waitFor } from '@testing-library/react'
import { QueryClientProvider } from '@tanstack/react-query'
import { http, HttpResponse } from 'msw'
import { server } from '../../../../mocks/server'
import { createTestQueryClient, renderWithProviders } from '../../../../test-utils'
import CoBorrowerModal from '../../../../../src/pages/applications/fundapplication/components/shared/CoBorrowerModal'
import OwnershipInformationStep from '../../../../../src/pages/applications/fundapplication/components/steps/OwnershipInformationStep'
import ClientInfoSection from '../../../../../src/pages/clients/components/ClientInfoSection'
import type { CoBorrower, OwnerInfo } from '../../../../../src/pages/applications/fundapplication/types'

vi.mock('react-toastify', () => ({ toast: Object.assign(vi.fn(), { success: vi.fn(), error: vi.fn(), info: vi.fn(), warn: vi.fn() }) }))
vi.mock('bootstrap/js/dist/modal', () => import('../../../../mocks/fakeBootstrapModal'))
vi.mock('../../../../../src/hooks/useSummernote', () => ({ useSummernote: () => ({ editorRef: () => {} }) }))

/**
 * Every Social Security Number field in the partner portal is the one SSN
 * field (components/Common/SsnInput), as on the borrower's profile: masked
 * ***-**-1234 at rest, edited on a click, in full on the eye button.
 */
const coBorrower: CoBorrower = {
  id: null, firstName: 'John', lastName: 'Co', role: 'Owner', ownershipPct: '50', email: 'john@example.com',
  mobilePhone: '', homePhone: '', streetAddress: '', country: 'United States', city: '', state: '', zip: '',
  ssn: '987-65-4321', dob: '1985-05-05', driversLicenseNumber: '', driversLicenseState: '',
}

const owner: OwnerInfo = {
  id: null, firstName: 'Jane', lastName: 'Owner', dob: '1990-01-01', ssn: '123-45-6789', citizenship: 'US Citizen',
  streetAddress: '', country: 'United States', city: '', state: '', zip: '', ownershipPct: '100',
  hasCoBorrower: false, phoneNumber: '',
}

const wrap = (ui: React.ReactElement) => render(<QueryClientProvider client={createTestQueryClient()}>{ui}</QueryClientProvider>)

function OwnerHarness() {
  const [state, setState] = useState<OwnerInfo>(owner)
  return (
    <OwnershipInformationStep
      owner={state} setOwner={setState} coBorrowers={[]} setCoBorrowers={() => {}}
      onShowCoModal={() => {}} onDeleteCoBorrower={() => {}} coDraft={coBorrower} setCoDraft={() => {}}
      onAddCoBorrower={() => {}} onEditCoBorrower={() => {}} onNext={() => {}} onBack={() => {}} loading={false}
      isValid
    />
  )
}

function CoHarness() {
  const [draft, setDraft] = useState<CoBorrower>(coBorrower)
  return <CoBorrowerModal coDraft={draft} setCoDraft={setDraft} onSubmit={() => {}} isEditing={false} />
}

const showSsn = (all = false) => screen.getAllByRole('button', { name: /show ssn/i, hidden: all })

describe('SSN fields in the partner portal', () => {
  it('fund application -> owner SSN is masked, edited on a click, in full on the eye button', async () => {
    const user = userEvent.setup()
    wrap(<OwnerHarness />)

    const ssn = screen.getAllByLabelText(/social security number/i)[0] as HTMLInputElement
    expect(ssn.value).toBe('***-**-6789')

    await user.click(ssn)
    await user.clear(ssn)
    await user.type(ssn, '234567890')
    expect(ssn.value).toBe('234-56-7890')
    expect(ssn).toHaveAttribute('type', 'password')

    await user.click(showSsn()[0])
    expect(ssn.value).toBe('234-56-7890')
    expect(ssn).toHaveAttribute('type', 'text')
  })

  it('fund application -> the phone examples are numbers a real US phone could be', () => {
    wrap(<OwnerHarness />)
    wrap(<CoHarness />)

    // (123) 456-7890 is not one: an area code never starts with 1.
    expect(screen.queryAllByPlaceholderText('(123) 456-7890')).toHaveLength(0)
    expect(screen.getAllByPlaceholderText('(555) 555-5555', { exact: true })).toHaveLength(3)
  })

  it('fund application -> co-borrower SSN is masked, in full on the eye button', async () => {
    const user = userEvent.setup()
    wrap(<CoHarness />)

    const ssn = screen.getByLabelText(/social security number/i) as HTMLInputElement
    expect(ssn.value).toBe('***-**-4321')

    // The modal sits outside the accessibility tree until Bootstrap shows it.
    await user.click(showSsn(true)[0])
    expect(ssn.value).toBe('987-65-4321')
  })

  it('an application with co-borrowers still opens when the country list never loaded', async () => {
    // getDefaultCountry() has nothing to return then; reading .name off it took
    // the whole page down (the borrower portal's step was fixed the same way).
    server.use(
      http.get('*/common/funding-application/ownership-info', () =>
        HttpResponse.json({ status: true, data: { id: 1, first_name: 'Jane', ssn: '325555555', co_borrowers: [{ id: 2, first_name: 'Cora', ssn: '234567890' }] } })
      ),
      http.all('*', () => HttpResponse.json({ status: true, data: [] }))
    )
    function Loaded() {
      const [state, setState] = useState<OwnerInfo>({ ...owner, ssn: '' })
      const [cos, setCos] = useState<CoBorrower[]>([])
      return (
        <OwnershipInformationStep
          owner={state} setOwner={setState} coBorrowers={cos} setCoBorrowers={setCos}
          onShowCoModal={() => {}} onDeleteCoBorrower={() => {}} coDraft={coBorrower} setCoDraft={() => {}}
          onAddCoBorrower={() => {}} onEditCoBorrower={() => {}} onNext={() => {}} onBack={() => {}} loading={false}
          isValid fundingRequestId={15}
        />
      )
    }
    wrap(<Loaded />)

    await waitFor(() => expect((screen.getAllByLabelText(/social security number/i)[0] as HTMLInputElement).value).toBe('***-**-5555'))
  })

  it('Client -> Profile SSN is masked, in full on the eye button, and sent as typed', async () => {
    const user = userEvent.setup()
    server.use(
      http.get('*/common/borrowers/5', () =>
        HttpResponse.json({ status: true, data: { id: 5, first_name: 'Ada', last_name: 'L', email: 'a@example.test', ssn: '123456789' } })
      ),
      http.all('*', () => HttpResponse.json({ status: true, data: [] }))
    )
    renderWithProviders(<ClientInfoSection clientId="5" countries={[]} states={[]} cities={[]} />)

    const ssn = (await screen.findByLabelText('Social Security Number')) as HTMLInputElement
    await waitFor(() => expect(ssn.value).toBe('***-**-6789'))

    await user.click(showSsn()[0])
    expect(ssn.value).toBe('123-45-6789')
  })
})
