import { test, listScreenTests } from '../../../support/live/fixtures'

// Real fch-backend-api and local database (see e2e/auth.setup.ts).
test.describe('Sidebar › Intake & Review › Pre-Qualification (live)', () => {
  listScreenTests({
    menu: 'Pre-Qualification',
    group: 'Intake & Review',
    url: /\/intake-review\/pre-qualification$/,
    heading: 'Pre-Qualification Applications',
    columns: ['Name', 'Business Name', 'Funding Type', 'Requested Amount', 'Status'],
    search: 'Search here...',
    detail: { url: /\/intake-review\/pre-qualification\/\d+$/, heading: 'Application Details' },
  })
})
