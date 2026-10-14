import { test, listScreenTests } from '../../support/live/fixtures'

// Real fch-backend-api and local database (see e2e/auth.setup.ts).
test.describe('Sidebar › Employees (live)', () => {
  listScreenTests({
    menu: 'Employees',
    url: /\/employees$/,
    heading: 'Employees',
    columns: ['Employee Name', 'Code', 'Email', 'Department', 'Status'],
    search: 'Search here...',
    detail: { url: /\/employee-details\/\d+$/, heading: 'Employee Details' },
  })
})
