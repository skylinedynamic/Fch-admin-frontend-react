import { test, listScreenTests } from '../../../support/live/fixtures'

// Real fch-backend-api and local database (see e2e/auth.setup.ts).
test.describe('Sidebar › Credit Builder › Manage Tier (live)', () => {
  listScreenTests({
    menu: 'Manage Tier',
    group: 'Credit Builder',
    url: /\/tiers$/,
    heading: 'Manage Tier',
    columns: ['Name', 'Title', 'Subtitle', 'Order'],
    search: 'Search here...',
    detail: { url: /\/tiers\/\d+$/, heading: 'Edit Tier' },
  })
})
