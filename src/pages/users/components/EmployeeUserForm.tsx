import { Link } from 'react-router-dom'
import { Dropdown } from 'primereact/dropdown'
import type { AvailableEmployee } from '../../../modules/employee'
import type { Role } from '../../../modules/user'

export type EmployeeUserFormValues = {
  employee_id: number | null
  name: string
  email: string
  phone_number: string
  role_id: string
  password: string
}

export type EmployeeUserFormErrors = Partial<Record<keyof EmployeeUserFormValues, string>>

type Props = {
  values: EmployeeUserFormValues
  errors: EmployeeUserFormErrors
  employees: AvailableEmployee[]
  roles: Role[]
  canCreateEmployee: boolean
  onEmployeeChange: (employee: AvailableEmployee | null) => void
  onChange: (field: keyof EmployeeUserFormValues, value: string) => void
}

const employeeOptionLabel = (employee: AvailableEmployee) =>
  employee.email ? `${employee.full_name} (${employee.email})` : employee.full_name

export default function EmployeeUserForm({
  values,
  errors,
  employees,
  roles,
  canCreateEmployee,
  onEmployeeChange,
  onChange,
}: Props) {
  const employeeOptions = employees.map((employee) => ({ label: employeeOptionLabel(employee), value: employee.id }))
  const roleOptions = roles.map((role) => ({ label: role.name, value: String(role.id) }))

  const textField = (field: 'name' | 'email' | 'phone_number' | 'password', label: string, type: string, placeholder: string) => (
    <div className="col-md-6 mb-3">
      <label htmlFor={`user-${field}`} className="form-label">
        {label} <span className="text-danger">*</span>
      </label>
      <input
        id={`user-${field}`}
        type={type}
        name={field}
        autoComplete={field === 'password' ? 'new-password' : 'off'}
        className={`form-control ${errors[field] ? 'is-invalid' : ''}`}
        value={values[field]}
        onChange={(e) => onChange(field, e.target.value)}
        placeholder={placeholder}
      />
      {errors[field] && <div className="invalid-feedback">{errors[field]}</div>}
    </div>
  )

  return (
    <div className="row">
      <div className="col-12 mb-4">
        <div className="alert alert-info d-flex align-items-start gap-2 mb-0" role="note">
          <i className="ri-information-line fs-18 lh-1"></i>
          <div>
            Every user belongs to an employee. To create a user, create the employee first, then select them below.
            {canCreateEmployee && (
              <>
                {' '}
                <Link to="/employees/create" className="fw-semibold">
                  Create new employee
                </Link>
              </>
            )}
          </div>
        </div>
      </div>

      <div className="col-12 mb-3">
        <label htmlFor="user-employee" className="form-label">
          Employee <span className="text-danger">*</span>
        </label>
        <Dropdown
          inputId="user-employee"
          value={values.employee_id}
          options={employeeOptions}
          onChange={(e) => onEmployeeChange(employees.find((employee) => employee.id === e.value) ?? null)}
          placeholder="Select employee"
          filter
          filterBy="label"
          emptyMessage="Every employee already has a user account"
          className={`w-100 ${errors.employee_id ? 'p-invalid' : ''}`}
        />
        {errors.employee_id && <div className="invalid-feedback d-block">{errors.employee_id}</div>}
        {employees.length === 0 && (
          <div className="form-text">Every employee already has a user account.</div>
        )}
      </div>

      {textField('name', 'Name', 'text', 'Enter full name')}
      {textField('email', 'Email Address', 'email', 'Enter email address')}
      {textField('phone_number', 'Phone Number', 'text', 'Enter phone number')}

      <div className="col-md-6 mb-3">
        <label htmlFor="user-role" className="form-label">
          User Role <span className="text-danger">*</span>
        </label>
        <Dropdown
          inputId="user-role"
          value={values.role_id}
          options={roleOptions}
          onChange={(e) => onChange('role_id', e.value)}
          placeholder="Select role"
          className={`w-100 ${errors.role_id ? 'p-invalid' : ''}`}
        />
        {errors.role_id && <div className="invalid-feedback d-block">{errors.role_id}</div>}
      </div>

      {textField('password', 'Password', 'password', 'Enter password')}
    </div>
  )
}
