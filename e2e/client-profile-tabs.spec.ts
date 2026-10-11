import { test, expect, type Page } from '@playwright/test'
import { mockApi, ok, failure, seedSession, expectCall, confirmDelete, cancelDelete, type ApiMock } from './helpers'

/**
 * The tabs of a client (borrower) profile beyond "Client Info":
 * business financials, documents, credit-builder tasks, the credit profile,
 * capital access, the funding catalogue and what the client has raised.
 * clients.spec.ts covers the list and the Client Info tab.
 */

const B = '/common/borrowers'
const CLIENT = {
  id: 1, first_name: 'Johnathan', last_name: 'Smithfield', business_name: 'Smithfield Bakery LLC', email: 'john@example.test',
  phone_number: '(222) 222-2222', status: 'Active', partner_id: 2,
}
const ALL_PERMISSIONS = [
  'view clients', 'update clients', 'update borrower documents status', 'delete borrower documents',
]

async function openTab(page: Page, tab: string, handlers: Parameters<typeof mockApi>[1] = [], permissions = ALL_PERMISSIONS): Promise<ApiMock> {
  await seedSession(page, { permissions })
  const api = await mockApi(page, [
    { method: 'GET', match: new RegExp(`${B}/1$`), body: ok(CLIENT) },
    ...(handlers ?? []),
  ])
  await page.goto('/clients/1')
  await expect(page.locator('#first_name')).toHaveValue('Johnathan')
  await page.locator('.nav-link', { hasText: new RegExp(`^\\s*${tab}\\s*$`) }).first().click()
  return api
}

test.describe('Client profile - Business Financials', () => {
  const FINANCIALS = { monthly_revenue: '25000.00', avg_bank_balance: '8000.00', average_monthly_deposits: '24000.00', monthly_deposit_count: 18, annual_revenue: '300000.00' }

  test('loads the financials from their own endpoint', async ({ page }) => {
    const api = await openTab(page, 'Business Financials', [{ method: 'GET', match: `${B}/business-financials/1`, body: ok(FINANCIALS) }])
    await expect(page.locator('input[name="monthly_revenue"]')).toHaveValue(/25,?000/)
    await expectCall(api, 'GET', `${B}/business-financials/1`)
  })

  test('Update posts the edited financials', async ({ page }) => {
    const api = await openTab(page, 'Business Financials', [{ method: 'GET', match: `${B}/business-financials/1`, body: ok(FINANCIALS) }])
    api.add({ method: 'POST', match: `${B}/1/business-financials`, body: ok(FINANCIALS) })
    await expect(page.locator('input[name="monthly_revenue"]')).toHaveValue(/25,?000/)

    await page.locator('input[name="monthly_deposit_count"]').fill('22')
    await page.locator('.btn.btn-primary.w-lg', { hasText: 'Update' }).click()

    const call = await expectCall(api, 'POST', `${B}/1/business-financials`)
    expect(JSON.stringify(call.json)).toContain('22')
    await expect(page.getByText('Business financials updated successfully')).toBeVisible()
  })

  test('validation errors from the API are shown under the fields', async ({ page }) => {
    const api = await openTab(page, 'Business Financials', [{ method: 'GET', match: `${B}/business-financials/1`, body: ok(FINANCIALS) }])
    api.add({ method: 'POST', match: `${B}/1/business-financials`, status: 422, body: failure('Invalid', { monthly_revenue: 'The monthly revenue must be a number.' }) })
    await expect(page.locator('input[name="monthly_revenue"]')).toHaveValue(/25,?000/)
    await page.locator('.btn.btn-primary.w-lg', { hasText: 'Update' }).click()
    await expect(page.getByText('The monthly revenue must be a number.')).toBeVisible()
  })
})

test.describe('Client profile - Documents', () => {
  const DOCS = [
    { id: 71, document_name: 'bank-statement-jan.pdf', file_path: 'docs/bank-statement-jan.pdf', type: 'Bank Statement', size: '120 KB', created_at: '2026-03-01', status: 'Uploaded' },
  ]
  const handlers = [
    { method: 'POST', match: '/common/borrowers-documents/1', body: ok(DOCS) },
    { method: 'GET', match: '/common/borrower-document-types', body: ok([{ id: 3, name: 'Bank Statement' }]) },
  ]
  const docMenu = async (page: Page) => {
    await page.locator('tr', { hasText: 'bank-statement-jan.pdf' }).locator('button.btn-icon').click()
    return page.locator('.dropdown-menu.show')
  }

  test('lists the client documents and loads the document types', async ({ page }) => {
    const api = await openTab(page, 'Documents', handlers)
    await expect(page.getByText('bank-statement-jan.pdf')).toBeVisible()
    await expect(page.locator('tr', { hasText: 'bank-statement-jan.pdf' })).toContainText('Bank Statement')
    await expectCall(api, 'GET', '/common/borrower-document-types')
  })

  test('shows the empty state', async ({ page }) => {
    await openTab(page, 'Documents', [{ method: 'POST', match: '/common/borrowers-documents/1', body: ok([]) }])
    await expect(page.getByText('No documents found')).toBeVisible()
  })

  test('marking a document as accepted posts the new status', async ({ page }) => {
    const api = await openTab(page, 'Documents', handlers)
    api.add({ method: 'POST', match: '/common/borrowers-documents/update-status/71', body: ok(null) })
    await (await docMenu(page)).getByText('Mark as Accepted').click()
    const call = await expectCall(api, 'POST', '/common/borrowers-documents/update-status/71')
    expect(call.json).toMatchObject({ status: 'Accepted' })
    await expect(page.getByText('Status updated to', { exact: false }).first()).toBeVisible()
  })

  test('rejecting a document requires a reason, which is sent with it', async ({ page }) => {
    const api = await openTab(page, 'Documents', handlers)
    api.add({ method: 'POST', match: '/common/borrowers-documents/update-status/71', body: ok(null) })
    await (await docMenu(page)).getByText('Mark as Rejected').click()

    const submit = page.getByRole('button', { name: 'Reject Document' })
    await expect(submit).toBeDisabled()
    await page.getByPlaceholder('Please explain why this document is being rejected...').fill('Statement is cut off')
    await submit.click()

    const call = await expectCall(api, 'POST', '/common/borrowers-documents/update-status/71')
    expect(call.json).toEqual({ status: 'Rejected', rejection_reason: 'Statement is cut off' })
    await expect(page.getByText('Document rejected with note')).toBeVisible()
  })

  test('deleting a document asks first, then calls the delete endpoint', async ({ page }) => {
    const api = await openTab(page, 'Documents', handlers)
    api.add({ method: 'POST', match: '/common/borrowers-documents-delete/71', body: ok(null) })
    await (await docMenu(page)).getByText('Delete').click()
    await confirmDelete(page)
    await expectCall(api, 'POST', '/common/borrowers-documents-delete/71')
    await expect(page.getByText('Document deleted successfully')).toBeVisible()
  })

  test('closing the delete confirmation keeps the document', async ({ page }) => {
    const api = await openTab(page, 'Documents', handlers)
    await (await docMenu(page)).getByText('Delete').click()
    await cancelDelete(page)
    expect(api.find('POST', '/common/borrowers-documents-delete/')).toHaveLength(0)
  })

  test('a partner without the document permissions is offered only Download', async ({ page }) => {
    await seedSession(page, { permissions: ['view clients', 'update clients', 'view borrower documents'], is_host: 0, partner_id: 2, entity_type: 'Partner' })
    await mockApi(page, [{ method: 'GET', match: new RegExp(`${B}/1$`), body: ok(CLIENT) }, ...handlers])
    await page.goto('/clients/1')
    await expect(page.locator('#first_name')).toHaveValue('Johnathan')
    await page.locator('.nav-link', { hasText: /^\s*Documents\s*$/ }).first().click()
    const menu = await docMenu(page)
    await expect(menu.getByText('Download')).toBeVisible()
    await expect(menu.getByText('Delete')).toHaveCount(0)
    await expect(menu.getByText('Mark as Accepted')).toHaveCount(0)
  })

  // KNOWN BUG (ClientDocumentsSection.tsx): its local hasPermission() returns true for
  // any user with is_host == 1, so a host *employee* holding neither "delete borrower
  // documents" nor "update borrower documents status" can still delete documents and
  // change their status. Remove test.fail() once the check uses the user's permissions.
  test('a host employee without the document permissions is offered only Download', async ({ page }) => {
    test.fail()
    await openTab(page, 'Documents', handlers, ['view clients', 'update clients'])
    const menu = await docMenu(page)
    await expect(menu.getByText('Download')).toBeVisible()
    await expect(menu.getByText('Delete')).toHaveCount(0)
  })

  test('downloading a document requests it from the API', async ({ page }) => {
    const api = await openTab(page, 'Documents', handlers)
    api.add({ method: 'GET', match: '/common/borrowers-documents/download/71', body: ok({}) })
    await page.getByText('bank-statement-jan.pdf').click()
    await expectCall(api, 'GET', '/common/borrowers-documents/download/71')
  })
})

test.describe('Client profile - Task List (credit builder)', () => {
  const CB = '/admin/credit-builder'
  const TIERS = [{
    id: 2, name: 'Tier 1', code: 'T1',
    tasks: [
      { id: 11, title: 'Open a vendor account', status: 'processing', migrated_task_id: 111 },
      { id: 12, title: 'Pay first invoice', status: 'verified', migrated_task_id: 112 },
    ],
  }]
  const handlers = [
    { method: 'POST', match: `${CB}/tiers/borrowers/tier-wise-tasklist`, body: ok(TIERS) },
    { method: 'POST', match: `${CB}/tiers/borrowers/progress`, body: ok({ id: 2, progress: 50 }) },
  ]

  test('shows the tasks of the client current tier', async ({ page }) => {
    const api = await openTab(page, 'Task List', handlers)
    await expect(page.getByText('Open a vendor account')).toBeVisible()
    await expect(page.getByText('Pay first invoice')).toBeVisible()
    expect(api.find('POST', `${CB}/tiers/borrowers/tier-wise-tasklist`)[0].json).toEqual({ borrower_id: '1' })
  })

  test('verifying a task posts it for the client and tier', async ({ page }) => {
    const api = await openTab(page, 'Task List', handlers)
    api.add({ method: 'POST', match: `${CB}/tasks/update-status`, body: ok(null) })
    await page.locator('.cb-task-list-item', { hasText: 'Open a vendor account' }).getByRole('button', { name: 'Verify' }).click()
    await page.locator('.modal.show').getByRole('button', { name: 'Verify' }).click()

    const call = await expectCall(api, 'POST', `${CB}/tasks/update-status`)
    expect(call.json).toMatchObject({ borrower_id: '1', tier_id: 2, tasks: [{ task_id: 11, migrated_task_id: 111 }] })
    await expect(page.getByText('Tasks verified successfully')).toBeVisible()
  })

  test('a verified task offers no actions', async ({ page }) => {
    await openTab(page, 'Task List', handlers)
    await expect(page.locator('.cb-task-list-item', { hasText: 'Pay first invoice' }).getByRole('button', { name: /verify|reject/i })).toHaveCount(0)
  })

  test('a partner sees no Task List tab', async ({ page }) => {
    await seedSession(page, { permissions: ALL_PERMISSIONS, is_host: 0, partner_id: 2 })
    await mockApi(page, [{ method: 'GET', match: new RegExp(`${B}/1$`), body: ok(CLIENT) }])
    await page.goto('/clients/1')
    await expect(page.locator('#first_name')).toHaveValue('Johnathan')
    await expect(page.locator('.nav-link', { hasText: /^\s*Task List\s*$/ })).toHaveCount(0)
  })
})

test.describe('Client profile - Credit Profile', () => {
  // The editor (and its Save button) only appears once there is a report to show.
  const PROFILE = { metrics: { fico_score: 712 }, personal_info: { name: 'Johnathan Smithfield' }, addresses: [], trade_accounts: [], inquiries: [] }

  test('loads the saved credit profile', async ({ page }) => {
    const api = await openTab(page, 'Credit Profile', [{ method: 'GET', match: `${B}/get-credit-profile/1`, body: ok(PROFILE) }])
    await expectCall(api, 'GET', `${B}/get-credit-profile/1`)
    await expect(page.getByRole('button', { name: /save credit profile/i })).toBeVisible()
  })

  test('saving posts the profile', async ({ page }) => {
    const api = await openTab(page, 'Credit Profile', [{ method: 'GET', match: `${B}/get-credit-profile/1`, body: ok(PROFILE) }])
    api.add({ method: 'POST', match: `${B}/save-credit-profile`, body: ok(null) })
    await page.getByRole('button', { name: /save credit profile/i }).click()
    const call = await expectCall(api, 'POST', `${B}/save-credit-profile`)
    expect(call.json).toMatchObject({ addresses: [], trade_accounts: [], inquiries: [] })
    await expect(page.getByText('Credit profile saved successfully!')).toBeVisible()
  })

  test('uploading a PDF parses it and saves the result', async ({ page }) => {
    const api = await openTab(page, 'Credit Profile', [{ method: 'GET', match: `${B}/get-credit-profile/1`, body: ok(null) }])
    api.add({
      method: 'POST', match: `${B}/parse-credit-profile`,
      body: ok({ extracted_data: { metrics: { fico: 712 }, personal_info: { name: 'Johnathan Smithfield' }, addresses: [], trade_accounts: [], inquiries: [] }, pdf_url: 'docs/report.pdf', document_id: 9 }),
    })
    api.add({ method: 'POST', match: `${B}/save-credit-profile`, body: ok(null) })

    await page.locator('input[type="file"][accept="application/pdf"]').first().setInputFiles({ name: 'report.pdf', mimeType: 'application/pdf', buffer: Buffer.from('%PDF-1.4 fake') })

    await expectCall(api, 'POST', `${B}/parse-credit-profile`)
    const save = await expectCall(api, 'POST', `${B}/save-credit-profile`)
    expect(save.json).toMatchObject({ pdf_url: 'docs/report.pdf', document_id: 9 })
    await expect(page.getByText('PDF uploaded and credit profile parsed successfully!')).toBeVisible()
  })

  test('a file that is not a PDF is refused before upload', async ({ page }) => {
    const api = await openTab(page, 'Credit Profile', [{ method: 'GET', match: `${B}/get-credit-profile/1`, body: ok(null) }])
    await page.locator('input[type="file"][accept="application/pdf"]').first().setInputFiles({ name: 'notes.txt', mimeType: 'text/plain', buffer: Buffer.from('hello') })
    await expect(page.getByText('Only PDF files are supported.')).toBeVisible()
    expect(api.find('POST', `${B}/parse-credit-profile`)).toHaveLength(0)
  })
})

test.describe('Client profile - Capital Access', () => {
  test('loads the overview and opens the strategy list on demand', async ({ page }) => {
    const api = await openTab(page, 'Capital Access', [
      { method: 'GET', match: `${B}/1/capital-access-overview`, body: ok({ current_play: null, readiness_score: 70, exposure_breakdown: [{ label: 'Business Cards', max_exposure: 50000 }] }) },
      { method: 'GET', match: `${B}/1/capital-access-strategies`, body: ok({ plays: [] }) },
    ])
    await expectCall(api, 'GET', `${B}/1/capital-access-overview`)
    // The strategies are only requested when the user asks for them.
    expect(api.find('GET', `${B}/1/capital-access-strategies`)).toHaveLength(0)
    await page.getByRole('button', { name: /view strategy list/i }).click()
    await expectCall(api, 'GET', `${B}/1/capital-access-strategies`)
  })
})

test.describe('Client profile - Funding', () => {
  test('the funding sequence tab loads the options available to this client', async ({ page }) => {
    const api = await openTab(page, 'Funding Sequence', [{ method: 'GET', match: '/common/funding-sequencings/client-funding-options/1', body: ok({ groups: [], types: [] }) }])
    await expectCall(api, 'GET', '/common/funding-sequencings/client-funding-options/1')
    await expect(page.getByText('This client has no active funding options available.')).toBeVisible()
  })

  test('lists the funding options grouped for the client', async ({ page }) => {
    await openTab(page, 'Funding Sequence', [{
      method: 'GET', match: '/common/funding-sequencings/client-funding-options/1',
      body: ok({ types: [{ id: 1, name: 'SBA Loan' }], groups: [{ id: 1, name: 'Business Loans', sequencings: [{ id: 201, name: 'SBA 7(a)', funding_type_id: 1, icon: 'ri-bank-line', icon_color: 'blue' }] }] }),
    }])
    await expect(page.getByText('SBA 7(a)').first()).toBeVisible()
  })

  const OPTIONS = (seq: Record<string, unknown>) => ({
    method: 'GET', match: '/common/funding-sequencings/client-funding-options/1',
    body: ok({ types: [{ id: 1, name: 'SBA Loan' }], groups: [{ id: 1, name: 'Business Loans', sequencings: [{ id: 201, name: 'SBA 7(a)', funding_type_id: 1, icon: 'ri-bank-line', icon_color: 'blue', ...seq }] }] }),
  })
  const READINESS = '/common/funding-qualification/client-readiness-factors/1/201'

  test('opening an option loads the client readiness factors for it', async ({ page }) => {
    const api = await openTab(page, 'Funding Sequence', [
      OPTIONS({}),
      { method: 'GET', match: READINESS, body: ok([{ label: 'Credit Score', status: 'Strong' }, { label: 'Time in Business', status: 'Weak' }]) },
    ])
    await page.locator('.funding-card', { hasText: 'SBA 7(a)' }).click()
    await expectCall(api, 'GET', READINESS)
    await expect(page.getByText('Underwriting Factors')).toBeVisible()
    await expect(page.getByText('Time in Business')).toBeVisible()
    await expect(page.getByText('No strong qualifying factors available.')).toHaveCount(0)
  })

  test('without strong factors the detail says so', async ({ page }) => {
    await openTab(page, 'Funding Sequence', [OPTIONS({}), { method: 'GET', match: READINESS, body: ok([{ label: 'Time in Business', status: 'Weak' }]) }])
    await page.locator('.funding-card', { hasText: 'SBA 7(a)' }).click()
    await expect(page.getByText('No strong qualifying factors available.')).toBeVisible()
  })

  test('a failed readiness load is reported', async ({ page }) => {
    await openTab(page, 'Funding Sequence', [OPTIONS({}), { method: 'GET', match: READINESS, status: 500, body: failure('boom') }])
    await page.locator('.funding-card', { hasText: 'SBA 7(a)' }).click()
    await expect(page.getByText('Failed to load readiness factors')).toBeVisible()
  })

  test('Back returns to the list of options', async ({ page }) => {
    await openTab(page, 'Funding Sequence', [OPTIONS({}), { method: 'GET', match: READINESS, body: ok([]) }])
    await page.locator('.funding-card', { hasText: 'SBA 7(a)' }).click()
    await page.getByRole('button', { name: /Back/ }).last().click()
    await expect(page.locator('.funding-card', { hasText: 'SBA 7(a)' })).toBeVisible()
  })

  test('a locked option cannot be opened', async ({ page }) => {
    const api = await openTab(page, 'Funding Sequence', [OPTIONS({ engine_status: 'Locked' })])
    await page.locator('.funding-card', { hasText: 'SBA 7(a)' }).click()
    await expect(page.locator('.funding-card', { hasText: 'SBA 7(a)' })).toHaveClass(/funding-card-disabled/)
    expect(api.find('GET', READINESS)).toHaveLength(0)
  })

  test('the funding requests tab lists what this client raised', async ({ page }) => {
    const api = await openTab(page, 'Funding Requests', [{ method: 'POST', match: /\/common\/funding-request$/, body: ok({ data: [] }) }])
    const call = await expectCall(api, 'POST', /\/common\/funding-request$/)
    expect(call.json).toMatchObject({ borrower_id: '1' })
    await expect(page.getByText('No funding requests have been raised for this client yet.')).toBeVisible()
  })

  test('the funding applications tab lists this client applications', async ({ page }) => {
    const api = await openTab(page, 'Funding Applications', [{ method: 'POST', match: /\/request-application\/funding-application$/, body: ok({ data: [] }) }])
    const call = await expectCall(api, 'POST', /\/request-application\/funding-application$/)
    expect(call.json).toMatchObject({ borrower_id: '1' })
  })

  test('a failed funding request load is reported', async ({ page }) => {
    await openTab(page, 'Funding Requests', [{ method: 'POST', match: /\/common\/funding-request$/, status: 500, body: failure('Funding requests are unavailable.') }])
    await expect(page.getByText('Funding requests are unavailable.').first()).toBeVisible()
  })
})
