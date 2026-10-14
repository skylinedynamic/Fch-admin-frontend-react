import { test, expect, listScreenTests, dataRows, emptyTableMessage, tableSettled, pageHeading } from '../../../support/live/fixtures'

// Real fch-backend-api and local database (see e2e/auth.setup.ts).
test.describe('Sidebar › Intake & Review › Funding Application (live)', () => {
  listScreenTests({
    menu: 'Funding Application',
    group: 'Intake & Review',
    url: /\/intake-review\/funding-application$/,
    heading: 'Funding Applications',
    columns: ['Name', 'App No', 'Industry Type', 'Requested Amount'],
    search: 'Search here...',
    detail: { url: /\/intake-review\/funding-application\/\d+$/, heading: 'Funding Application Details' },
  })

  test('the host opens the document audit history from an application', async ({ page }) => {
    await expect(tableSettled(page)).toBeVisible()
    test.skip(await emptyTableMessage(page).isVisible(), 'No funding applications in the local database')
    await dataRows(page).first().locator('td').nth(1).click()
    await page.getByRole('link', { name: /Audit History/ }).click()
    await expect(page).toHaveURL(/\/intake-review\/funding-application\/\d+\/audit-history$/)
    await expect(pageHeading(page, 'Document Audit History')).toBeVisible()
    await expect(page.getByPlaceholder('Search history...')).toBeVisible()
  })
})
