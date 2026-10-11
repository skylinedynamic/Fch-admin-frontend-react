import { Link } from 'react-router-dom'
import { Dropdown } from 'primereact/dropdown'
import type { AvailableEmployee } from '../../../modules/employee'

type Props = {
  employees: AvailableEmployee[]
  value: number | null
  error?: string
  canCreateEmployee: boolean
  onChange: (employee: AvailableEmployee | null) => void
}

const optionLabel = (employee: AvailableEmployee) =>
  employee.email ? `${employee.full_name} (${employee.email})` : employee.full_name

/**
 * Every user is the login of one of the partner's employees: this picks the
 * employee a new user is created for, from those without a user yet.
 */
export default function EmployeePicker({ employees, value, error, canCreateEmployee, onChange }: Props) {
  const options = employees.map((employee) => ({ label: optionLabel(employee), value: employee.id }))

  return (
    <>
      <div className="col-12 mb-3">
        <div className="alert alert-info d-flex align-items-start gap-2 mb-0" role="note">
          <i className="ri-information-line fs-18 lh-1"></i>
          <div>
            <div className="fw-semibold mb-1">Every user belongs to an employee</div>
            <p className="mb-1">
              A user is the sign-in account for one of your employees, so you need to create the employee first,
              then select them below.
            </p>
            <ul className="mb-1 ps-3">
              <li>The list shows only employees who don't have a user account yet.</li>
              <li>
                Selecting an employee fills in the name, email and phone number from the employee's record. You can
                still change them before saving.
              </li>
              <li>Choose a role and set a password to finish creating the account.</li>
            </ul>
            {canCreateEmployee ? (
              <span>
                Can't find the person?{' '}
                <Link to="/employees/create" className="fw-semibold">
                  Create new employee
                </Link>{' '}
                and come back here to add their user.
              </span>
            ) : (
              <span>Can't find the person? Ask someone who can manage employees to add them first.</span>
            )}
          </div>
        </div>
      </div>

      <div className="col-12">
        <div className="mb-3">
          <label htmlFor="user-employee" className="form-label">
            Employee <span className="text-danger">*</span>
          </label>
          <Dropdown
            inputId="user-employee"
            value={value}
            options={options}
            onChange={(e) => onChange(employees.find((employee) => employee.id === e.value) ?? null)}
            placeholder="Select employee"
            filter
            filterBy="label"
            emptyMessage="Every employee already has a user account"
            className={`w-100 ${error ? 'p-invalid' : ''}`}
          />
          {error && <div className="invalid-feedback d-block">{error}</div>}
          {employees.length === 0 && <div className="form-text">Every employee already has a user account.</div>}
        </div>
      </div>
    </>
  )
}
