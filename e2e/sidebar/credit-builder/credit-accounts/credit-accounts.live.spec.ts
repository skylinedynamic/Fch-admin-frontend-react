import { test, listScreenTests } from '../../../support/live/fixtures'

// Real fch-backend-api and local database (see e2e/auth.setup.ts).
test.describe('Sidebar › Credit Builder › Credit Accounts (live)', () => {
  listScreenTests({
    menu: 'Credit Accounts',
    group: 'Credit Builder',
    url: /\/credit-accounts$/,
    heading: 'Credit Accounts',
    columns: ['Name', 'Issuer', 'Category', 'Status'],
    search: 'Search here...',
    detail: { url: /\/credit-accounts\/\d+$/, heading: 'Edit Credit Account' },
  })
})
