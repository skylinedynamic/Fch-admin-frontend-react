import { test, listScreenTests } from '../../../support/live/fixtures'

// Real fch-backend-api and local database (see e2e/auth.setup.ts).
test.describe('Sidebar › Intake & Review › Change Requests (live)', () => {
  listScreenTests({
    menu: 'Change Requests',
    group: 'Intake & Review',
    url: /\/intake-review\/change-requests$/,
    heading: 'Change Requests',
    columns: ['Borrower', 'Field', 'Old Value', 'New Value', 'Status'],
    search: 'Search borrower name...',
  })
})
