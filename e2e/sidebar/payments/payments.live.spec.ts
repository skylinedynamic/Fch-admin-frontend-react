import { test, listScreenTests } from '../../support/live/fixtures'

// Real fch-backend-api and local database (see e2e/auth.setup.ts).
test.describe('Sidebar › Payments (live)', () => {
  listScreenTests({
    menu: 'Payments',
    url: /\/payments$/,
    heading: 'Payments',
    columns: ['Date', 'Invoice ID', 'Payment Method', 'Amount', 'Status'],
    search: 'Search...',
    detail: { url: /\/payments\/\d+$/, heading: 'Payment Details' },
  })
})
