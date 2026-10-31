import { test, expect, openFromSidebar, dataRows, pageHeading } from '../../support/live/fixtures'

// Real API, nothing written: only opens the picker.
//
// BUG-005 (QA round 2): Clients › Add/Edit Client offered every past date of
// birth, and a 17-year-old (01 Jan 2009) and a 106-year-old were saved. The
// picker now offers 18 to 120 years old only - the range the API refuses
// outside of (App\Rules\AdultDateOfBirth).
test.describe('Sidebar › Clients › Client Profile — date of birth range (live)', () => {
  test('the date of birth picker offers years from 120 to 18 years ago only', async ({ page }) => {
    await openFromSidebar(page, 'Clients', /\/clients$/)
    await dataRows(page).first().click()
    await expect(page).toHaveURL(/\/clients\/\d+$/)
    await expect(pageHeading(page, 'Client Profile')).toBeVisible()

    await page.locator('#date_of_birth input').click()
    const panel = page.locator('.p-datepicker').first()
    await expect(panel).toBeVisible()

    const years = await panel
      .locator('.fp-yd-list[data-kind="year"] .fp-yd-opt')
      .evaluateAll((opts) => opts.map((o) => Number(o.getAttribute('data-value'))))

    const thisYear = new Date().getFullYear()
    expect(Math.max(...years)).toBe(thisYear - 18)
    // The earliest day is the day after the 121st birthday, so in that year
    // (or the next, on 31 December).
    expect(Math.min(...years)).toBeGreaterThanOrEqual(thisYear - 121)
    expect(Math.min(...years)).toBeLessThanOrEqual(thisYear - 120)
    // QA's 2009: 17 at the time of the report, and not on offer.
    expect(years).not.toContain(thisYear - 17)
  })
})
