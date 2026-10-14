import { test, listScreenTests } from '../../../support/live/fixtures'

// Real fch-backend-api and local database (see e2e/auth.setup.ts).
test.describe('Sidebar › Credit Builder › Verification Center (live)', () => {
  listScreenTests({
    menu: 'Verification Center',
    group: 'Credit Builder',
    url: /\/verification-center$/,
    heading: 'Verification Center',
    columns: ['Borrower Name', 'Partner Name', 'Current Tier', 'Pending Requests'],
    search: 'Search borrower, partner or tier...',
  })
})
