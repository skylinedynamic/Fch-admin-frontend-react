import { test, expect, type Page } from '@playwright/test'
import { mockApi, ok, failure, seedSession, expectCall, pickPrime, type ApiMock } from './helpers'

const EF = '/common/embed-forms'

test.describe('Embed form settings', () => {
  const CONFIG = {
    form_title: 'Loan Application', is_active: true, allowed_domains: ['https://acme.test'],
    public_key: 'pk_live_abc123', direct_url: 'https://forms.fcf.test/f/pk_live_abc123',
    embed_snippet: '<iframe src="https://forms.fcf.test/f/pk_live_abc123"></iframe>', form_url_available: true,
  }
  const PERMS = ['view configuration', 'update configuration']

  async function open(page: Page, permissions = PERMS, config: Record<string, unknown> = CONFIG): Promise<ApiMock> {
    await seedSession(page, { permissions })
    const api = await mockApi(page, [{ method: 'GET', match: `${EF}/config`, body: ok(config) }])
    await page.goto('/embed-form/settings')
    await expect(page.getByPlaceholder('e.g. Personal Loan Application')).toHaveValue(String(config.form_title))
    return api
  }
  const save = (page: Page) => page.getByRole('button', { name: /save configuration/i })
  const domainBox = (page: Page) => page.getByPlaceholder('https://yourwebsite.com')

  test('loads the title, status, domains, key and link', async ({ page }) => {
    await open(page)
    await expect(page.locator('#formStatusSwitch')).toBeChecked()
    await expect(page.getByText('https://acme.test')).toBeVisible()
    await expect(page.getByText('pk_live_abc123', { exact: true })).toBeVisible()
    await expect(page.locator('input[readonly]').first()).toHaveValue(CONFIG.direct_url)
  })

  test('saving sends the title, status and domains', async ({ page }) => {
    const api = await open(page)
    api.add({ method: 'PUT', match: `${EF}/config`, body: ok(CONFIG, 'Embed form configuration saved successfully.') })
    await page.getByPlaceholder('e.g. Personal Loan Application').fill('Business Loan Application')
    await page.locator('#formStatusSwitch').uncheck()
    await save(page).click()
    const call = await expectCall(api, 'PUT', `${EF}/config`)
    expect(call.json).toEqual({ form_title: 'Business Loan Application', is_active: false, allowed_domains: ['https://acme.test'] })
    await expect(page.getByText('Embed form configuration saved successfully.')).toBeVisible()
  })

  test('an empty title is blocked by the browser before any request', async ({ page }) => {
    const api = await open(page)
    await page.getByPlaceholder('e.g. Personal Loan Application').fill('')
    await save(page).click()
    await page.waitForTimeout(300)
    expect(api.find('PUT', `${EF}/config`)).toHaveLength(0)
  })

  test('a domain can be added and is included in the save', async ({ page }) => {
    const api = await open(page)
    api.add({ method: 'PUT', match: `${EF}/config`, body: ok(CONFIG) })
    await domainBox(page).fill('https://globex.test')
    await page.getByRole('button', { name: /add domain/i }).click()
    await expect(page.getByText('https://globex.test')).toBeVisible()
    await expect(domainBox(page)).toHaveValue('')
    await save(page).click()
    const call = await expectCall(api, 'PUT', `${EF}/config`)
    expect(call.json.allowed_domains).toEqual(['https://acme.test', 'https://globex.test'])
  })

  test('pressing Enter in the domain box adds it without submitting the form', async ({ page }) => {
    const api = await open(page)
    await domainBox(page).fill('https://enter.test')
    await domainBox(page).press('Enter')
    await expect(page.getByText('https://enter.test')).toBeVisible()
    expect(api.find('PUT', `${EF}/config`)).toHaveLength(0)
  })

  test('a duplicate domain is refused with a warning', async ({ page }) => {
    await open(page)
    await domainBox(page).fill('https://acme.test')
    await page.getByRole('button', { name: /add domain/i }).click()
    await expect(page.getByText('Domain is already in the allowed list.')).toBeVisible()
    await expect(page.locator('.badge', { hasText: 'https://acme.test' })).toHaveCount(1)
  })

  test('a blank domain is ignored', async ({ page }) => {
    await open(page)
    await domainBox(page).fill('   ')
    await page.getByRole('button', { name: /add domain/i }).click()
    await expect(page.locator('.btn-close-xs')).toHaveCount(1)
  })

  test('a domain can be removed', async ({ page }) => {
    await open(page)
    await page.locator('.badge', { hasText: 'https://acme.test' }).locator('.btn-close').click()
    await expect(page.getByText('https://acme.test')).toHaveCount(0)
  })

  test('Copy Key switches to a copied state', async ({ page, context }) => {
    await context.grantPermissions(['clipboard-read', 'clipboard-write'])
    await open(page)
    await page.getByRole('button', { name: /copy key/i }).click()
    await expect(page.getByText('Copied').first()).toBeVisible()
    expect(await page.evaluate(() => navigator.clipboard.readText())).toBe('pk_live_abc123')
  })

  test('regenerating the key needs confirmation', async ({ page }) => {
    const api = await open(page)
    page.once('dialog', (d) => d.dismiss())
    await page.getByRole('button', { name: /regenerate public key/i }).click()
    await page.waitForTimeout(300)
    expect(api.find('POST', `${EF}/config/generate-key`)).toHaveLength(0)
  })

  test('confirming regenerates the key and reloads the configuration', async ({ page }) => {
    const api = await open(page)
    api.add({ method: 'POST', match: `${EF}/config/generate-key`, body: ok(null, 'Public embed key regenerated successfully.') })
    const before = api.find('GET', `${EF}/config`).length
    page.once('dialog', (d) => { expect(d.message()).toContain('invalidate your current embed code'); return d.accept() })
    await page.getByRole('button', { name: /regenerate public key/i }).click()
    await expectCall(api, 'POST', `${EF}/config/generate-key`)
    await expect(page.getByText('Public embed key regenerated successfully.')).toBeVisible()
    await expect.poll(() => api.find('GET', `${EF}/config`).length).toBeGreaterThan(before)
  })

  test('a failed save shows the server message', async ({ page }) => {
    const api = await open(page)
    api.add({ method: 'PUT', match: `${EF}/config`, status: 422, body: failure('Configure a custom domain before publishing.') })
    await save(page).click()
    await expect(page.getByText('Configure a custom domain before publishing.').first()).toBeVisible()
  })

  test('saving is disabled while the form has nowhere to be published', async ({ page }) => {
    await open(page, PERMS, { ...CONFIG, form_url_available: false, form_url_warning: 'Set up your custom domain first.' })
    await expect(save(page)).toBeDisabled()
    await expect(page.getByText('Saving is unavailable until the form has a publishing address.')).toBeVisible()
  })

  test('the page is blocked without the view permission', async ({ page }) => {
    await seedSession(page, { permissions: [] })
    await mockApi(page)
    await page.goto('/embed-form/settings')
    await expect(page).toHaveURL(/access-denied/)
  })
})

const SUBMISSIONS = [
  { id: 1401, first_name: 'Ada', last_name: 'Applicant', email: 'ada@example.test', phone: '(555) 140-0001', desired_funding_amount: 75000, status: 'new', created_at: '2026-03-05T10:00:00Z' },
  { id: 1402, first_name: 'Ben', last_name: 'Borrowed', email: 'ben@example.test', phone: '(555) 140-0002', desired_funding_amount: 20000, status: 'converted', created_at: '2026-03-01T10:00:00Z' },
]

test.describe('Loan applications (embed form submissions)', () => {
  const LIST = `${EF}/submissions/fetch`

  async function open(page: Page, permissions = ['view application', 'convert application']): Promise<ApiMock> {
    await seedSession(page, { permissions })
    const api = await mockApi(page, [{ method: 'POST', match: LIST, body: ok({ data: SUBMISSIONS, meta: { total: 2 } }) }])
    await page.goto('/embed-form/loan-applications')
    await expect(page.getByText('ada@example.test')).toBeVisible()
    return api
  }

  test('lists submissions', async ({ page }) => {
    await open(page)
    await expect(page.getByText('ben@example.test')).toBeVisible()
  })

  test('a converted submission shows the Free Plan badge instead of the convert button', async ({ page }) => {
    await open(page)
    const converted = page.locator('tr', { hasText: 'ben@example.test' })
    await expect(converted.getByText('Free Plan')).toBeVisible()
    await expect(converted.getByRole('button', { name: /convert to free plan borrower/i })).toHaveCount(0)
    await expect(page.locator('tr', { hasText: 'ada@example.test' }).getByRole('button', { name: /convert to free plan borrower/i })).toBeVisible()
  })

  test('the convert button is hidden without the convert permission', async ({ page }) => {
    await open(page, ['view application'])
    await expect(page.getByRole('button', { name: /convert to free plan borrower/i })).toHaveCount(0)
  })

  test('search is trimmed and sent to the API', async ({ page }) => {
    const api = await open(page)
    await page.getByPlaceholder('Search here...').fill('  ada  ')
    await page.getByPlaceholder('Search here...').press('Enter')
    await expect.poll(() => api.find('POST', LIST).at(-1)?.json.search).toBe('ada')
  })

  test('shows the empty state', async ({ page }) => {
    await seedSession(page, { permissions: ['view application'] })
    await mockApi(page, [{ method: 'POST', match: LIST, body: ok({ data: [], meta: { total: 0 } }) }])
    await page.goto('/embed-form/loan-applications')
    await expect(page.getByText('No form submissions found')).toBeVisible()
  })

  test('clicking a row opens the application, clicking convert does not', async ({ page }) => {
    await open(page)
    await page.locator('tr', { hasText: 'ada@example.test' }).getByRole('button', { name: /convert to free plan borrower/i }).click()
    await expect(page).toHaveURL(/\/embed-form\/loan-applications$/)
  })

  test('clicking a row opens the application', async ({ page }) => {
    await open(page)
    await page.getByText('ada@example.test').click()
    await expect(page).toHaveURL(/\/embed-form\/loan-applications\/1401$/)
  })

  test('the old /embed-form/submissions URL redirects to the new list', async ({ page }) => {
    await seedSession(page, { permissions: ['view application'] })
    await mockApi(page, [{ method: 'POST', match: LIST, body: ok({ data: SUBMISSIONS, meta: { total: 2 } }) }])
    await page.goto('/embed-form/submissions')
    await expect(page).toHaveURL(/\/embed-form\/loan-applications$/)
  })

  test('an old /embed-form/submissions/:id link redirects to the same application', async ({ page }) => {
    await seedSession(page, { permissions: ['view application'] })
    await mockApi(page, [{ method: 'GET', match: `${EF}/submissions/1401`, body: ok(SUBMISSIONS[0]) }])
    await page.goto('/embed-form/submissions/1401')
    await expect(page).toHaveURL(/\/embed-form\/loan-applications\/1401$/)
  })

  test('the page is blocked without the view permission', async ({ page }) => {
    await seedSession(page, { permissions: [] })
    await mockApi(page)
    await page.goto('/embed-form/loan-applications')
    await expect(page).toHaveURL(/access-denied/)
  })
})

test.describe('Loan application details', () => {
  async function open(page: Page, submission: Record<string, unknown> = SUBMISSIONS[0], permissions = ['view application', 'convert application']): Promise<ApiMock> {
    await seedSession(page, { permissions })
    const api = await mockApi(page, [{ method: 'GET', match: new RegExp(`${EF}/submissions/\\d+$`), body: ok(submission) }])
    await page.goto(`/embed-form/loan-applications/${submission.id}`)
    await expect(page.getByText('Loan Application Details').first()).toBeVisible()
    return api
  }
  const statusDropdown = (page: Page) => page.locator('.p-dropdown').filter({ hasText: /New|Reviewing|Rejected|Converted|Set status/ }).first()

  test('changing the status PUTs it and confirms', async ({ page }) => {
    const api = await open(page)
    api.add({ method: 'PUT', match: `${EF}/submissions/1401/status`, body: ok(null, 'Status updated successfully.') })
    await pickPrime(page, statusDropdown(page), 'Reviewing')
    const call = await expectCall(api, 'PUT', `${EF}/submissions/1401/status`)
    expect(call.json).toEqual({ status: 'reviewing' })
    await expect(page.getByText('Status updated successfully.')).toBeVisible()
  })

  test('a failed status change is rolled back', async ({ page }) => {
    const api = await open(page)
    api.add({ method: 'PUT', match: `${EF}/submissions/1401/status`, status: 500, body: failure('Status service is down.') })
    await pickPrime(page, statusDropdown(page), 'Rejected')
    await expect(page.getByText('Status service is down.').first()).toBeVisible()
    await expect(statusDropdown(page)).toContainText('New')
  })

  test('a converted application locks the status and links to the borrower', async ({ page }) => {
    await open(page, { ...SUBMISSIONS[1], converted_borrower_id: 55, borrower_id: 55 })
    await expect(statusDropdown(page)).toHaveClass(/p-disabled/)
    await expect(page.getByRole('button', { name: /convert to free plan borrower/i })).toHaveCount(0)
  })

  test('the convert button is hidden without the convert permission', async ({ page }) => {
    await open(page, SUBMISSIONS[0], ['view application'])
    await expect(page.getByRole('button', { name: /convert to free plan borrower/i })).toHaveCount(0)
  })

  test('an application that fails to load is reported', async ({ page }) => {
    await seedSession(page, { permissions: ['view application'] })
    await mockApi(page, [{ method: 'GET', match: `${EF}/submissions/999`, status: 404, body: failure('Submission not found.') }])
    await page.goto('/embed-form/loan-applications/999')
    await expect(page.getByText('Submission not found.').first()).toBeVisible()
  })
})
