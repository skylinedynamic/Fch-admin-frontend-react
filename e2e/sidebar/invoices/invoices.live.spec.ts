import { test, listScreenTests } from '../../support/live/fixtures'

// Real fch-backend-api and local database (see e2e/auth.setup.ts).
test.describe('Sidebar › Invoices (live)', () => {
  listScreenTests({
    menu: 'Invoices',
    url: /\/invoices$/,
    heading: 'Invoices',
    columns: ['Invoice Date', 'Invoice ID', 'Name', 'Amount', 'Status'],
    search: 'Search invoices...',
    detail: { url: /\/invoices\/\d+$/, heading: /^Invoice #/ },
  })
})
