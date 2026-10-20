import { test, listScreenTests } from '../../../support/live/fixtures'

// Real fch-backend-api and local database (see e2e/auth.setup.ts).
test.describe('Sidebar › Intake & Review › Funding Request (live)', () => {
  listScreenTests({
    menu: 'Funding Request',
    group: 'Intake & Review',
    url: /\/intake-review\/funding-request$/,
    heading: 'Funding Requests',
    columns: ['Borrower Name', 'Partner Name', 'Funding Sequence', 'Requested Amount', 'Request Status'],
    search: 'Search borrower or partner name...',
    detail: { url: /\/intake-review\/funding-request\/\d+$/, heading: 'Funding Request Details' },
  })
})
