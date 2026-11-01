import { test, expect, type Page } from '@playwright/test'
import { mockApi, ok, seedSession, expectCall, type ApiMock } from '../../support/helpers'

// Client › Documents tab: documents grouped by category, the required ones
// first with where each stands, and an Upload straight into a category.

const CLIENT = {
  id: 1, first_name: 'Johnathan', last_name: 'Smithfield', business_name: 'Smithfield Bakery LLC',
  email: 'borrower@example.test', phone_number: '(222) 222-2222', partner_id: 2, status: 'active',
}
const TYPES = [
  { id: 1, name: 'Driver’s License', sort_order: 1, is_required: true },
  { id: 2, name: 'Voided Business Check', sort_order: 2, is_required: true },
  { id: 3, name: 'EIN / Corporation Docs', sort_order: 3, is_required: true },
  { id: 4, name: 'Business Bank Statements', sort_order: 4, is_required: true },
  { id: 5, name: 'Business Plan', sort_order: 5, is_required: false },
  { id: 6, name: 'Tax Returns', sort_order: 6, is_required: false },
]
const doc = (id: number, type: string, status: string, extra: Record<string, unknown> = {}) => ({
  id, document_name: `qa-file-${id}.pdf`, document_number: `DOC-00${id}`, type, size: '4.45 KB', date: '2026-10-29', status, file_path: `borrowers/1/qa-file-${id}.pdf`, ...extra,
})
const DOCUMENTS = [
  doc(11, 'Driver’s License', 'Accepted'),
  doc(12, 'Voided Business Check', 'Rejected', { rejection_reason: 'Not readable' }),
  doc(13, 'EIN / Corporation Docs', 'Uploaded'),
  doc(14, 'Business Plan', 'Uploaded'),
]

async function openDocuments(page: Page, documents: unknown[] = DOCUMENTS): Promise<ApiMock> {
  await seedSession(page, { permissions: ['view clients', 'update clients', 'view borrower documents', 'upload borrower documents', 'update borrower documents status', 'delete borrower documents'] })
  const api = await mockApi(page, [
    { method: 'GET', match: /\/common\/borrowers\/1$/, body: ok(CLIENT) },
    { method: 'GET', match: '/common/borrower-document-types', body: ok(TYPES) },
    { method: 'POST', match: /\/common\/borrowers-documents\/1$/, body: ok(documents) },
    { method: 'POST', match: '/common/activity-logs/fetch-all-activities', body: ok([]) },
  ])
  await page.goto('/clients/1')
  await page.getByRole('tab', { name: 'Documents' }).click()
  return api
}

const category = (page: Page, name: string) => page.getByRole('rowgroup', { name })

test.describe('Client › Documents tab, by category', () => {
  test('each file sits in its category group, the required ones first, each saying where it stands', async ({ page }) => {
    await openDocuments(page)

    await expect(category(page, 'Driver’s License')).toContainText('qa-file-11.pdf')
    await expect(category(page, 'Driver’s License').locator('.cdoc-state')).toHaveText('Accepted')
    await expect(category(page, 'Voided Business Check').locator('.cdoc-state')).toHaveText('Re-upload needed')
    await expect(category(page, 'Voided Business Check')).toContainText('Not readable')
    await expect(category(page, 'EIN / Corporation Docs').locator('.cdoc-state')).toHaveText('In review')
    await expect(category(page, 'Business Bank Statements').locator('.cdoc-state')).toHaveText('Missing')
    await expect(category(page, 'Business Plan')).toContainText('Optional')

    const titles = await page.locator('.cdoc-group-name').allTextContents()
    expect(titles.slice(0, 4)).toEqual(['Driver’s License', 'Voided Business Check', 'EIN / Corporation Docs', 'Business Bank Statements'])
  })

  // The table had a border round every row, tag and button. Each category is now
  // its own block: a gap above it and an edge in its state's colour, and no
  // boxes inside it.
  test('sets each category apart as its own block, without boxes inside it', async ({ page }) => {
    await openDocuments(page)

    const head = category(page, 'Voided Business Check').locator('.cdoc-group-head > th')
    await expect(head).toHaveCSS('border-top-width', '10px')
    await expect(head).toHaveCSS('box-shadow', /rgb\(240, 101, 72\) 3px 0px 0px 0px inset/)

    await expect(category(page, 'Voided Business Check').getByRole('button', { name: 'Upload to Voided Business Check' })).toHaveCSS('border-top-width', '0px')
    await expect(category(page, 'Driver’s License').locator('.cdoc-tag')).toHaveCSS('border-top-width', '0px')
    await expect(category(page, 'Driver’s License').locator('.cdoc-file-row > td').first()).toHaveCSS('border-bottom-width', '0px')
  })

  // The table was pulled up under the card header (Velzon's .table-card margin),
  // so the header's dashed line ran through the column titles.
  test("the table starts under the card header, not over its dashed line", async ({ page }) => {
    await openDocuments(page)

    const header = await page.locator('.cdoc > .card-header').boundingBox()
    const table = await page.locator('.cdoc-table thead').boundingBox()
    expect(table!.y).toBeGreaterThanOrEqual(header!.y + header!.height)
  })

  test('sums up the required categories, and leaves empty optional ones out', async ({ page }) => {
    await openDocuments(page)

    await expect(page.getByLabel('Documents summary')).toContainText('2 of 4 required categories complete')
    await expect(page.getByLabel('Documents summary')).toContainText('1 Rejected')
    await expect(category(page, 'Tax Returns')).toHaveCount(0)
    await expect(page.getByText('Tax Returns')).toHaveCount(0)
  })

  test('with no documents, one empty state lists the required ones to upload', async ({ page }) => {
    await openDocuments(page, [])

    const empty = page.getByRole('region', { name: 'No documents uploaded yet' })
    await expect(empty).toBeVisible()
    await expect(page.getByRole('table')).toHaveCount(0)
    await expect(page.getByLabel('Documents summary')).toContainText('0 of 4 required categories complete')
    await expect(page.getByLabel('Documents summary')).not.toContainText('Accepted')

    await empty.getByRole('button', { name: 'Upload Voided Business Check' }).click()
    await expect(page.locator('.modal.show')).toBeVisible()
  })

  test("a category's own Upload opens the file manager for that category", async ({ page }) => {
    await openDocuments(page)

    await category(page, 'Business Bank Statements').getByRole('button', { name: /Upload to/ }).click()
    await expect(page.locator('.modal.show')).toBeVisible()
  })

  test('Add Document picks the category from the custom select and opens the file manager', async ({ page }) => {
    await openDocuments(page)

    const add = page.getByRole('button', { name: 'Add Document' })
    await expect(add).toHaveClass(/btn-primary/)
    await add.click()

    const dialog = page.getByRole('dialog', { name: 'Add Document' })
    await expect(dialog.locator('select')).toHaveCount(0)
    await dialog.getByRole('button', { name: 'Driver’s License' }).click()
    await dialog.getByRole('button', { name: 'Tax Returns' }).click()
    await expect(dialog.getByRole('button', { name: 'Tax Returns' })).toBeVisible()

    await dialog.getByRole('button', { name: /choose files/i }).click()
    await expect(page.locator('.modal.show').filter({ has: page.locator('.fm-grid, .fm-list, .modal-body') }).last()).toBeVisible()
  })

  test('the status actions are still on each file', async ({ page }) => {
    const api = await openDocuments(page)
    api.add({ method: 'POST', match: /\/common\/borrowers-documents\/update-status\/13$/, body: ok(null, 'Status updated') })

    await category(page, 'EIN / Corporation Docs').getByRole('button', { name: 'Document actions' }).click()
    await page.getByRole('menuitem', { name: /Mark as Accepted/ }).click()

    const call = await expectCall(api, 'POST', /\/common\/borrowers-documents\/update-status\/13$/)
    expect(call.json).toMatchObject({ status: 'Accepted' })
  })
})
