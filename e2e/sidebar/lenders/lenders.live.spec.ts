import { test, listScreenTests } from '../../support/live/fixtures'

// Real fch-backend-api and local database (see e2e/auth.setup.ts).
test.describe('Sidebar › Lenders (live)', () => {
  listScreenTests({
    menu: 'Lenders',
    url: /\/lenders$/,
    heading: 'Lenders',
    columns: ['Lender Name', 'Legal Name', 'Funding Type', 'Status'],
    search: 'Search lenders...',
    detail: { url: /\/lenders\/\d+$/, heading: 'Edit Lender' },
  })
})
