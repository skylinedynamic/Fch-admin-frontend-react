import { test, listScreenTests } from '../../support/live/fixtures'

// Real fch-backend-api and local database (see e2e/auth.setup.ts).
test.describe('Sidebar › Subscriptions (live)', () => {
  listScreenTests({
    menu: 'Subscriptions',
    url: /\/subscriptions$/,
    heading: 'Subscriptions',
    columns: ['Name', 'Entity Type', 'Enrollment Type', 'Payable Amount'],
    search: 'Search subscriptions...',
    detail: { url: /\/subscriptions\/\d+$/, heading: 'Subscription Details' },
  })
})
