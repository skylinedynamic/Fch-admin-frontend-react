import { describePendingEmail } from '../../support/pendingEmail'

const BO = { id: 136, user_id: 55, first_name: 'Bo', last_name: 'Rower', email: 'bo@example.test', has_sign: false }

describePendingEmail({
  title: 'Sidebar › Clients › edit',
  route: '/clients/136',
  permissions: ['view clients', 'update clients'],
  current: BO.email,
  requested: 'bo.new@example.test',
  placeholder: 'Enter email address',
  load: { match: /\/common\/borrowers\/136(\?|$)/, body: (pending) => ({ ...BO, pending_email: pending }) },
  save: { method: 'POST', match: /\/common\/borrowers\/136(\?|$)/, body: (pending) => ({ ...BO, pending_email: pending }) },
})
