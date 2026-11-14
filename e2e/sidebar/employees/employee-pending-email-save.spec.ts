import { describePendingEmail } from '../../support/pendingEmail'

const EVE = { id: 9, first_name: 'Eve', last_name: 'Employee', email: 'eve@example.test' }

describePendingEmail({
  title: 'Sidebar › Employees › edit',
  route: '/employee-details/9',
  permissions: ['view employees', 'update employees'],
  current: EVE.email,
  requested: 'eve.new@example.test',
  placeholder: 'Enter email',
  load: { match: /\/common\/employees\/9(\?|$)/, body: (pending) => ({ ...EVE, user: { id: 41, role_id: 3, pending_email: pending } }) },
  save: { method: 'POST', match: /\/common\/employees\/9(\?|$)/, body: (pending) => ({ employee: EVE, user: { id: 41, pending_email: pending } }) },
})
