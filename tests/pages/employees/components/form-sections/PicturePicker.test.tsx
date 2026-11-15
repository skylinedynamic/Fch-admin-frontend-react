import { afterEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, screen, waitFor } from '@testing-library/react'
import { http, HttpResponse } from 'msw'
import { server } from '../../../../mocks/server'
import { renderWithProviders } from '../../../../test-utils'
import PersonalInfoSection from '../../../../../src/pages/employees/components/form-sections/PersonalInfoSection'
import PartnerInformationSection from '../../../../../src/pages/partners/components/PartnerInformationSection'

vi.mock('react-toastify', () => ({ toast: Object.assign(vi.fn(), { success: vi.fn(), error: vi.fn(), info: vi.fn(), warn: vi.fn() }) }))

/**
 * R3-BUG-002 follow-up: the file manager opens only a record that exists. On the
 * create pages the picture picker named the next id, a folder nobody owns yet -
 * refused for a partner (403, "folder not yours"). The picker now waits for the
 * record to be saved, and opens that record's own folder.
 */
const listed = () => {
  const bodies: Record<string, unknown>[] = []
  server.use(
    http.post('*/filemanager/list', async ({ request }) => {
      bodies.push((await request.json()) as Record<string, unknown>)
      return HttpResponse.json({ status: true, data: [] })
    }),
    http.post('*/filemanager/tree', () => HttpResponse.json({ status: true, data: [] })),
  )
  return bodies
}

const employeeForm = (props: { isEditMode: boolean, employeeId: number | null }) => renderWithProviders(
  <PersonalInfoSection
    employee={{ country: 'United States' }}
    errors={{}}
    onChange={vi.fn()}
    departments={[]}
    onAddDepartment={vi.fn()}
    countryCodeOptions={[]}
    phonePrefix="+1"
    onPhonePrefixChange={vi.fn()}
    onOpenFileManager={vi.fn()}
    profileImage={null}
    {...props}
  />
)

const partnerForm = (partnerId?: number) => renderWithProviders(
  <PartnerInformationSection
    formData={{ partner_type: '', company_name: 'Acme', country: 'United States', contact_person_relation: '', entity_id: 77 }}
    errors={{}}
    profileImage={null}
    handleInputChange={vi.fn()}
    countries={[]}
    states={[]}
    cities={[]}
    partnerId={partnerId}
  />
)

const pause = () => new Promise((resolve) => setTimeout(resolve, 300))

afterEach(() => server.resetHandlers())

describe('Employee picture picker', () => {
  it('waits for the employee to be saved', async () => {
    const bodies = listed()
    employeeForm({ isEditMode: false, employeeId: 31 })

    const button = screen.getByTitle('Select profile image')
    expect(button).toBeDisabled()
    expect(screen.getByText('Save the employee first, then add a picture.')).toBeInTheDocument()

    fireEvent.click(button)
    await pause()
    expect(bodies).toEqual([])
  })

  it("opens a saved employee's own folder", async () => {
    const bodies = listed()
    employeeForm({ isEditMode: true, employeeId: 12 })

    expect(screen.queryByText('Save the employee first, then add a picture.')).not.toBeInTheDocument()
    fireEvent.click(screen.getByTitle('Select profile image'))

    await waitFor(() => expect(bodies.length).toBeGreaterThan(0))
    expect(bodies[0]).toMatchObject({ entity_type: 'employees', entity_id: 12 })
  })
})

describe('Partner picture picker', () => {
  it('waits for the partner to be saved', async () => {
    const bodies = listed()
    partnerForm(undefined)

    const button = screen.getByTitle('Upload profile image')
    expect(button).toBeDisabled()
    expect(screen.getByText('Save the partner first, then add a picture.')).toBeInTheDocument()

    fireEvent.click(button)
    await pause()
    expect(bodies).toEqual([])
  })

  it("opens a saved partner's own folder", async () => {
    const bodies = listed()
    partnerForm(9)

    expect(screen.queryByText('Save the partner first, then add a picture.')).not.toBeInTheDocument()
    fireEvent.click(screen.getByTitle('Upload profile image'))

    await waitFor(() => expect(bodies.length).toBeGreaterThan(0))
    expect(bodies[0]).toMatchObject({ entity_type: 'partners', entity_id: 9 })
  })
})
