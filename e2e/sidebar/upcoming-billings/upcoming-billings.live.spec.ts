import { test, listScreenTests } from '../../support/live/fixtures'

// Real fch-backend-api and local database (see e2e/auth.setup.ts).
test.describe('Sidebar › Upcoming Billings (live)', () => {
  listScreenTests({
    menu: 'Upcoming Billings',
    url: /\/billing$/,
    heading: 'Upcoming Billings',
    columns: ['Name', 'Billing Type', 'Amount', 'Upcoming Billing Date'],
    search: 'Search by name, email...',
    detail: { url: /\/billing\/\d+$/, heading: 'Billing Details' },
  })
})
