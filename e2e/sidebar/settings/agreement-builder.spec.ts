import { test, expect, type Page } from '@playwright/test'
import { mockApi, ok, seedSession } from '../../support/helpers'

/**
 * Settings › Agreement Builder in a real browser: the editor opens full screen,
 * merge fields go in from the Insert Dynamic Value menu, blocks are dragged into place
 * (from the palette and by their handle), changes can be undone, and closing
 * with unsaved changes asks first. The API is mocked; nothing is written.
 */

type Saved = { template_html: string; template_json: string } | null

// Plan & Fee dynamic values as the API lists them per agreement type (fch-api AgreementPlanFields).
// The partner agreement also offers the signing partner's commission tiers as a table (fch-api AgreementCommissionFields).
const COMMISSION_TABLE_SAMPLE = '<table class="ab-commission-table"><thead><tr><th>From (funded deals)</th><th>To</th><th>Commission</th></tr></thead>'
  + '<tbody><tr><td>0</td><td>10</td><td>$1,500</td></tr><tr><td>11</td><td>and up</td><td>27.5%</td></tr></tbody></table>'
const PLAN_FIELDS: Record<'partner' | 'borrower', { key: string; label: string; group: string; sample: string; html?: boolean }[]> = {
  partner: [
    { key: 'signer.commission_table', label: "Partner's commission tiers", group: 'Signer', sample: COMMISSION_TABLE_SAMPLE, html: true },
    { key: 'plan.partner_enrollment.certified_partner.one_time_payment.total_amount', label: 'Certified Partner · One Time Payment: Total amount', group: 'Plan & Fee: Partner enrollment', sample: '$4,997.00' },
    { key: 'plan.user_seat.certified_partner.monthly.total_amount', label: 'Certified Partner · Monthly: Monthly seat fee', group: 'Plan & Fee: User seats', sample: '$49.00' },
    { key: 'plan.user_seat.certified_partner.monthly.free_seats', label: 'Certified Partner · Monthly: Free seats', group: 'Plan & Fee: User seats', sample: '3' },
    { key: 'plan.borrower_enrollment.installment.total_amount', label: 'Installment: Total amount', group: 'Plan & Fee: Borrower enrollment', sample: '$3,000.00' },
  ],
  borrower: [
    { key: 'plan.borrower_enrollment.installment.total_amount', label: 'Installment: Total amount', group: 'Plan & Fee: Borrower enrollment', sample: '$3,000.00' },
  ],
}

async function openBuilder(page: Page, type: 'partner' | 'borrower' = 'partner'): Promise<{ saved: () => Saved }> {
  await page.setViewportSize({ width: 1600, height: 900 })
  await seedSession(page, { permissions: ['update payment settings', 'update partner agreement settings', 'update borrower agreement settings'] })
  let saved: Saved = null
  await mockApi(page, [
    { method: 'GET', match: '/common/agreement-templates', body: ok([{ id: 8, slug: 'partner', is_active: true }, { id: 9, slug: 'borrower', is_active: true }]) },
    { method: 'POST', match: '/common/agreement-templates/show', body: ok(null) },
    { method: 'POST', match: /\/common\/app-configurations$/, body: ok({ agreement_signing_enabled: '1' }) },
    // Templates › Your templates: none saved (not the agreement list above, whose path it shares).
    { method: 'GET', match: '/common/agreement-templates/saved', body: ok([]) },
  ])
  await page.route('**/common/agreement-templates/merge-fields**', async (route) => {
    const { type } = route.request().postDataJSON() as { type: 'partner' | 'borrower' }
    await route.fulfill({ json: ok(PLAN_FIELDS[type] ?? []) })
  })
  // /save and /save/{id} only: a `save**` glob also caught /saved (Save as Template).
  await page.route(/\/common\/agreement-templates\/save(\/\d+)?$/, async (route) => {
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

    await page.getByRole('button', { name: /Insert Dynamic Value/ }).click()
    await page.getByRole('menuitem', { name: "Signer's name" }).click()

    await expect(title.locator('.ab4-merge-chip', { hasText: "Signer's name" })).toBeVisible()
    await page.getByRole('button', { name: 'Save Agreement' }).click()
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

    await page.getByRole('button', { name: 'Save Agreement' }).click()
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

    await page.getByRole('button', { name: 'Save Agreement' }).click()
    await expect.poll(saved).not.toBeNull()
    expect(saved()!.template_html).toContain('I, {{signer.name}}, on behalf of {{signer.business_name}}')
    expect(saved()!.template_html).not.toContain('BUSINESS CREDIT BUILDER')
  })

  // "Insert Dynamic Value" sits in its own section at the top of the right panel,
  // so an empty page can take one too: it comes in a new text block.
  test('adds a dynamic value to an empty page from the top of the right panel', async ({ page }) => {
    const { saved } = await openBuilder(page)
    await page.getByRole('button', { name: 'Clear All' }).click()
    await page.getByRole('alertdialog').getByRole('button', { name: 'Clear everything' }).click()
    await expect(page.getByText('Empty Agreement')).toBeVisible()

    const section = page.locator('.ab4-props > .ab4-dynamic-values')
    await expect(section).toBeVisible()
    await expect(page.locator('.ab4-props').locator(':scope > *').first()).toHaveClass(/ab4-dynamic-values/)
    await section.getByRole('button', { name: /Insert Dynamic Value/ }).click()
    await page.locator('.ab4-insert-popover').getByRole('menuitem', { name: "Signer's business name" }).click()

    await expect(page.locator('.ab4-block')).toHaveCount(1)
    await expect(page.locator('.ab4-doc .ab4-merge-chip', { hasText: "Signer's business name" })).toBeVisible()
    await page.getByRole('button', { name: 'Save Agreement' }).click()
    await expect.poll(saved).not.toBeNull()
    expect(blockTypes(saved())).toEqual(['text'])
    expect(saved()!.template_html).toContain('{{signer.business_name}}')
  })

  test('finds a Plan & Fee value by search and saves it as its field', async ({ page }) => {
    const { saved } = await openBuilder(page)
    await page.getByRole('button', { name: 'Clear All' }).click()
    await page.getByRole('alertdialog').getByRole('button', { name: 'Clear everything' }).click()
    await expect(page.getByText('Empty Agreement')).toBeVisible()

    const section = page.locator('.ab4-props > .ab4-dynamic-values')
    await section.getByRole('button', { name: /Insert Dynamic Value/ }).click()
    const popover = page.locator('.ab4-insert-popover')
    const search = popover.getByRole('searchbox', { name: 'Search dynamic values' })
    await expect(search).toBeFocused()
    await search.fill('seat')

    await expect(popover.getByRole('menuitem')).toHaveCount(2)
    await expect(popover.getByText('Plan & Fee: User seats')).toBeVisible()
    await popover.getByRole('menuitem', { name: /Monthly seat fee/ }).click()
    await expect(popover).toHaveCount(0)

    await expect(page.locator('.ab4-doc .ab4-merge-chip', { hasText: 'Certified Partner · Monthly: Monthly seat fee' })).toBeVisible()
    await page.getByRole('button', { name: 'Save Agreement' }).click()
    await expect.poll(saved).not.toBeNull()
    expect(saved()!.template_html).toContain('{{plan.user_seat.certified_partner.monthly.total_amount}}')
  })

  test("inserts the partner's commission table, previews it as a table and saves it as its field", async ({ page }) => {
    const { saved } = await openBuilder(page)
    await page.getByRole('button', { name: 'Clear All' }).click()
    await page.getByRole('alertdialog').getByRole('button', { name: 'Clear everything' }).click()
    await expect(page.getByText('Empty Agreement')).toBeVisible()

    await page.locator('.ab4-props > .ab4-dynamic-values').getByRole('button', { name: /Insert Dynamic Value/ }).click()
    await page.locator('.ab4-insert-popover').getByRole('menuitem', { name: /Partner's commission tiers/ }).click()
    await expect(page.locator('.ab4-doc .ab4-merge-chip', { hasText: "Partner's commission tiers" })).toBeVisible()

    // It goes in with a title and a short description, as text the host can edit.
    const editor = page.locator('.ab4-doc .ab4-editor').filter({ has: page.locator('.ab4-merge-chip') })
    const title = editor.getByText('Commission Structure', { exact: true })
    await expect(title).toBeVisible()
    await expect(editor.getByText(/Partner earns the commission shown below/)).toBeVisible()
    await title.click()
    await page.keyboard.press('End')
    await page.keyboard.type(' (Addendum A)')
    await expect(editor.getByText('Commission Structure (Addendum A)')).toBeVisible()

    await page.locator('.ab4-toolbar').getByRole('button', { name: 'Preview' }).click()
    const preview = page.frameLocator('iframe[title="Preview"]')
    const table = preview.locator('table.ab-commission-table')
    await expect(table).toBeVisible()
    await expect(table.getByRole('cell', { name: '27.5%' })).toBeVisible()
    await expect(table.getByRole('cell', { name: 'and up' })).toBeVisible()
    await expect(preview.getByText('Commission Structure (Addendum A)')).toBeVisible()
    // No dotted field outline around the table.
    const outline = await table.evaluate((el) => getComputedStyle(el.parentElement!).outlineStyle)
    expect(outline).toBe('none')

    await page.getByRole('button', { name: 'Save Agreement' }).click()
    await expect.poll(saved).not.toBeNull()
    expect(saved()!.template_html).toContain('Commission Structure (Addendum A)')
    expect(saved()!.template_html).toContain('<p>{{signer.commission_table}}</p>')
    expect(saved()!.template_html).not.toContain('ab-commission-table')
  })

  test("the borrower agreement does not offer the partner's commission table", async ({ page }) => {
    await openBuilder(page, 'borrower')
    await page.locator('.ab4-props > .ab4-dynamic-values').getByRole('button', { name: /Insert Dynamic Value/ }).click()

    await expect(page.locator('.ab4-insert-popover').getByRole('menuitem', { name: "Signer's name" })).toBeVisible()
    await expect(page.locator('.ab4-insert-popover').getByRole('menuitem', { name: /Partner's commission tiers/ })).toHaveCount(0)
  })

  test('the preview has no Download PDF button', async ({ page }) => {
    await openBuilder(page)
    await page.locator('.ab4-toolbar').getByRole('button', { name: 'Preview' }).click()

    await expect(page.locator('iframe[title="Preview"]')).toBeVisible()
    await expect(page.locator('.ab4-preview-bar').getByRole('button', { name: /Download/ })).toHaveCount(0)
  })

  test('says so when the search matches nothing', async ({ page }) => {
    await openBuilder(page)
    const section = page.locator('.ab4-props > .ab4-dynamic-values')
    await section.getByRole('button', { name: /Insert Dynamic Value/ }).click()
    const popover = page.locator('.ab4-insert-popover')
    await popover.getByRole('searchbox', { name: 'Search dynamic values' }).fill('zzz')

    await expect(popover.getByRole('menuitem')).toHaveCount(0)
    await expect(popover.getByText('No dynamic values match "zzz".')).toBeVisible()
  })

  test('the dynamic value list floats over the page and closes when clicking outside it', async ({ page }) => {
    await openBuilder(page)
    const section = page.locator('.ab4-props > .ab4-dynamic-values')
    await section.getByRole('button', { name: /Insert Dynamic Value/ }).click()
    const popover = page.locator('.ab4-insert-popover')
    await expect(popover).toBeVisible()
    // Wider than the panel it opens from, and the panel's full height: toolbar to the bottom of the screen.
    const box = (await popover.boundingBox())!
    const props = (await page.locator('.ab4-props').boundingBox())!
    expect(box.width).toBeGreaterThan(props.width)
    expect(Math.abs(box.y - props.y)).toBeLessThanOrEqual(2)
    expect(Math.abs(box.y + box.height - (props.y + props.height))).toBeLessThanOrEqual(2)

    await page.locator('.ab4-toolbar').click({ position: { x: 5, y: 5 } })

    await expect(popover).toHaveCount(0)
  })

  test('the borrower agreement lists only Borrower Enrollment among Plan & Fee values', async ({ page }) => {
    await openBuilder(page, 'borrower')
    const section = page.locator('.ab4-props > .ab4-dynamic-values')
    await section.getByRole('button', { name: /Insert Dynamic Value/ }).click()

    const popover = page.locator('.ab4-insert-popover')
    await expect(popover.getByText('Plan & Fee: Borrower enrollment')).toBeVisible()
    await expect(popover.getByText('Plan & Fee: User seats')).toHaveCount(0)
    await expect(popover.getByText('Plan & Fee: Partner enrollment')).toHaveCount(0)
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
    await page.getByRole('button', { name: 'Save Agreement' }).click()
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
  test('adds a section between two blocks from the + between them', async ({ page }) => {
    const { saved } = await openBuilder(page)
    const intro = page.locator('.ab4-block', { hasText: 'This Master Partner Agreement' }).first()

    // Once the pages have laid themselves out (the blocks stop moving).
    await expect.poll(async () => {
      const before = (await intro.boundingBox())!.y
      await page.waitForTimeout(150)
      return (await intro.boundingBox())!.y === before
    }).toBe(true)

    // The gap under the intro paragraph, above THE COMPANY.
    const box = (await intro.boundingBox())!
    await page.mouse.move(box.x + box.width / 2, box.y + box.height + 2)
    const plus = page.locator('.ab4-iz--active .ab4-iz-btn')
    await expect(plus).toBeVisible()
    await plus.click()

    const picker = page.locator('.ab4-iz-picker')
    await expect(picker).toBeVisible()
    const heading = picker.getByRole('button', { name: 'Heading' })
    await expect(heading).toBeInViewport()
    await heading.click()

    await page.getByRole('button', { name: 'Save Agreement' }).click()
    await expect.poll(saved).not.toBeNull()
    const blocks = JSON.parse(saved()!.template_json).blocks as { type: string; paletteType?: string; content?: string }[]
    const introIdx = blocks.findIndex((b) => b.content?.includes('This Master Partner Agreement'))
    // Right after the intro, before THE COMPANY.
    expect(introIdx).toBeGreaterThanOrEqual(0)
    // A Heading is a preset text block.
    expect(blocks[introIdx + 1].paletteType).toBe('heading')
    expect(blocks[introIdx + 2].content).toContain('THE COMPANY')
  })
  test('saves the agreement as a named template and starts from it later in Templates', async ({ page }) => {
    await openBuilder(page)
    // fch-api /common/agreement-templates/saved, kept in memory.
    const store: { id: number; slug: string; name: string; template_json: string; created_at: string }[] = []
    let posted: Record<string, string> | null = null
    await page.route(/\/common\/agreement-templates\/saved(\?.*)?$/, async (route) => {
      if (route.request().method() === 'POST') {
        posted = route.request().postDataJSON()
        store.unshift({ id: store.length + 1, ...posted!, created_at: '2026-11-17T10:00:00Z' } as never)
        return route.fulfill({ json: ok({ ...store[0], template_json: undefined }, 'Template saved') })
      }
      const slug = new URL(route.request().url()).searchParams.get('slug')
      return route.fulfill({ json: ok(store.filter((t) => t.slug === slug).map(({ template_json: _json, ...t }) => t)) })
    })
    await page.route(/\/common\/agreement-templates\/saved\/\d+(\?.*)?$/, async (route) => {
      const id = Number(new URL(route.request().url()).pathname.split('/').pop())
      return route.fulfill({ json: ok(store.find((t) => t.id === id)) })
    })

    const toolbar = page.locator('.ab4-toolbar')
    await expect(toolbar.getByRole('button', { name: 'Save Agreement' })).toBeVisible()
    await expect(toolbar.getByRole('button', { name: 'Save Template', exact: true })).toHaveCount(0)

    // Save as Template: a name, then Save Template.
    await toolbar.getByRole('button', { name: 'Save as Template' }).click()
    const dialog = page.getByRole('dialog', { name: 'Save as template' })
    await expect(dialog.getByLabel(/Template name/)).toBeFocused()
    await dialog.getByLabel(/Template name/).fill('Master, short form')
    await dialog.getByRole('button', { name: 'Save Template' }).click()
    await expect(dialog).toHaveCount(0)
    expect(posted!.slug).toBe('partner')
    expect(posted!.name).toBe('Master, short form')
    expect(posted!.template_json).toContain('MASTER PARTNER AGREEMENT')

    // Start from a different template, then come back to the saved one.
    await toolbar.getByRole('button', { name: 'Templates' }).click()
    let picker = page.getByRole('dialog', { name: 'Start from a template' })
    await picker.getByRole('region', { name: 'Default templates' }).getByRole('button', { name: /Blank page/ }).click()
    await expect(page.getByText('Empty Agreement')).toBeVisible()

    await toolbar.getByRole('button', { name: 'Templates' }).click()
    picker = page.getByRole('dialog', { name: 'Start from a template' })
    const yours = picker.getByRole('region', { name: 'Your templates' })
    await expect(picker.getByRole('region', { name: 'Default templates' }).getByRole('button', { name: /Master partner agreement/ })).toBeVisible()
    await yours.getByRole('button', { name: /^Master, short form/ }).click()

    await expect(picker).toHaveCount(0)
    await expect(page.getByText('MASTER PARTNER AGREEMENT', { exact: true })).toBeVisible()
  })
})
