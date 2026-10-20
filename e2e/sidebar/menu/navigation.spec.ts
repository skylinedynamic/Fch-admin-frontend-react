import { test, expect, type Page } from '@playwright/test'
import { mockApi, seedSession } from '../../support/helpers'
import { PERSONA_PROFILES, type PersonaProfileKey } from '../../fixtures/personaProfiles'
import { landingPath } from '../../support/navigation'
import { ROUTES, expectedOutcome } from '../../support/routes'

/**
 * The sidebar: which modules each persona is offered, and that every entry
 * leads to a screen that opens. This is the check that no module in the menu
 * is left without a working, tested destination.
 */

const signInAs = async (page: Page, key: PersonaProfileKey) => {
  const profile = PERSONA_PROFILES[key]
  await seedSession(page, { ...profile.user, permissions: [...profile.user.permissions] })
  await mockApi(page)
}

/** Top-level menu labels, in the order they are shown. */
const topLevel = async (page: Page) => {
  await expect(page.locator('#navbar-nav')).toBeVisible()
  const labels = await page.locator('#navbar-nav > li.nav-item > .menu-link > span:first-of-type').allTextContents()
  return labels.map((label) => label.trim())
}

/** Opens a collapsible menu and returns its sub-item labels. */
const subItems = async (page: Page, parent: string) => {
  const item = page.locator('#navbar-nav > li.nav-item', { has: page.locator('.menu-link > span', { hasText: new RegExp(`^${parent}$`) }) })
  await item.locator('.menu-link').first().click()
  await expect(item.locator('.sidebar-submenu-wrapper')).toHaveClass(/open/)
  return (await item.locator('.sidebar-submenu-wrapper .nav-link').allTextContents()).map((label) => label.trim())
}

// The host's menu, exactly as the product shows it.
const HOST_MENU = [
  'Dashboard', 'Partners', 'Leads', 'Clients', 'Intake & Review', 'Capital Access', 'Lenders', 'Funding Sequence',
  'Credit Builder', 'Commissions', 'Invoices', 'Payments', 'Subscriptions', 'Upcoming Billings', 'Appointments',
  'Task & Reminders', 'Notification', 'Resources', 'Employees', 'Users', 'Payment Method', 'Plan & Fee',
  'Roles & Permissions', 'CMS', 'Embedded Form', 'Settings',
]

// Where each top-level entry (without a submenu) must take the host.
const HOST_LINKS: Record<string, string> = {
  Dashboard: '/', Partners: '/partners', Leads: '/leads', Clients: '/clients', 'Capital Access': '/capital-access',
  Lenders: '/lenders', 'Funding Sequence': '/funding', Commissions: '/commissions', Invoices: '/invoices',
  Payments: '/payments', Subscriptions: '/subscriptions', 'Upcoming Billings': '/billing', Appointments: '/appointments',
  'Task & Reminders': '/reminders', Notification: '/notifications', Resources: '/resources', Employees: '/employees',
  Users: '/users', 'Payment Method': '/payment-methods', 'Plan & Fee': '/plan-and-fee',
  'Roles & Permissions': '/roles-permissions',
}

const HOST_SUBMENUS: Record<string, Record<string, string>> = {
  'Intake & Review': {
    'Pre-Qualification': '/intake-review/pre-qualification',
    'Funding Request': '/intake-review/funding-request',
    'Funding Application': '/intake-review/funding-application',
    'Change Requests': '/intake-review/change-requests',
    'Request Credit Profile': '/intake-review/credit-profile-requests',
  },
  'Credit Builder': {
    'Manage Tier': '/tiers',
    'Verification Center': '/verification-center',
    'Credit Accounts': '/credit-accounts',
  },
  CMS: {
    'Site Settings': '/cms/site-settings',
    Blogs: '/cms/blogs',
    'SEO Settings': '/cms/seo-settings',
  },
  'Embedded Form': {
    Configuration: '/embed-form/settings',
    'Loan Applications': '/embed-form/loan-applications',
  },
}

test.describe('Sidebar - host', () => {
  test.beforeEach(async ({ page }) => {
    await signInAs(page, 'host')
    await page.goto('/')
  })

  test('lists every module, in order', async ({ page }) => {
    expect(await topLevel(page)).toEqual(HOST_MENU)
  })

  // The theme's demo user menu (a fake "Anna Adame" with a "$5971.67" balance and
  // dead links) used to sit in the sidebar with the same id as the header's.
  test('carries no template demo user menu', async ({ page }) => {
    await expect(page.locator('#navbar-nav')).toBeVisible()
    await expect(page.locator('.sidebar-user')).toHaveCount(0)
    await expect(page.locator('#page-header-user-dropdown')).toHaveCount(1)
  })

  for (const [parent, children] of Object.entries(HOST_SUBMENUS)) {
    test(`"${parent}" expands to its screens`, async ({ page }) => {
      expect(await subItems(page, parent)).toEqual(Object.keys(children))
    })
  }

  test('only one submenu is open at a time', async ({ page }) => {
    await subItems(page, 'CMS')
    await subItems(page, 'Credit Builder')
    await expect(page.locator('#navbar-nav .sidebar-submenu-wrapper.open')).toHaveCount(1)
  })
})

test.describe('Sidebar - every host entry opens its screen', () => {
  for (const [label, path] of Object.entries(HOST_LINKS)) {
    test(`${label} -> ${path}`, async ({ page }) => {
      await signInAs(page, 'host')
      await page.goto(path === '/' ? '/profile' : '/')
      await expect(page.locator('#navbar-nav')).toBeVisible()

      await page.locator('#navbar-nav > li.nav-item > a.menu-link', { has: page.locator('span', { hasText: new RegExp(`^${label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`) }) }).click()

      await expect.poll(() => new URL(page.url()).pathname).toBe(path)
      await expect(page.locator('.page-content').first()).toBeVisible()
      await expect(page.getByText(/Access Denied|Page Not Found/i)).toHaveCount(0)
    })
  }

  for (const [parent, children] of Object.entries(HOST_SUBMENUS)) {
    for (const [label, path] of Object.entries(children)) {
      test(`${parent} › ${label} -> ${path}`, async ({ page }) => {
        await signInAs(page, 'host')
        await page.goto('/')
        await subItems(page, parent)

        await page.locator('#navbar-nav .sidebar-submenu-wrapper.open .nav-link', { hasText: new RegExp(`^\\s*${label}\\s*$`) }).click()

        await expect.poll(() => new URL(page.url()).pathname).toBe(path)
        await expect(page.locator('.page-content').first()).toBeVisible()
        await expect(page.getByText(/Access Denied|Page Not Found/i)).toHaveCount(0)
      })
    }
  }

  test('Settings opens the settings screen', async ({ page }) => {
    await signInAs(page, 'host')
    await page.goto('/')
    await page.locator('#navbar-nav > li.nav-item > a.menu-link', { has: page.locator('span', { hasText: /^Settings$/ }) }).click()
    await expect(page.locator('.settings-page-title')).toBeVisible()
    await expect(page.getByText(/Access Denied|Page Not Found/i)).toHaveCount(0)
  })
})

test.describe('Sidebar - per persona', () => {
  const LABELS: Record<PersonaProfileKey, string> = {
    host: 'Host', whiteLabel: 'White-label partner', certified: 'Certified partner',
    hostUser: 'Host user', whiteLabelUser: 'White-label partner user', certifiedUser: 'Certified partner user',
  }

  for (const key of Object.keys(PERSONA_PROFILES) as PersonaProfileKey[]) {
    test(`${LABELS[key]}: no menu entry leads to a blocked screen`, async ({ page }) => {
      const profile = PERSONA_PROFILES[key]
      const user = { ...profile.user, permissions: [...profile.user.permissions] }
      await signInAs(page, key)
      await page.goto('/')
      await expect(page.locator('#navbar-nav')).toBeVisible()

      const hrefs = await page.locator('#navbar-nav a[href^="/"]').evaluateAll((links) =>
        Array.from(new Set(links.map((a) => a.getAttribute('href') || '')))
      )
      const blocked = hrefs.filter((href) => {
        const route = ROUTES.find((r) => r.path === href)
        return route ? expectedOutcome(route, user, profile.subscription) !== 'allowed' : false
      })

      expect(blocked, `${LABELS[key]} is offered menu entries that the route guards then refuse`).toEqual([])
    })
  }

  test('a partner is not offered the host-only modules', async ({ page }) => {
    await signInAs(page, 'whiteLabel')
    await page.goto('/')
    const menu = await topLevel(page)
    for (const hostOnly of ['Partners', 'Capital Access', 'Lenders', 'Funding Sequence', 'Credit Builder', 'Payment Method', 'Plan & Fee', 'CMS']) {
      expect(menu, `"${hostOnly}" must not be offered to a partner`).not.toContain(hostOnly)
    }
    for (const own of ['Dashboard', 'Leads', 'Clients', 'Invoices', 'Payments', 'Employees', 'Users']) {
      expect(menu).toContain(own)
    }
  })

  test('an employee with no permissions still gets the dashboard and notifications', async ({ page }) => {
    await signInAs(page, 'whiteLabelUser')
    await page.goto('/')
    const menu = await topLevel(page)
    expect(menu).toContain('Dashboard')
    expect(menu).toContain('Notification')
    for (const data of ['Clients', 'Leads', 'Users', 'Payments', 'Invoices', 'Settings']) expect(menu).not.toContain(data)
  })
})

test.describe('Routes behind the menu', () => {
  test('/admin/settings is an alias of Settings', async ({ page }) => {
    await signInAs(page, 'host')
    expect(await landingPath(page, '/admin/settings')).toBe('/admin/settings')
    await expect(page.locator('.settings-page-title')).toBeVisible()
  })

  for (const [slug, title] of [['demo-requests', 'Demo Requests'], ['support-tickets', 'Support Tickets'], ['training-courses', 'Training Courses']]) {
    test(`the "${title}" placeholder says it is under construction`, async ({ page }) => {
      await signInAs(page, 'host')
      await page.goto(`/under-construction/${slug}`)
      await expect(page.getByRole('heading', { name: `${title} – Under Construction` })).toBeVisible()
    })
  }

  test('a placeholder is reachable by any signed-in user', async ({ page }) => {
    await signInAs(page, 'certifiedUser')
    expect(await landingPath(page, '/under-construction/support-tickets')).toBe('/under-construction/support-tickets')
  })
})
