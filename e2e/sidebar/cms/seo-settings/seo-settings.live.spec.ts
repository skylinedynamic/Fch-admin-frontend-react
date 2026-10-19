import { test, listScreenTests } from '../../../support/live/fixtures'

// Real fch-backend-api and local database (see e2e/auth.setup.ts).
test.describe('Sidebar › CMS › SEO Settings (live)', () => {
  listScreenTests({
    menu: 'SEO Settings',
    group: 'CMS',
    url: /\/cms\/seo-settings$/,
    heading: 'SEO Settings',
    columns: ['Page Name', 'Path', 'Meta Title'],
    search: 'Search by page name, path, or meta title...',
    detail: { url: /\/cms\/seo-settings\/edit\/\d+$/, heading: 'Edit SEO Settings' },
  })
})
