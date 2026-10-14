import { test, listScreenTests } from '../../support/live/fixtures'

// Real fch-backend-api and local database (see e2e/auth.setup.ts).
test.describe('Sidebar › Capital Access (live)', () => {
  listScreenTests({
    menu: 'Capital Access',
    url: /\/capital-access$/,
    heading: 'Capital Access',
    columns: ['Program Name', 'Target Exposure', 'Status'],
    search: 'Search capital programs...',
    detail: { url: /\/capital-access\/\d+$/, heading: 'Edit Capital Program' },
  })
})
