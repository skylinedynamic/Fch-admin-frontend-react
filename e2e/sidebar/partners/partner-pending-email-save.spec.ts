import { describePendingEmail } from '../../support/pendingEmail'
import { HOST_USER, ok } from '../../support/helpers'

const PERMISSIONS = ['view partners', 'update partners']

const ACME = {
  id: 86, full_name: 'Acme Owner', company_name: 'Acme LLC', email: 'acme@example.test', login_user_id: 41,
  partner_type: 'White Label Partner', status: 'Active', assigned_user_id: '', country: 'United States', is_host: 0,
}

describePendingEmail({
  title: 'Sidebar › Partners › edit',
  route: '/partners/86',
  permissions: PERMISSIONS,
  current: ACME.email,
  requested: 'acme.new@example.test',
  placeholder: 'Enter email address',
  load: { match: /\/admin\/partners-details\/86(\?|$)/, body: (pending) => ({ ...ACME, pending_email: pending }) },
  save: { method: 'POST', match: /\/admin\/partners\/86(\?|$)/, body: (pending) => ({ ...ACME, pending_email: pending }) },
  extra: [
    { method: 'GET', match: '/admin/partners/86/status-agent', body: { status: true, message: 'ok', data: { id: 86, status: 'Active', assign_to: null, agent: null } } },
    // Update reloads the signed-in user; it must keep its permissions.
    { method: 'GET', match: '/common/refresh-user', body: ok({ ...HOST_USER, permissions: PERMISSIONS }) },
  ],
  // The email is on Partner information, the tab the page opens on.
  open: async (page) => { await page.getByText('Partner information', { exact: true }).click() },
  // Update moves on to the next tab.
  reopenAfterSave: true,
})
