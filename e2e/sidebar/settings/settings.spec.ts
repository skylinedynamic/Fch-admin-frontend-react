import { test, expect, type Page } from '@playwright/test'
import { mockApi, ok, failure, seedSession, expectCall, type ApiMock } from '../../support/helpers'

// The settings route itself needs one of these; individual sections are then
// shown or hidden per permission (and, for some, per host / partner type).
const ROUTE = 'update payment settings'
const HOST_PARTNER = { is_host: 1, entity_type: 'Partner', entity_id: 1 }

const section = (page: Page, label: string) => page.locator('.settings-page-wrapper span.fw-medium').getByText(label, { exact: true })

async function open(page: Page, user: Record<string, unknown>, handlers: Parameters<typeof mockApi>[1] = []): Promise<ApiMock> {
  await seedSession(page, user)
  const api = await mockApi(page, handlers)
  await page.goto('/settings')
  await expect(page.locator('.settings-page-title')).toBeVisible()
  return api
}

test.describe('Settings sections', () => {
  test('only the sections the user has permission for are listed', async ({ page }) => {
    await open(page, { permissions: [ROUTE, 'update branding settings'] })
    await expect(section(page, 'Payment Integration')).toBeVisible()
    await expect(section(page, 'Branding')).toBeVisible()
    await expect(section(page, 'Email Configuration')).toHaveCount(0)
    await expect(section(page, 'Agreement Builder')).toHaveCount(0)
    await expect(section(page, 'MicroBilt Config')).toHaveCount(0)
  })

  test('the agreement builder appears with either agreement permission', async ({ page }) => {
    await open(page, { permissions: ['update borrower agreement settings'] })
    await expect(section(page, 'Agreement Builder')).toBeVisible()
  })

  test('host-only sections need both the permission and a host user', async ({ page }) => {
    const permissions = [ROUTE, 'update microbilt settings', 'update credit profile settings', 'update score calculation settings']
    await open(page, { permissions, is_host: 0, partner_id: 5 })
    await expect(section(page, 'MicroBilt Config')).toHaveCount(0)
    await expect(section(page, 'Credit Profile')).toHaveCount(0)
    await expect(section(page, 'Score Calculation')).toHaveCount(0)
  })

  test('a host with the permissions sees the host-only sections', async ({ page }) => {
    const permissions = [ROUTE, 'update microbilt settings', 'update credit profile settings', 'update score calculation settings']
    await open(page, { permissions })
    await expect(section(page, 'MicroBilt Config')).toBeVisible()
    await expect(section(page, 'Credit Profile')).toBeVisible()
    await expect(section(page, 'Score Calculation')).toBeVisible()
  })

  test('OpenAI and Test Mail are reserved for the host partner account', async ({ page }) => {
    await open(page, { permissions: [ROUTE], ...HOST_PARTNER })
    await expect(section(page, 'OpenAI Configuration')).toBeVisible()
    await expect(section(page, 'Test Mail')).toBeVisible()
  })

  test('a host employee does not get OpenAI or Test Mail', async ({ page }) => {
    await open(page, { permissions: [ROUTE], is_host: 1, entity_type: 'Employee' })
    await expect(section(page, 'OpenAI Configuration')).toHaveCount(0)
    await expect(section(page, 'Test Mail')).toHaveCount(0)
  })

  test('a white-label partner gets Test Mail but not OpenAI', async ({ page }) => {
    await open(page, { permissions: [ROUTE], is_host: 0, partner_id: 5, entity_type: 'Partner', partner_type: 'White Label' })
    await expect(section(page, 'OpenAI Configuration')).toHaveCount(0)
  })

  test('choosing a section updates the breadcrumb', async ({ page }) => {
    await open(page, { permissions: [ROUTE, 'update branding settings'] })
    await section(page, 'Branding').click()
    await expect(page.locator('.breadcrumb-item.active')).toHaveText('Site Branding')
  })

  test('the settings page is blocked without any settings permission', async ({ page }) => {
    await seedSession(page, { permissions: [] })
    await mockApi(page)
    await page.goto('/settings')
    await expect(page).toHaveURL(/access-denied/)
  })
})

test.describe('Settings - test mail', () => {
  const SEND = '/notifications/test-email'

  async function openTestMail(page: Page) {
    const api = await open(page, { permissions: [ROUTE], ...HOST_PARTNER })
    await section(page, 'Test Mail').click()
    await expect(page.getByText('Test Email Configuration')).toBeVisible()
    return api
  }
  const email = (page: Page) => page.getByPlaceholder(/Enter recipient email/)
  const body = (page: Page) => page.getByPlaceholder('Write your test message here...')
  const send = (page: Page) => page.getByRole('button', { name: /send test email/i })

  test('recipient and message are required', async ({ page }) => {
    const api = await openTestMail(page)
    await send(page).click()
    await expect(page.getByText('Recipient email is required.')).toBeVisible()
    await expect(page.getByText('Message body is required.')).toBeVisible()
    expect(api.find('POST', SEND)).toHaveLength(0)
  })

  test('a malformed recipient is rejected', async ({ page }) => {
    const api = await openTestMail(page)
    // 'user@host' satisfies the browser's own type=email check, so this reaches the form's stricter rule.
    await email(page).fill('qa@localhost')
    await body(page).fill('Hello')
    await send(page).click()
    await expect(page.getByText('Invalid email address.')).toBeVisible()
    expect(api.find('POST', SEND)).toHaveLength(0)
  })

  test('typing clears the field error', async ({ page }) => {
    await openTestMail(page)
    await send(page).click()
    await expect(page.getByText('Recipient email is required.')).toBeVisible()
    await email(page).fill('qa@example.test')
    await expect(page.getByText('Recipient email is required.')).toHaveCount(0)
  })

  test('a valid test mail is sent and the form resets', async ({ page }) => {
    const api = await openTestMail(page)
    api.add({ method: 'POST', match: SEND, body: ok(null, 'Test email sent successfully.') })
    await email(page).fill('qa@example.test')
    await body(page).fill('Hello from e2e')
    await send(page).click()
    const call = await expectCall(api, 'POST', SEND)
    expect(call.json).toEqual({ email: 'qa@example.test', body: 'Hello from e2e' })
    await expect(page.getByText('Test email sent successfully.')).toBeVisible()
    await expect(email(page)).toHaveValue('')
    await expect(body(page)).toHaveValue('')
  })

  test('a send failure shows the server message and keeps the input', async ({ page }) => {
    const api = await openTestMail(page)
    api.add({ method: 'POST', match: SEND, status: 500, body: failure('SMTP connection refused.') })
    await email(page).fill('qa@example.test')
    await body(page).fill('Hello from e2e')
    await send(page).click()
    await expect(page.getByText('SMTP connection refused.').first()).toBeVisible()
    await expect(email(page)).toHaveValue('qa@example.test')
  })
})

test.describe('Settings - email configuration', () => {
  const CONFIG = {
    id: 1, email_provider: 'smtp', from_address: 'no-reply@fcf.test', smtp_host: 'smtp.fcf.test', smtp_port: 587,
    smtp_encryption: 'tls', smtp_username: 'mailer', smtp_password: 'secret', is_active: 1,
  }
  const BASE = '/common/email-configurations'

  async function openEmail(page: Page, config: Record<string, unknown> | null = CONFIG) {
    const api = await open(page, { permissions: [ROUTE, 'update email configuration settings'] }, [
      { method: 'GET', match: new RegExp(`${BASE}$`), body: ok(config ? [config] : []) },
    ])
    await section(page, 'Email Configuration').click()
    await expect(page.getByPlaceholder('no-reply@domain.com')).toBeVisible()
    return api
  }
  const save = (page: Page) => page.getByRole('button', { name: /save configuration/i })

  test('loads the saved configuration', async ({ page }) => {
    await openEmail(page)
    await expect(page.getByPlaceholder('no-reply@domain.com')).toHaveValue('no-reply@fcf.test')
    await expect(page.getByPlaceholder('smtp.mailtrap.io')).toHaveValue('smtp.fcf.test')
    await expect(page.getByPlaceholder('587')).toHaveValue('587')
  })

  test('a malformed from address is rejected before saving', async ({ page }) => {
    const api = await openEmail(page)
    await page.getByPlaceholder('no-reply@domain.com').fill('no-reply@localhost')
    await save(page).click()
    await expect(page.getByText('The from address must be a valid email address.')).toBeVisible()
    expect(api.find('POST', new RegExp(`${BASE}$`))).toHaveLength(0)
  })

  test('an out-of-range SMTP port is rejected before saving', async ({ page }) => {
    const api = await openEmail(page)
    await page.getByPlaceholder('587').fill('70000')
    await save(page).click()
    await expect(page.getByText('The SMTP port must be a number between 1 and 65535.')).toBeVisible()
    expect(api.find('POST', new RegExp(`${BASE}$`))).toHaveLength(0)
  })

  test('editing the from address clears its error', async ({ page }) => {
    await openEmail(page)
    await page.getByPlaceholder('no-reply@domain.com').fill('bad@localhost')
    await save(page).click()
    await expect(page.getByText('The from address must be a valid email address.')).toBeVisible()
    await page.getByPlaceholder('no-reply@domain.com').fill('ok@fcf.test')
    await expect(page.getByText('The from address must be a valid email address.')).toHaveCount(0)
  })

  test('saving an SMTP configuration omits the id and the AWS keys', async ({ page }) => {
    const api = await openEmail(page)
    api.add({ method: 'POST', match: new RegExp(`${BASE}$`), body: ok(CONFIG) })
    await page.getByPlaceholder('smtp.mailtrap.io').fill('smtp.new.test')
    await save(page).click()
    const call = await expectCall(api, 'POST', new RegExp(`${BASE}$`))
    expect(call.json).toMatchObject({ email_provider: 'smtp', smtp_host: 'smtp.new.test', is_active: true, enable_custom_configuration: true })
    expect(call.json).not.toHaveProperty('id')
    expect(call.json).not.toHaveProperty('aws_access_key')
    await expect(page.getByText('Configuration saved successfully.')).toBeVisible()
  })

  test('server validation errors are shown under the field', async ({ page }) => {
    const api = await openEmail(page)
    api.add({ method: 'POST', match: new RegExp(`${BASE}$`), status: 422, body: failure('Invalid', { from_address: 'The from address domain is not verified.' }) })
    await save(page).click()
    await expect(page.getByText('The from address domain is not verified.')).toBeVisible()
  })

  test('a failed save is reported', async ({ page }) => {
    const api = await openEmail(page)
    api.add({ method: 'POST', match: new RegExp(`${BASE}$`), status: 500, body: failure('boom') })
    await save(page).click()
    await expect(page.getByText('Failed to save configuration.')).toBeVisible()
  })
})

test.describe('MicroBilt Config - client secret', () => {
  // The API's mask (8 dots) and what the field shows instead (16 dots).
  const MASK = '••••••••'
  const SHOWN = '•'.repeat(16)
  const CONFIG = {
    microbilt_mode: 'production', microbilt_base_url_production: 'https://api.microbilt.test',
    microbilt_client_id_production: 'client-id', microbilt_client_secret_production: MASK,
    microbilt_base_url_sandbox: '', microbilt_client_id_sandbox: '', microbilt_client_secret_sandbox: '',
  }

  async function openMicroBilt(page: Page) {
    const api = await open(page, { permissions: [ROUTE, 'update microbilt settings'] }, [
      { method: 'POST', match: /\/common\/app-configurations$/, body: ok(CONFIG) },
    ])
    await section(page, 'MicroBilt Config').click()
    await expect(page.locator('input[name="client_id_production"]')).toHaveValue('client-id')
    return api
  }
  const secret = (page: Page) => page.locator('input[name="client_secret_production"]')
  const save = (page: Page) => page.getByRole('button', { name: /save configuration/i })

  // The API sends only a mask; the field shows 16 dots, so a saved
  // secret looks saved. Left alone, the API's mask goes back and the API keeps it.
  test('a saved secret shows as 16 dots and is kept when left alone', async ({ page }) => {
    const api = await openMicroBilt(page)
    await expect(secret(page)).toHaveAttribute('type', 'password')
    await expect(secret(page)).toHaveValue(SHOWN)

    api.add({ method: 'POST', match: /\/common\/app-configurations\/save$/, body: ok(null) })
    await save(page).click()
    const call = await expectCall(api, 'POST', '/common/app-configurations/save')
    expect(call.json).toMatchObject({ microbilt_client_secret_production: MASK })
  })

  test('clearing the saved secret asks for one and saves nothing', async ({ page }) => {
    const api = await openMicroBilt(page)
    await secret(page).fill('')
    await save(page).click()

    await expect(page.getByText('Client Secret is required.')).toBeVisible()
    expect(api.find('POST', '/common/app-configurations/save')).toHaveLength(0)
  })
})

// R3-BUG-002: the agreement logo picker opened a folder of its own (agreements/{id},
// agreements/1 for a user with no partner), which the API now refuses. It opens the
// partner's own folder, at its base.
test.describe('Agreement Builder logo picker', () => {
  test("opens the partner's own folder at its base", async ({ page }) => {
    const api = await open(page, { permissions: ['update borrower agreement settings'], is_host: 0, partner_id: 42, entity_type: 'Partner', entity_id: 42 }, [
      { method: 'POST', match: '/common/agreement-templates/show', body: ok(null) },
      { method: 'POST', match: '/filemanager/list', body: ok([]) },
      { method: 'POST', match: '/filemanager/tree', body: ok([]) },
    ])

    await section(page, 'Agreement Builder').click()
    await page.getByRole('button', { name: 'Edit Agreement' }).first().click()
    await expect(page.getByRole('button', { name: 'Save Template' })).toBeVisible()
    await page.getByRole('button', { name: 'Add your logo' }).first().click()

    const call = await expectCall(api, 'POST', '/filemanager/list')
    expect(call.json).toMatchObject({ entity_type: 'partners', entity_id: 42, path: '/' })
  })
})
