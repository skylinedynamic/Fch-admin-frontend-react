import { test, expect, type Page } from '@playwright/test'
import { mockApi, ok, seedSession } from '../../support/helpers'

/**
 * Settings › Agreement Builder in a real browser: the editor opens full screen,
 * merge fields go in from the Insert field menu, blocks are dragged into place
 * (from the palette and by their handle), changes can be undone, and closing
 * with unsaved changes asks first. The API is mocked; nothing is written.
 */

type Saved = { template_html: string; template_json: string } | null

async function openBuilder(page: Page, type: 'partner' | 'borrower' = 'partner'): Promise<{ saved: () => Saved }> {
  await page.setViewportSize({ width: 1600, height: 900 })
  await seedSession(page, { permissions: ['update payment settings', 'update partner agreement settings', 'update borrower agreement settings'] })
  let saved: Saved = null
  await mockApi(page, [
    { method: 'GET', match: '/common/agreement-templates', body: ok([{ id: 8, slug: 'partner', is_active: true }, { id: 9, slug: 'borrower', is_active: true }]) },
    { method: 'POST', match: '/common/agreement-templates/show', body: ok(null) },
    { method: 'POST', match: /\/common\/app-configurations$/, body: ok({ agreement_signing_enabled: '1' }) },
  ])
  await page.route('**/common/agreement-templates/save**', async (route) => {
    saved = route.request().postDataJSON()
    await route.fulfill({ json: ok({ id: 8 }, 'Saved') })
  })
  await page.goto('/settings')
  await page.locator('.settings-page-wrapper span.fw-medium').getByText('Agreement Builder', { exact: true }).click()
  await page.getByRole('button', { name: /Edit Agreement/ }).nth(type === 'partner' ? 0 : 1).click()
  await expect(page.getByRole('dialog', { name: type === 'partner' ? 'Partner agreement' : 'Borrower agreement' })).toBeVisible()
  await expect(page.getByText(type === 'partner' ? 'MASTER PARTNER AGREEMENT' : 'BUSINESS CREDIT BUILDER & FUNDING PROGRAM', { exact: true })).toBeVisible()
  return { saved: () => saved }
}

const blockTypes = (saved: Saved) => (JSON.parse(saved!.template_json).blocks as { type: string }[]).map((b) => b.type)

/** A pointer drag in small steps, as a person drags (one jump does not start an HTML drag reliably). */
async function drag(page: Page, from: { x: number; y: number }, to: { x: number; y: number }) {
  await page.mouse.move(from.x, from.y)
  await page.mouse.down()
  await page.mouse.move(from.x + 15, from.y + 15, { steps: 5 })
  await page.mouse.move(to.x, to.y, { steps: 15 })
  await page.mouse.up()
}

const center = async (page: Page, selector: ReturnType<Page['locator']>) => {
  const box = (await selector.boundingBox())!
  return { x: box.x + box.width / 2, y: box.y + box.height / 2, box }
}

test.describe('Settings - Agreement Builder', () => {
  test('opens full screen over the settings page', async ({ page }) => {
    await openBuilder(page)
    const editor = page.getByRole('dialog', { name: 'Partner agreement' })
    const viewport = page.viewportSize()!
    expect(await editor.boundingBox()).toMatchObject({ x: 0, y: 0, width: viewport.width, height: viewport.height })
  })

  test('inserts a merge field as a chip and saves it as the bare field', async ({ page }) => {
    const { saved } = await openBuilder(page)
    const title = page.locator('.ab4-editor', { hasText: 'MASTER PARTNER AGREEMENT' }).first()
    await title.click()
    await page.keyboard.press('End')
    await page.keyboard.type(' for ')

    await page.getByRole('button', { name: /Insert field/ }).click()
    await page.getByRole('menuitem', { name: "Signer's name" }).click()

    await expect(title.locator('.ab4-merge-chip', { hasText: "Signer's name" })).toBeVisible()
    await page.getByRole('button', { name: 'Save Template' }).click()
    await expect.poll(saved).not.toBeNull()
    expect(saved()!.template_html).toContain('MASTER PARTNER AGREEMENT for {{signer.name}}')
    expect(saved()!.template_html).not.toContain('ab4-merge-chip')
  })

  test('drags a block below another by its handle, and a palette item onto the page', async ({ page }) => {
    const { saved } = await openBuilder(page)
    const header = page.locator('.ab4-block').first()
    const title = page.locator('.ab4-block', { hasText: 'MASTER PARTNER AGREEMENT' }).first()

    await header.hover()
    const handle = await center(page, header.getByRole('button', { name: 'Drag to move' }))
    const target = await center(page, title)
    // Onto the lower part of the title: the header lands after it.
    await drag(page, handle, { x: target.x, y: target.box.y + target.box.height - 4 })

    // A divider from the palette onto the top edge of the title (its upper half
    // means "before") - measured once the page has laid itself out again.
    await expect(page.locator('.ab4-block').first()).toContainText('MASTER PARTNER AGREEMENT')
    await expect.poll(async () => {
      const before = (await title.boundingBox())!.y
      await page.waitForTimeout(150)
      return (await title.boundingBox())!.y === before
    }).toBe(true)
    const divider = await center(page, page.getByRole('button', { name: /Divider/ }))
    const titleNow = await center(page, title)
    await drag(page, divider, { x: titleNow.x, y: titleNow.box.y + 3 })

    await page.getByRole('button', { name: 'Save Template' }).click()
    await expect.poll(saved).not.toBeNull()
    expect(blockTypes(saved()).slice(0, 4)).toEqual(['divider', 'text', 'header', 'text'])
  })

  test('the borrower agreement starts from the terms acknowledgement and saves its merge fields', async ({ page }) => {
    const { saved } = await openBuilder(page, 'borrower')

    await page.getByRole('button', { name: 'Templates' }).click()
    const picker = page.getByRole('dialog', { name: 'Start from a template' })
    await expect(picker.getByRole('button', { name: /Master partner agreement/ })).toHaveCount(0)
    await picker.getByRole('button', { name: /Terms acknowledgement/ }).click()
    await expect(page.getByText('TERMS ACKNOWLEDGEMENT')).toBeVisible()

    await page.getByRole('button', { name: 'Save Template' }).click()
    await expect.poll(saved).not.toBeNull()
    expect(saved()!.template_html).toContain('I, {{signer.name}}, on behalf of {{signer.business_name}}')
    expect(saved()!.template_html).not.toContain('BUSINESS CREDIT BUILDER')
  })

  test('drops a palette block anywhere on an empty page', async ({ page }) => {
    const { saved } = await openBuilder(page)
    await page.getByRole('button', { name: 'Clear All' }).click()
    await page.getByRole('alertdialog').getByRole('button', { name: 'Clear everything' }).click()
    await expect(page.getByText('Empty Agreement')).toBeVisible()

    const tile = await center(page, page.getByRole('button', { name: /Text Block/ }))
    const doc = await center(page, page.locator('.ab4-doc'))
    // Near the top of the page, away from the insert line in the middle.
    await drag(page, tile, { x: doc.x, y: doc.box.y + 120 })

    await expect(page.locator('.ab4-block')).toHaveCount(1)
    await page.getByRole('button', { name: 'Save Template' }).click()
    await expect.poll(saved).not.toBeNull()
    expect(blockTypes(saved())).toEqual(['text'])
  })

  test('undoes a change, and asks before closing with unsaved changes', async ({ page }) => {
    await openBuilder(page)
    await page.getByRole('button', { name: 'Clear All' }).click()
    await page.getByRole('alertdialog', { name: 'Clear the whole agreement?' }).getByRole('button', { name: 'Clear everything' }).click()
    await expect(page.getByText('Empty Agreement')).toBeVisible()
    await expect(page.getByText('Unsaved changes')).toBeVisible()

    await page.getByRole('button', { name: 'Undo' }).click()
    await expect(page.getByText('MASTER PARTNER AGREEMENT', { exact: true })).toBeVisible()

    await page.getByRole('button', { name: 'Clear All' }).click()
    await page.getByRole('alertdialog').getByRole('button', { name: 'Clear everything' }).click()
    await page.getByRole('button', { name: 'Close editor' }).click()
    const ask = page.getByRole('alertdialog', { name: 'Discard unsaved changes?' })
    await ask.getByRole('button', { name: 'Keep editing' }).click()
    await expect(page.getByRole('dialog', { name: 'Partner agreement' })).toBeVisible()

    await page.getByRole('button', { name: 'Close editor' }).click()
    await page.getByRole('alertdialog').getByRole('button', { name: 'Discard changes' }).click()
    await expect(page.getByRole('dialog', { name: 'Partner agreement' })).toHaveCount(0)
    await expect(page.getByText('Partner Agreement Paper')).toBeVisible()
  })
})
