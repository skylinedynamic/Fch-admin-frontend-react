import { useState, type FormEvent } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { toast } from 'react-toastify'
import PageHeader from '../common/PageHeader'
import FormLoader from '../../components/Loader/FormLoader'
import InvoicePaymentModal from '../invoices/components/InvoicePaymentModal'
import { usePermissions } from '../../lib/auth/usePermissions'
import { useAvailableEmployeesForUser, type AvailableEmployee } from '../../modules/employee'
import { useCreateUser, useRoles } from '../../modules/user'
import { fetchInvoiceDetails } from '../../modules/invoice/services'
import { formatPhoneNumber } from '../../utils/formatters'
import EmployeeUserForm, { type EmployeeUserFormErrors, type EmployeeUserFormValues } from './components/EmployeeUserForm'

/**
 * Router state the Users list passes when the partner is over its seat limit
 * and has chosen to buy an extra seat for the new user.
 */
export type UserCreateLocationState = {
  purchase?: { months: number; totalPrice: number }
}

const EMPTY_FORM: EmployeeUserFormValues = {
  employee_id: null,
  name: '',
  email: '',
  phone_number: '',
  role_id: '',
  password: '',
}

const validate = (values: EmployeeUserFormValues): EmployeeUserFormErrors => {
  const errors: EmployeeUserFormErrors = {}
  if (!values.employee_id) errors.employee_id = 'Please select an employee'
  if (!values.name.trim()) errors.name = 'Name is required'
  if (!values.email.trim()) errors.email = 'Email is required'
  else if (!/\S+@\S+\.\S+/.test(values.email)) errors.email = 'Email is invalid'
  if (!values.phone_number.trim()) errors.phone_number = 'Phone number is required'
  if (!values.role_id) errors.role_id = 'Role is required'
  if (!values.password) errors.password = 'Password is required'
  return errors
}

type ApiError = { response?: { data?: { message?: string; errors?: EmployeeUserFormErrors } } }

export default function UserCreate() {
  const navigate = useNavigate()
  const location = useLocation()
  const purchase = (location.state as UserCreateLocationState | null)?.purchase
  const { hasPermission } = usePermissions()

  const employeesQuery = useAvailableEmployeesForUser()
  const rolesQuery = useRoles()
  const createUser = useCreateUser()

  const [values, setValues] = useState<EmployeeUserFormValues>(EMPTY_FORM)
  const [errors, setErrors] = useState<EmployeeUserFormErrors>({})
  const [invoice, setInvoice] = useState<unknown>(null)

  const handleEmployeeChange = (employee: AvailableEmployee | null) => {
    setErrors((prev) => ({ ...prev, employee_id: undefined, name: undefined, email: undefined, phone_number: undefined }))
    setValues((prev) => ({
      ...prev,
      employee_id: employee?.id ?? null,
      name: employee?.full_name ?? '',
      email: employee?.email ?? '',
      phone_number: formatPhoneNumber(employee?.phone_number_1 ?? '') ?? '',
    }))
  }

  const handleChange = (field: keyof EmployeeUserFormValues, value: string) => {
    setErrors((prev) => ({ ...prev, [field]: undefined }))
    setValues((prev) => ({ ...prev, [field]: field === 'phone_number' ? formatPhoneNumber(value) : value }))
  }

  const handleSubmit = async (e?: FormEvent) => {
    e?.preventDefault()
    const found = validate(values)
    setErrors(found)
    if (Object.keys(found).length > 0) return

    try {
      const res = await createUser.mutateAsync({
        employee_id: values.employee_id as number,
        name: values.name,
        email: values.email,
        phone_number: values.phone_number,
        role_id: Number(values.role_id),
        password: values.password,
        ...(purchase ? { is_paid: true, months: purchase.months } : {}),
      })
      toast.success('User created successfully')

      const invoiceId = res.data?.invoice_id
      if (purchase && invoiceId) {
        // The user stays inactive until the new seat's invoice is paid.
        const invoiceRes = await fetchInvoiceDetails(invoiceId)
        if (invoiceRes?.status) {
          setInvoice(invoiceRes.data)
          return
        }
      }
      navigate('/users')
    } catch (error) {
      const data = (error as ApiError)?.response?.data
      if (data?.errors) {
        setErrors(data.errors)
      } else {
        toast.error(data?.message || 'Failed to save user')
      }
    }
  }

  const loading = employeesQuery.isLoading || rolesQuery.isLoading

  return (
    <div className="page-content">
      <div className="container-fluid">
        <PageHeader title="Add User" breadcrumbs={[{ label: 'Users', path: '/users' }, { label: 'Add User' }]}>
          <div className="page-actions d-flex align-items-center gap-2 mt-3 mt-lg-0">
            <Link to="/users" className="btn btn-outline-secondary w-lg waves-effect">
              <i className="ri-arrow-left-line align-middle me-1"></i> Back
            </Link>
            <button
              type="submit"
              form="user-create-form"
              className="btn btn-primary w-lg waves-effect"
              disabled={createUser.isPending || loading}
            >
              {createUser.isPending ? (
                <span className="spinner-border spinner-border-sm me-1" role="status" aria-hidden="true"></span>
              ) : (
                <i className="ri-save-3-line align-middle me-1"></i>
              )}
              Save Account
            </button>
          </div>
        </PageHeader>

        <div className="row">
          <div className="col-xxl-8">
            <div className="card">
              <div className="card-body p-4">
                {loading ? (
                  <FormLoader count={6} />
                ) : (
                  <form id="user-create-form" onSubmit={handleSubmit} noValidate>
                    <EmployeeUserForm
                      values={values}
                      errors={errors}
                      employees={employeesQuery.data ?? []}
                      roles={rolesQuery.data ?? []}
                      canCreateEmployee={hasPermission('create employees')}
                      onEmployeeChange={handleEmployeeChange}
                      onChange={handleChange}
                    />

                    {purchase && (
                      <div className="p-3 bg-success bg-opacity-10 text-success mt-2">
                        <h6 className="fw-semibold text-success fs-14 mb-2">
                          <i className="ri-checkbox-circle-fill me-1"></i> Seat Purchase Pending Activation
                        </h6>
                        <div className="row g-2 fs-13">
                          <div className="col-6">Additional Seat Quantity:</div>
                          <div className="col-6 text-end fw-semibold">1 Seat</div>
                          <div className="col-6">Subscription Duration:</div>
                          <div className="col-6 text-end fw-semibold">
                            {purchase.months} Month{purchase.months > 1 ? 's' : ''}
                          </div>
                          <div className="col-6 fw-bold">Total Amount Due:</div>
                          <div className="col-6 text-end fw-bold">${Number(purchase.totalPrice || 0).toFixed(2)}</div>
                        </div>
                      </div>
                    )}
                  </form>
                )}
              </div>
            </div>
          </div>
        </div>

        <InvoicePaymentModal
          show={!!invoice}
          invoice={invoice}
          onHide={() => navigate('/users')}
          onSuccess={() => {
            toast.success('Payment completed successfully!')
            navigate('/users')
          }}
        />
      </div>
    </div>
  )
}
