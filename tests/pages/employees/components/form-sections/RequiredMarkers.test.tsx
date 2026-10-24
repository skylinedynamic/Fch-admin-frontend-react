import { describe, expect, it, vi } from 'vitest'
import { renderWithProviders } from '../../../../test-utils'
import PersonalInfoSection from '../../../../../src/pages/employees/components/form-sections/PersonalInfoSection'
import AddressSection from '../../../../../src/pages/employees/components/form-sections/AddressSection'

/**
 * The API requires only an employee's name, email and country, so only those
 * three labels carry the red "*" - every other detail is optional.
 */
const starredLabels = (container: HTMLElement) =>
  Array.from(container.querySelectorAll('label.form-label'))
    .filter((label) => label.querySelector('.text-danger')?.textContent?.trim() === '*')
    .map((label) => (label.firstChild?.textContent ?? '').trim())

const employee = { country: 'United States' }

describe('Employee form › required markers', () => {
  it('marks only Name and Email in the personal details', () => {
    const { container } = renderWithProviders(
      <PersonalInfoSection
        employee={employee}
        errors={{}}
        onChange={vi.fn()}
        departments={[]}
        onAddDepartment={vi.fn()}
        countryCodeOptions={[]}
        phonePrefix="+1"
        onPhonePrefixChange={vi.fn()}
        onOpenFileManager={vi.fn()}
        profileImage={null}
        employeeId={null}
      />
    )

    expect(starredLabels(container)).toEqual(['Name', 'Email'])
  })

  it('marks only Country in the address', () => {
    const { container } = renderWithProviders(
      <AddressSection employee={employee} errors={{}} onChange={vi.fn()} countries={[]} states={[]} cities={[]} />
    )

    expect(starredLabels(container)).toEqual(['Country'])
  })
})
