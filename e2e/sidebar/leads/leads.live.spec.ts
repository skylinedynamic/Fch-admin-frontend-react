import { test, listScreenTests } from '../../support/live/fixtures'

// Real fch-backend-api and local database (see e2e/auth.setup.ts).
test.describe('Sidebar › Leads (live)', () => {
  listScreenTests({
    menu: 'Leads',
    url: /\/leads$/,
    heading: 'Leads',
    columns: ['Contact', 'Company Name', 'Email', 'Phone', 'Source'],
    search: 'Search here...',
    detail: { url: /\/leads\/\d+$/, heading: 'Lead Profile' },
  })
})
