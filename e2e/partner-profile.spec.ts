import { test, expect, type Page } from '@playwright/test'
import { mockApi, ok, paginated, failure, seedSession, expectCall, confirmDelete, cancelDelete, type ApiMock } from './helpers'

/**
 * A partner's profile beyond the create form: the stats strip, the tabs
 * (documents, client list, tenant config) and the shared file manager the
 * Documents tab opens. partners.spec.ts covers the list and the create form.
 */

const WL = 'White-Label Partner (WL)'
const PARTNER = {
  id: 5, entity_id: 5, full_name: 'Wile Coyote', company_name: 'Acme Funding', email: 'wile@acme.test', phone_number: '(444) 444-4444',
  partner_type: WL, is_host: 0, status: 'active', country: 'United States', subscriptions: [],
}
const STATS = { total_meetings: 7, total_clients: 12, total_invoice: 3, enrollment_type: 'Monthly', total_tickets: 2 }
const ADMIN_PERMS = ['view partners', 'create partners', 'update partners']

async function openProfile(page: Page, tab: string, handlers: Parameters<typeof mockApi>[1] = [], partner = PARTNER, permissions = ADMIN_PERMS): Promise<ApiMock> {
  await seedSession(page, { permissions })
  const api = await mockApi(page, [
    { method: 'GET', match: '/admin/partners-details/5', body: ok(partner) },
    { method: 'POST', match: '/admin/partners-profile-states-details-count/5', body: ok(STATS) },
    ...(handlers ?? []),
  ])
  await page.goto(`/partners/5?tab=${tab}`)
  return api
}

test.describe('Partner profile - header', () => {
  test('loads the partner and shows the stats strip', async ({ page }) => {
    const api = await openProfile(page, 'statusAgent')
    await expectCall(api, 'POST', '/admin/partners-profile-states-details-count/5')
    const strip = page.locator('.metrics-strip')
    await expect(strip).toContainText('Total Clients')
    await expect(strip).toContainText('12')
    await expect(strip).toContainText('Monthly')
  })

  test('missing stats are shown as 0', async ({ page }) => {
    await openProfile(page, 'statusAgent', [{ method: 'POST', match: '/admin/partners-profile-states-details-count/5', body: ok({}) }])
    await expect(page.locator('.metrics-strip')).toContainText('Tickets')
    await expect(page.locator('.metrics-strip')).toContainText('0')
  })

  test('a white-label partner gets the Tenant Config tab', async ({ page }) => {
    await openProfile(page, 'statusAgent')
    await expect(page.locator('.nav-link', { hasText: 'Tenant Config' })).toBeVisible()
  })

  test('a certified partner gets no Tenant Config tab', async ({ page }) => {
    await openProfile(page, 'statusAgent', [], { ...PARTNER, partner_type: 'Certified Partner (CP)' })
    await expect(page.locator('.nav-link', { hasText: 'Status' })).toBeVisible()
    await expect(page.locator('.nav-link', { hasText: 'Tenant Config' })).toHaveCount(0)
  })
})

test.describe('Partner create - defaults', () => {
  test('a new partner is given the next partner id and the plans are loaded', async ({ page }) => {
    await seedSession(page, { permissions: ADMIN_PERMS })
    const api = await mockApi(page, [
      { method: 'GET', match: '/admin/partners/next-id', body: ok({ next_id: 42 }) },
      { method: 'GET', match: '/common/partner-plans', body: ok([{ id: 11, name: 'WL Monthly' }]) },
    ])
    await page.goto('/partners/create')
    await expect(page.getByPlaceholder('Enter full name')).toBeVisible()
    await expectCall(api, 'GET', '/admin/partners/next-id')
    await expectCall(api, 'GET', '/common/partner-plans')
    // Tabs other than the details are locked until the partner exists.
    await expect(page.locator('.nav-link.disabled', { hasText: 'Documents' })).toBeVisible()
  })

  test('an existing partner does not ask for a new id', async ({ page }) => {
    const api = await openProfile(page, 'statusAgent')
    await expectCall(api, 'GET', '/admin/partners-details/5')
    expect(api.find('GET', '/admin/partners/next-id')).toHaveLength(0)
  })
})

test.describe('Partner profile - Documents', () => {
  const DOCS = [
    { id: 81, document_name: 'w9-acme.pdf', file_path: 'partners/5/w9-acme.pdf', size: '88 KB', created_at: '2026-04-02' },
    { id: 82, document_name: 'Shared agreement', file_path: null, share_link: 'https://example.test/agreement', created_at: '2026-04-03' },
  ]
  const handlers = [{ method: 'POST', match: '/admin/partners/fetch-all-documents', body: ok(DOCS) }]
  const row = (page: Page, name: string) => page.locator('tr', { hasText: name })
  const menuOf = async (page: Page, name: string) => {
    await row(page, name).locator('.btn-icon').click()
    return row(page, name).locator('.dropdown-menu')
  }

  test('lists the partner documents, asking for this partner', async ({ page }) => {
    const api = await openProfile(page, 'documents', handlers)
    await expect(row(page, 'w9-acme.pdf')).toContainText('88 KB')
    await expect(row(page, 'Shared agreement')).toContainText('Link')
    const call = await expectCall(api, 'POST', '/admin/partners/fetch-all-documents')
    expect(String(call.json.partner_id)).toBe('5')
  })

  test('shows the empty state', async ({ page }) => {
    await openProfile(page, 'documents', [{ method: 'POST', match: '/admin/partners/fetch-all-documents', body: ok([]) }])
    await expect(page.getByText('No documents found.')).toBeVisible()
  })

  test('a shared link offers Open Link instead of Download', async ({ page }) => {
    await openProfile(page, 'documents', handlers)
    const menu = await menuOf(page, 'Shared agreement')
    await expect(menu.getByText('Open Link')).toBeVisible()
    await expect(menu.getByText('Download')).toHaveCount(0)
  })

  test('Download fetches the file from the API', async ({ page }) => {
    const api = await openProfile(page, 'documents', handlers)
    api.add({ method: 'GET', match: '/admin/partners/documents/download/81', body: 'PDF' })
    await (await menuOf(page, 'w9-acme.pdf')).getByText('Download').click()
    await expectCall(api, 'GET', '/admin/partners/documents/download/81')
  })

  test('Delete removes the document after confirmation and reloads the list', async ({ page }) => {
    const api = await openProfile(page, 'documents', handlers)
    api.add({ method: 'POST', match: '/admin/partners/documents/delete/81', body: ok(null) })
    await expect(row(page, 'w9-acme.pdf')).toBeVisible()
    const loads = api.find('POST', '/admin/partners/fetch-all-documents').length
    await (await menuOf(page, 'w9-acme.pdf')).getByText('Delete').click()
    await confirmDelete(page)
    await expectCall(api, 'POST', '/admin/partners/documents/delete/81')
    await expect(page.getByText('Document deleted successfully')).toBeVisible()
    await expect.poll(() => api.find('POST', '/admin/partners/fetch-all-documents').length).toBeGreaterThan(loads)
  })

  test('closing the confirmation keeps the document', async ({ page }) => {
    const api = await openProfile(page, 'documents', handlers)
    await (await menuOf(page, 'w9-acme.pdf')).getByText('Delete').click()
    await cancelDelete(page)
    expect(api.find('POST', '/admin/partners/documents/delete/')).toHaveLength(0)
  })

  test('a failed delete shows the API message', async ({ page }) => {
    const api = await openProfile(page, 'documents', handlers)
    api.add({ method: 'POST', match: '/admin/partners/documents/delete/81', status: 403, body: failure('You may not delete this document.') })
    await (await menuOf(page, 'w9-acme.pdf')).getByText('Delete').click()
    await confirmDelete(page)
    await expect(page.getByText('You may not delete this document.').first()).toBeVisible()
  })
})

test.describe('Partner profile - file manager', () => {
  const FM_FILES = [
    { name: 'Contracts', isDirectory: true, path: '/Contracts', updatedAt: '2026-04-01' },
    { name: 'w9.pdf', isDirectory: false, path: '/w9.pdf', updatedAt: '2026-04-01', size: 2048 },
  ]
  const TREE = [{ name: 'Contracts', isDirectory: true, path: '/Contracts', updatedAt: '2026-04-01', children: [] }]

  async function openManager(page: Page): Promise<ApiMock> {
    const api = await openProfile(page, 'documents', [
      { method: 'POST', match: '/admin/partners/fetch-all-documents', body: ok([]) },
      { method: 'POST', match: '/filemanager/list', body: ok(FM_FILES) },
      { method: 'POST', match: '/filemanager/tree', body: ok(TREE) },
    ])
    await page.getByRole('button', { name: /add document/i }).click()
    await expect(page.locator('.modal.show').getByText('Select Files')).toBeVisible()
    await expect(page.locator('.fm-grid-item, .fm-list-item', { hasText: 'w9.pdf' })).toBeVisible()
    return api
  }
  const fmItem = (page: Page, name: string) => page.locator('.fm-grid-item, .fm-list-item', { hasText: name }).first()

  test('opens on the partner folder and loads its files and folder tree', async ({ page }) => {
    const api = await openManager(page)
    const list = await expectCall(api, 'POST', '/filemanager/list')
    expect(list.json).toMatchObject({ path: '/', entity_type: 'partners', get_all: false })
    expect(String(list.json.entity_id)).toBe('5')
    const tree = await expectCall(api, 'POST', '/filemanager/tree')
    expect(tree.json).toMatchObject({ entity_type: 'partners' })
    await expect(page.locator('.fm-sidebar')).toContainText('Contracts')
  })

  test('double-clicking a folder opens it', async ({ page }) => {
    const api = await openManager(page)
    await fmItem(page, 'Contracts').dblclick()
    await expect.poll(() => api.find('POST', '/filemanager/list').some((c) => c.json?.path === '/Contracts')).toBe(true)
  })

  test('selecting a file attaches it to the partner', async ({ page }) => {
    const api = await openManager(page)
    api.add({ method: 'POST', match: /\/admin\/partners\/documents$/, body: ok(null) })
    await fmItem(page, 'w9.pdf').click()
    await page.locator('.fm-floating-select-btn').click()
    const call = await expectCall(api, 'POST', /\/admin\/partners\/documents$/)
    expect(call.json).toMatchObject({ file_path: ['/w9.pdf'] })
    expect(String(call.json.partner_id)).toBe('5')
    await expect(page.getByText('Documents uploaded successfully')).toBeVisible()
  })

  test('a failed attach shows the API message', async ({ page }) => {
    const api = await openManager(page)
    api.add({ method: 'POST', match: /\/admin\/partners\/documents$/, status: 422, body: failure('The file is already attached.') })
    await fmItem(page, 'w9.pdf').dblclick()
    await expect(page.getByText('The file is already attached.').first()).toBeVisible()
  })

  test('New Folder creates a folder in the current path', async ({ page }) => {
    const api = await openManager(page)
    api.add({ method: 'POST', match: '/filemanager/folder', body: ok({ name: 'Taxes', isDirectory: true, path: '/Taxes' }) })
    await page.locator('.fm-toolbar-btn', { hasText: 'New Folder' }).click()
    const create = page.locator('.fm-btn-primary', { hasText: /create/i })
    await expect(create).toBeDisabled()
    await page.getByPlaceholder('Enter folder name').fill('Taxes')
    await create.click()
    const call = await expectCall(api, 'POST', '/filemanager/folder')
    expect(call.json).toMatchObject({ name: 'Taxes', path: null, entity_type: 'partners' })
  })

  test('Rename sends the old path and the new name', async ({ page }) => {
    const api = await openManager(page)
    api.add({ method: 'PUT', match: '/filemanager/rename', body: ok({}) })
    await fmItem(page, 'w9.pdf').click({ button: 'right' })
    await page.locator('.fm-context-menu-item', { hasText: 'Rename' }).click()
    const input = page.getByPlaceholder('Enter new name')
    await input.fill('w9-2026.pdf')
    await page.locator('.fm-btn-primary', { hasText: /rename/i }).click()
    const call = await expectCall(api, 'PUT', '/filemanager/rename')
    expect(call.json).toMatchObject({ path: '/w9.pdf', newName: 'w9-2026.pdf', entity_type: 'partners' })
  })

  test('Rename stays disabled while the name is unchanged', async ({ page }) => {
    await openManager(page)
    await fmItem(page, 'w9.pdf').click({ button: 'right' })
    await page.locator('.fm-context-menu-item', { hasText: 'Rename' }).click()
    await expect(page.getByPlaceholder('Enter new name')).toHaveValue('w9.pdf')
    await expect(page.locator('.fm-btn-primary', { hasText: /rename/i })).toBeDisabled()
  })

  test('Copy then Paste copies the item into the current folder', async ({ page }) => {
    const api = await openManager(page)
    api.add({ method: 'POST', match: '/filemanager/paste', body: ok([]) })
    await fmItem(page, 'w9.pdf').click()
    await page.locator('.fm-toolbar-btn', { hasText: 'Copy' }).click()
    await page.locator('.fm-toolbar-btn', { hasText: 'Paste 1 item' }).click()
    const call = await expectCall(api, 'POST', '/filemanager/paste')
    expect(call.json).toMatchObject({ operation: 'copy', destinationPath: '/' })
    expect(call.json.files[0]).toMatchObject({ path: '/w9.pdf' })
  })

  test('Cut then Paste moves the item', async ({ page }) => {
    const api = await openManager(page)
    api.add({ method: 'POST', match: '/filemanager/paste', body: ok([]) })
    await fmItem(page, 'w9.pdf').click()
    await page.locator('.fm-toolbar-btn', { hasText: 'Cut' }).click()
    await page.locator('.fm-toolbar-btn', { hasText: /Paste 1 item/ }).click()
    const call = await expectCall(api, 'POST', '/filemanager/paste')
    expect(call.json.operation).toBe('move')
  })

  test('Delete asks first, then deletes the selected paths', async ({ page }) => {
    const api = await openManager(page)
    api.add({ method: 'POST', match: '/filemanager/delete', body: { success: true } })
    await fmItem(page, 'w9.pdf').click()
    await page.locator('.fm-toolbar-btn-delete').click()
    expect(api.find('POST', '/filemanager/delete')).toHaveLength(0)
    await page.locator('.fm-btn-danger').click()
    const call = await expectCall(api, 'POST', '/filemanager/delete')
    expect(call.json).toMatchObject({ paths: ['/w9.pdf'], entity_type: 'partners' })
  })

  test('Upload sends the chosen file with the current path', async ({ page }) => {
    const api = await openManager(page)
    api.add({ method: 'POST', match: '/filemanager/upload', body: ok({ name: 'bank.pdf', isDirectory: false, path: '/bank.pdf' }) })
    await page.locator('.fm-toolbar-btn', { hasText: 'Upload' }).click()
    await page.locator('.fm-modal input[type="file"]').setInputFiles({ name: 'bank.pdf', mimeType: 'application/pdf', buffer: Buffer.from('%PDF-1.4') })
    await page.locator('.fm-btn-primary', { hasText: 'Upload (1)' }).click()
    const call = await expectCall(api, 'POST', '/filemanager/upload')
    expect(call.body).toContain('bank.pdf')
    expect(call.body).toContain('partners')
    await expect(page.getByText('Files Uploaded Successfully')).toBeVisible()
  })

  test('Upload refuses a file type that is not allowed', async ({ page }) => {
    const api = await openManager(page)
    await page.locator('.fm-toolbar-btn', { hasText: 'Upload' }).click()
    await page.locator('.fm-modal input[type="file"]').setInputFiles({ name: 'setup.exe', mimeType: 'application/octet-stream', buffer: Buffer.from('MZ') })
    await page.locator('.fm-btn-primary', { hasText: 'Upload (1)' }).click()
    await expect(page.getByText('File type "exe" not allowed for "setup.exe".')).toBeVisible()
    expect(api.find('POST', '/filemanager/upload')).toHaveLength(0)
  })

  test('uploading a name that already exists asks what to do', async ({ page }) => {
    const api = await openManager(page)
    await page.locator('.fm-toolbar-btn', { hasText: 'Upload' }).click()
    await page.locator('.fm-modal input[type="file"]').setInputFiles({ name: 'w9.pdf', mimeType: 'application/pdf', buffer: Buffer.from('%PDF-1.4') })
    await page.locator('.fm-btn-primary', { hasText: 'Upload (1)' }).click()
    await expect(page.getByText(/keep both/i)).toBeVisible()
    await page.locator('.fm-modal .fm-btn-secondary', { hasText: /cancel/i }).last().click()
    expect(api.find('POST', '/filemanager/upload')).toHaveLength(0)
  })

  test('a failed folder load is reported', async ({ page }) => {
    const api = await openManager(page)
    api.add({ method: 'POST', match: '/filemanager/list', status: 500, body: failure('boom') })
    await page.locator('.fm-toolbar-btn', { hasText: 'Refresh' }).click()
    await expect(page.getByText('Failed to load files')).toBeVisible()
  })
})

test.describe('Partner profile - Client List', () => {
  const CLIENTS = [{ id: 31, first_name: 'Jane', last_name: 'Doe', business_name: 'Doe Bakery', email: 'jane@doe.test', phone_number: '(111) 111-1111' }]

  test('lists the clients of this partner', async ({ page }) => {
    const api = await openProfile(page, 'clientList', [{ method: 'POST', match: '/admin/partners/fetch-borrowers', body: paginated(CLIENTS) }])
    await expect(page.getByText('Doe Bakery')).toBeVisible()
    const call = await expectCall(api, 'POST', '/admin/partners/fetch-borrowers')
    expect(String(call.json.partner_id)).toBe('5')
    expect(call.json).toMatchObject({ page: 1 })
  })

  test('shows the empty state', async ({ page }) => {
    await openProfile(page, 'clientList', [{ method: 'POST', match: '/admin/partners/fetch-borrowers', body: paginated([]) }])
    await expect(page.getByText('No clients found')).toBeVisible()
  })

  test('clicking a client opens the client profile', async ({ page }) => {
    await openProfile(page, 'clientList', [{ method: 'POST', match: '/admin/partners/fetch-borrowers', body: paginated(CLIENTS) }], PARTNER, [...ADMIN_PERMS, 'view clients'])
    await page.getByText('Doe Bakery').click()
    await expect(page).toHaveURL(/\/clients\/31$/)
  })
})

test.describe('Partner profile - Tenant Config', () => {
  const CONFIG = { active_custom_url: true, partner_domain: 'portal.acme.test', borrower_domain: 'apply.acme.test', partner_subdomain: 'acme' }
  const handlers = [{ method: 'GET', match: '/admin/partners/tenant-config/5', body: ok(CONFIG) }]
  const update = (page: Page) => page.locator('button[form="tenant-config-form"]')

  test('loads the partner tenant configuration', async ({ page }) => {
    const api = await openProfile(page, 'tenantConfig', handlers)
    await expectCall(api, 'GET', '/admin/partners/tenant-config/5')
    await expect(page.locator('input[name="partner_domain"]')).toHaveValue('portal.acme.test')
    await expect(page.locator('input[name="borrower_domain"]')).toHaveValue('apply.acme.test')
    await expect(page.locator('#active_custom_url')).toBeChecked()
  })

  test('Update posts the edited domains', async ({ page }) => {
    const api = await openProfile(page, 'tenantConfig', handlers)
    api.add({ method: 'POST', match: '/admin/partners/tenant-config/5', body: ok({ ...CONFIG, partner_domain: 'crm.acme.test' }) })
    await expect(page.locator('input[name="partner_domain"]')).toHaveValue('portal.acme.test')
    await page.locator('input[name="partner_domain"]').fill('crm.acme.test')
    await update(page).click()
    const call = await expectCall(api, 'POST', '/admin/partners/tenant-config/5')
    expect(call.json).toMatchObject({ active_custom_url: true, partner_domain: 'crm.acme.test', borrower_domain: 'apply.acme.test' })
    await expect(page.getByText('Tenant configuration updated successfully')).toBeVisible()
  })

  test('validation errors are shown against the field', async ({ page }) => {
    const api = await openProfile(page, 'tenantConfig', handlers)
    api.add({ method: 'POST', match: '/admin/partners/tenant-config/5', status: 422, body: failure('Invalid', { partner_domain: 'The partner domain has already been taken.' }) })
    await expect(page.locator('input[name="partner_domain"]')).toHaveValue('portal.acme.test')
    await update(page).click()
    await expect(page.getByText('The partner domain has already been taken.').first()).toBeVisible()
  })

  test('a failed load is reported', async ({ page }) => {
    await openProfile(page, 'tenantConfig', [{ method: 'GET', match: '/admin/partners/tenant-config/5', status: 500, body: failure('boom') }])
    await expect(page.getByText('Failed to fetch tenant configuration')).toBeVisible()
  })

  test('Update is not offered without the update permission', async ({ page }) => {
    await seedSession(page, { permissions: ['view partners'] })
    await mockApi(page, [{ method: 'GET', match: '/admin/partners-details/5', body: ok(PARTNER) }, ...handlers])
    await page.goto('/partners/5?tab=tenantConfig')
    await expect(page.locator('input[name="partner_domain"]')).toHaveValue('portal.acme.test')
    await expect(update(page)).toHaveCount(0)
  })
})
