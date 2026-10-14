import { test, listScreenTests } from '../../support/live/fixtures'

// Real fch-backend-api and local database (see e2e/auth.setup.ts).
test.describe('Sidebar › Partners (live)', () => {
  listScreenTests({
    menu: 'Partners',
    url: /\/partners$/,
    heading: 'Partners',
    columns: ['Company Name', 'Partner Name', 'Email', 'Phone Number', 'Partner Type'],
    search: 'Search here...',
    detail: { url: /\/partners\/\d+$/, heading: /\S/ },
  })
})
