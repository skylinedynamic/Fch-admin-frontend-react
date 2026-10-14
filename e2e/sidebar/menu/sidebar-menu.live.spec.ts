import { test, expect, sidebar, sidebarLink, sidebarGroup } from '../../support/live/fixtures'

// The sidebar itself, for the host account against the real API: which items
// it shows, in order, and the four submenus.
const MENU_ITEMS = [
  'Dashboard', 'Partners', 'Leads', 'Clients', 'Intake & Review', 'Capital Access', 'Lenders',
  'Funding Sequence', 'Credit Builder', 'Commissions', 'Invoices', 'Payments', 'Subscriptions',
  'Upcoming Billings', 'Appointments', 'Task & Reminders', 'Notification', 'Resources', 'Employees',
  'Users', 'Payment Method', 'Plan & Fee', 'Roles & Permissions', 'CMS', 'Embedded Form', 'Settings',
]

const SUBMENUS: Record<string, string[]> = {
  'Intake & Review': ['Pre-Qualification', 'Funding Request', 'Funding Application', 'Change Requests', 'Request Credit Profile'],
  'Credit Builder': ['Manage Tier', 'Verification Center', 'Credit Accounts'],
  CMS: ['Site Settings', 'Blogs', 'SEO Settings'],
  'Embedded Form': ['Configuration', 'Loan Applications'],
}

test.describe('Sidebar menu (live)', () => {
  test('the host sees every menu item in order', async ({ page }) => {
    await page.goto('/')
    const items = sidebar(page).locator(':scope > li.nav-item > .menu-link')
    await expect(items).toHaveCount(MENU_ITEMS.length)
    for (const [i, label] of MENU_ITEMS.entries()) await expect(items.nth(i)).toContainText(label)
  })

  test('no item is locked for the host', async ({ page }) => {
    await page.goto('/')
    await expect(sidebar(page)).toBeVisible()
    await expect(sidebar(page).locator('.locked-item-link')).toHaveCount(0)
  })

  for (const [group, children] of Object.entries(SUBMENUS)) {
    test(`${group} opens its submenu`, async ({ page }) => {
      await page.goto('/')
      const toggle = sidebarGroup(page, group)
      await toggle.click()
      await expect(toggle).toHaveAttribute('aria-expanded', 'true')
      for (const child of children) await expect(sidebarLink(page, child)).toBeVisible()
    })
  }

  test('only the current page is highlighted', async ({ page }) => {
    await page.goto('/invoices')
    await expect(sidebarLink(page, 'Invoices')).toHaveClass(/active/)
    await expect(sidebar(page).locator('a.nav-link.active')).toHaveCount(1)
  })

  test('a submenu opens itself on one of its routes', async ({ page }) => {
    await page.goto('/cms/blogs')
    await expect(sidebarGroup(page, 'CMS')).toHaveAttribute('aria-expanded', 'true')
    await expect(sidebarLink(page, 'Blogs')).toHaveClass(/active/)
  })
})
