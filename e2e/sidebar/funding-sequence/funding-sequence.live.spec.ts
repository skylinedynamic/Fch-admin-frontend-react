import { test, listScreenTests } from '../../support/live/fixtures'

// Real fch-backend-api and local database (see e2e/auth.setup.ts).
test.describe('Sidebar › Funding Sequence (live)', () => {
  listScreenTests({
    menu: 'Funding Sequence',
    url: /\/funding$/,
    heading: 'Funding',
    columns: ['Name', 'Group', 'Type', 'Amount', 'Status'],
    search: 'Search here...',
    detail: { url: /\/funding\/\d+$/, heading: 'Edit Funding Sequence' },
  })
})
