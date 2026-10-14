import { test, listScreenTests } from '../../../support/live/fixtures'

// Real fch-backend-api and local database (see e2e/auth.setup.ts).
test.describe('Sidebar › Embedded Form › Loan Applications (live)', () => {
  listScreenTests({
    menu: 'Loan Applications',
    group: 'Embedded Form',
    url: /\/embed-form\/loan-applications$/,
    heading: 'Loan Applications',
    columns: ['Applicant', 'Contact Info', 'Desired Funding', 'Status', 'Date Submitted'],
    search: 'Search here...',
    detail: { url: /\/embed-form\/loan-applications\/\d+$/, heading: 'Loan Application Details' },
  })
})
