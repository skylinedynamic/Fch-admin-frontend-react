import { test, listScreenTests } from '../../support/live/fixtures'

// Real fch-backend-api and local database (see e2e/auth.setup.ts).
test.describe('Sidebar › Clients (live)', () => {
  listScreenTests({
    menu: 'Clients',
    url: /\/clients$/,
    heading: 'Clients',
    columns: ['Full Name', 'Company Name', 'Email', 'Phone Number', 'Current Tier'],
    search: 'Search here...',
    detail: { url: /\/clients\/\d+$/, heading: 'Client Profile' },
  })
})
