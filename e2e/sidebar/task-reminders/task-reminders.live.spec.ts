import { test, listScreenTests } from '../../support/live/fixtures'

// Real fch-backend-api and local database (see e2e/auth.setup.ts).
test.describe('Sidebar › Task & Reminders (live)', () => {
  listScreenTests({
    menu: 'Task & Reminders',
    url: /\/reminders$/,
    heading: 'Task & Reminder Events',
    columns: ['Reference', 'Subject', 'Client', 'Status'],
    search: 'Search subject or client...',
  })
})
