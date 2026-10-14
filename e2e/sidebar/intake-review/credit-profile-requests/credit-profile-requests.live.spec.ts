import { test, listScreenTests } from '../../../support/live/fixtures'

// Real fch-backend-api and local database (see e2e/auth.setup.ts).
test.describe('Sidebar › Intake & Review › Request Credit Profile (live)', () => {
  listScreenTests({
    menu: 'Request Credit Profile',
    group: 'Intake & Review',
    url: /\/intake-review\/credit-profile-requests$/,
    heading: 'Request Credit Profile',
    columns: ['Applicant', 'Company', 'Email', 'SSN', 'Status'],
    search: 'Search applicant name, email, phone, or business name...',
    detail: { url: /\/intake-review\/credit-profile-requests\/\d+$/, heading: 'Application Details' },
  })
})
