import { test, listScreenTests } from '../../support/live/fixtures'

// Real fch-backend-api and local database (see e2e/auth.setup.ts).
test.describe('Sidebar › Commissions (live)', () => {
  listScreenTests({
    menu: 'Commissions',
    url: /\/commissions$/,
    heading: 'Commissions',
    columns: ['Date', 'Borrower', 'Partner', 'Status', 'Requested Amount'],
    search: 'Search borrower or ID...',
    detail: { url: /\/commissions\/\d+$/, heading: 'Commission Details' },
  })
})
