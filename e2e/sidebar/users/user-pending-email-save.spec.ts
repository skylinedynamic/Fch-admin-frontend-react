import { describePendingEmail } from '../../support/pendingEmail'

const SAM = { id: 7, name: 'Sam Sales', email: 'sam@example.test', phone_number: '5551234567', role_id: 3, status: 'active' }

describePendingEmail({
  title: 'Sidebar › Users › edit',
  route: '/user-details/7',
  permissions: ['view users', 'update users'],
  current: SAM.email,
  requested: 'sam.new@example.test',
  placeholder: 'Enter email address',
  load: { match: /\/common\/users\/7(\?|$)/, body: (pending) => ({ ...SAM, pending_email: pending }) },
  save: { method: 'PUT', match: /\/common\/users\/7(\?|$)/, body: (pending) => ({ ...SAM, pending_email: pending }) },
  extra: [{ method: 'POST', match: '/common/roles/fetch-roles', body: { status: true, message: 'ok', data: [{ id: 3, name: 'Sales' }] } }],
})
