import { test, expect, type Page } from '@playwright/test'
import { mockApi, ok, paginated, failure, seedSession, expectCall, pickPrime, type ApiMock } from '../../../support/helpers'

const EF = '/common/embed-forms'

test.describe('Embed form settings', () => {
  const CONFIG = {
    form_title: 'Loan Application', is_active: true, allowed_domains: ['https://acme.test'],
    public_key: 'pk_live_abc123', direct_url: 'https://forms.fcf.test/f/pk_live_abc123',
    form_url_available: true,
    embed_script_url: 'https://forms.fcf.test/form/assets/embed.js',
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

  // Partners fit the embed code to their site; the direct link is untouched.
  test('the embed code follows the chosen options and the preview shows them', async ({ page, context }) => {
    await context.grantPermissions(['clipboard-read', 'clipboard-write'])
    await page.route('https://forms.fcf.test/**', (route) => route.fulfill({ contentType: 'text/html', body: '<p>form</p>' }))
    await open(page)
    const code = page.getByLabel('Embed code')
    await expect(code).toHaveValue(/data-fch-embed/)
    await expect(code).toHaveValue(/<script src="https:\/\/forms\.fcf\.test\/form\/assets\/embed\.js" async><\/script>/)

    await page.getByRole('checkbox', { name: /show header/i }).uncheck()
    await page.getByRole('button', { name: 'Background', exact: true }).click()
    await page.getByRole('button', { name: /^transparent/i }).click()
    await expect(code).toHaveValue(/src="https:\/\/forms\.fcf\.test\/f\/pk_live_abc123\?header=0&amp;bg=transparent"/)
    await expect(page.getByTitle('Embed preview')).toHaveAttribute('src', `${CONFIG.direct_url}?header=0&bg=transparent`)

    // A colour code for the background, sent without the '#'.
    await page.getByRole('button', { name: 'Background', exact: true }).click()
    await page.getByRole('button', { name: /^colour code$/i }).click()
    await page.getByLabel('Background colour code').fill('#F5F7FA')
    await expect(code).toHaveValue(/\?header=0&amp;bg=f5f7fa"/)

    // The site's primary colour, also without the '#'.
    await page.getByRole('checkbox', { name: /use my site's primary colour/i }).check()
    await page.getByLabel('Primary colour code').fill('#2D9A96')
    await expect(code).toHaveValue(/bg=f5f7fa&amp;color=2d9a96"/)

    await page.getByRole('radio', { name: /fixed height/i }).check()
    await page.getByLabel('Height in pixels').fill('950')
    await expect(code).toHaveValue(/height="950"/)
    await expect(code).not.toHaveValue(/<script/)

    await page.getByRole('button', { name: /copy embed html/i }).click()
    await expect(page.getByRole('button', { name: /embed code copied/i })).toBeVisible()
    expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(await code.inputValue())
    // The direct link is not changed by any option.
    await expect(page.locator('input[readonly]').first()).toHaveValue(CONFIG.direct_url)
  })

  // Asked in the app's modal (not the browser confirm box), which says what
  // stops working and what to do next.
  test('regenerating the key asks in a modal, and Cancel keeps the key', async ({ page }) => {
    const api = await open(page)
    let browserDialog = false
    page.on('dialog', (d) => { browserDialog = true; return d.dismiss() })
    await page.getByRole('button', { name: /regenerate public key/i }).click()

    const modal = page.locator('.modal.show')
    await expect(modal.getByRole('heading', { name: 'Regenerate the public key?' })).toBeVisible()
    await expect(modal.getByText(/no longer load on any website/i)).toBeVisible()
    await expect(modal.getByText(/Direct Shareable Link also stops working/i)).toBeVisible()
    await modal.getByRole('button', { name: /cancel/i }).click()
    await expect(modal).toHaveCount(0)

    expect(browserDialog).toBe(false)
    expect(api.find('POST', `${EF}/config/generate-key`)).toHaveLength(0)
  })

  test('confirming regenerates the key and reloads the configuration', async ({ page }) => {
    const api = await open(page)
    api.add({ method: 'POST', match: `${EF}/config/generate-key`, body: ok(null, 'Public embed key regenerated successfully.') })
    const before = api.find('GET', `${EF}/config`).length
    await page.getByRole('button', { name: /regenerate public key/i }).click()
    await page.locator('.modal.show').getByRole('button', { name: /yes, regenerate key/i }).click()
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
