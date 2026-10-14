import { test, listScreenTests } from '../../../support/live/fixtures'

// Real fch-backend-api and local database (see e2e/auth.setup.ts).
test.describe('Sidebar › CMS › Blogs (live)', () => {
  listScreenTests({
    menu: 'Blogs',
    group: 'CMS',
    url: /\/cms\/blogs$/,
    heading: 'Blogs',
    columns: ['Title & Slug', 'Category', 'Created At', 'Status'],
    search: 'Search blogs, tags, categories, or dates...',
    detail: { url: /\/cms\/blogs\/edit\/\d+$/, heading: 'Edit Blog' },
  })
})
