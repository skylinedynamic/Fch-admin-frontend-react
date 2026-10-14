import { test, listScreenTests } from '../../support/live/fixtures'

// Real fch-backend-api and local database (see e2e/auth.setup.ts).
test.describe('Sidebar › Users (live)', () => {
  listScreenTests({
    menu: 'Users',
    url: /\/users$/,
    heading: 'Users',
    columns: ['User Name', 'Phone', 'Email', 'Role', 'Status'],
    search: 'Search here...',
    detail: { url: /\/user-details\/\d+$/, heading: 'User Details' },
  })
})
