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

/**
 * Opens the builder on the partner or borrower agreement - its built-in starter,
 * or `savedJson` (a saved agreement's template_json) when given.
 */
async function openBuilder(page: Page, type: 'partner' | 'borrower' = 'partner', savedJson?: string): Promise<{ saved: () => Saved }> {
  await page.setViewportSize({ width: 1600, height: 900 })
  await seedSession(page, { permissions: ['update payment settings', 'update partner agreement settings', 'update borrower agreement settings'] })
  let saved: Saved = null
  await mockApi(page, [
    { method: 'GET', match: '/common/agreement-templates', body: ok([{ id: 8, slug: 'partner', is_active: true }, { id: 9, slug: 'borrower', is_active: true }]) },
    { method: 'POST', match: '/common/agreement-templates/show', body: ok(savedJson ? { id: 8, slug: type, template_json: savedJson } : null) },
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
  if (!savedJson) {
    await expect(page.getByText(type === 'partner' ? 'MASTER PARTNER AGREEMENT' : 'BUSINESS CREDIT BUILDER & FUNDING PROGRAM', { exact: true })).toBeVisible()
  }
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
  test('renames a saved template in Templates and replaces it from Save as Template', async ({ page }) => {
    await openBuilder(page)
    // fch-api /common/agreement-templates/saved with one saved template, kept in memory.
    const store = [{ id: 1, slug: 'partner', name: 'Master, short form', template_json: '{"blocks":[],"pagePad":80,"docBg":"#ffffff"}', created_at: '2026-11-17T10:00:00Z' }]
    const puts: Record<string, string>[] = []
    await page.route(/\/common\/agreement-templates\/saved(\?.*)?$/, async (route) =>
      route.fulfill({ json: ok(store.map(({ template_json: _json, ...t }) => t)) }))
    await page.route(/\/common\/agreement-templates\/saved\/\d+(\?.*)?$/, async (route) => {
      if (route.request().method() === 'PUT') {
        const body = route.request().postDataJSON() as Record<string, string>
        puts.push(body)
        Object.assign(store[0], body)
        return route.fulfill({ json: ok({ ...store[0], template_json: undefined }, 'Template updated') })
      }
      return route.fulfill({ json: ok(store[0]) })
    })
    const toolbar = page.locator('.ab4-toolbar')

    // Rename it in Templates.
    await toolbar.getByRole('button', { name: 'Templates' }).click()
    const picker = page.getByRole('dialog', { name: 'Start from a template' })
    await picker.getByRole('button', { name: 'Rename template Master, short form' }).click()
    const name = picker.getByLabel('Template name')
    await expect(name).toBeFocused()
    await name.fill('Master, two pages')
    await name.press('Enter')
    await expect(picker.getByRole('button', { name: /^Master, two pages/ })).toBeVisible()
    expect(puts[0]).toEqual({ name: 'Master, two pages' })
    await picker.getByRole('button', { name: 'Close' }).click()

    // Replace its content with the agreement on the page; it keeps its new name.
    await toolbar.getByRole('button', { name: 'Save as Template' }).click()
    const dialog = page.getByRole('dialog', { name: 'Save as template' })
    await dialog.getByRole('radio', { name: /Replace an existing template/ }).check()
    // The app's own dropdown: its list opens inside the dialog.
    // (PrimeReact keeps a 1px select for screen readers inside .p-hidden-accessible.)
    await expect(dialog.locator(':not(.p-hidden-accessible) > select')).toHaveCount(0)
    await dialog.locator('.p-dropdown', { hasText: 'Choose a template' }).click()
    await dialog.locator('.p-dropdown-panel .p-dropdown-item', { hasText: 'Master, two pages' }).click()
    await expect(dialog.locator('.p-dropdown')).toContainText('Master, two pages')
    await dialog.getByRole('button', { name: 'Replace Template' }).click()
    await expect(dialog).toHaveCount(0)
    expect(Object.keys(puts[1])).toEqual(['template_json'])
    expect(puts[1].template_json).toContain('MASTER PARTNER AGREEMENT')
  })
  // Defect: the editor drew blocks taller than the page planner planned them
  // (margins didn't collapse across the insert lines, and a page's first block
  // kept its top margin), so text ran into the bottom padding and was clipped.
  test("keeps every page's bottom padding clear in the editor", async ({ page }) => {
    await openBuilder(page)
    const pages = page.locator('.ab4-pages-container .ab4-doc')
    await expect.poll(() => pages.count()).toBeGreaterThan(2)
    // Wait until the pages stop moving (pagination settles in a few passes).
    let before = ''
    await expect.poll(async () => {
      const now = String(await pages.count()) + ':' + JSON.stringify(await pages.first().boundingBox())
      const settled = now === before
      before = now
      await page.waitForTimeout(400)
      return settled
    }).toBe(true)

    const report = await pages.evaluateAll((docs) => docs.map((doc, i) => {
      const d = doc as HTMLElement
      const box = d.getBoundingClientRect()
      const scale = box.height / d.offsetHeight
      const padBot = parseFloat(getComputedStyle(d).paddingBottom)
      const kids = Array.from(d.children).filter((c) => !c.classList.contains('ab4-iz')) as HTMLElement[]
      const last = kids[kids.length - 1]
      const firstBlock = kids[0]?.querySelector(':scope > div > .ab4-block') as HTMLElement | null
      return {
        page: i + 1,
        clearAtBottom: last ? Math.round((box.bottom - last.getBoundingClientRect().bottom) / scale) : padBot,
        padBot,
        firstMarginTop: firstBlock ? getComputedStyle(firstBlock).marginTop : '0px',
      }
    }))

    for (const p of report) {
      expect(p.clearAtBottom, `page ${p.page} keeps its bottom padding`).toBeGreaterThanOrEqual(p.padBot - 1)
      expect(p.firstMarginTop, `page ${p.page}'s first block has no top margin`).toBe('0px')
    }
  })
  // Text pasted from ChatGPT or Claude keeps its look - fonts, sizes, headings,
  // links, quotes, lines, code - but not a dark-mode page's theme: the dark
  // background and the white text that would vanish on the white page.
  test('pastes a dark-mode chat answer with its fonts and structure, without the dark theme', async ({ page }) => {
    const { saved } = await openBuilder(page, 'partner', JSON.stringify({
      blocks: [{ id: 'p-1', type: 'text', paletteType: 'text', fontSize: 14, lineHeight: 1.6, marginTop: 0, marginBottom: 8, content: 'Intro.' }],
      pagePad: 80,
      docBg: '#ffffff',
    }))
    const editor = page.locator('.ab4-doc .ab4-editor', { hasText: 'Intro.' }).first()
    await editor.click()
    await page.keyboard.press('End')

    const html = '<div style="background-color:#212121;color:#ececec">'
      + '<h2 style="color:#ffffff;font-family:Söhne;font-size:24px;margin:16px 0 8px">2. Fees</h2>'
      + '<p style="color:#ececec;margin:0 0 12px">See <a href="https://example.com/terms" style="color:#7ab7ff">the terms</a> and <del>old</del> <code>code</code>.</p>'
      + '<blockquote><p>Quoted clause.</p></blockquote><hr><p>After.</p></div>'
    await editor.evaluate((el, pasted) => {
      const data = new DataTransfer()
      data.setData('text/html', pasted)
      data.setData('text/plain', 'plain fallback')
      el.dispatchEvent(new ClipboardEvent('paste', { clipboardData: data, bubbles: true, cancelable: true }))
    }, html)

    const heading = editor.locator('h2', { hasText: '2. Fees' })
    await expect(heading).toBeVisible()
    await expect(editor.locator('a[href="https://example.com/terms"]')).toHaveText('the terms')
    await expect(editor.locator('s', { hasText: 'old' })).toBeVisible()
    await expect(editor.locator('code', { hasText: 'code' })).toBeVisible()
    await expect(editor.locator('blockquote', { hasText: 'Quoted clause.' })).toBeVisible()
    await expect(editor.locator('hr')).toHaveCount(1)
    // The source's font and size stay; its white text and dark page do not.
    const look = await heading.evaluate((h) => {
      const style = getComputedStyle(h)
      return { family: style.fontFamily, size: style.fontSize, color: style.color }
    })
    expect(look.family).toContain('Söhne')
    expect(look.size).toBe('24px')
    expect(look.color).not.toBe('rgb(255, 255, 255)')
    await expect(editor.locator('[style*="#212121"], [style*="33, 33, 33"]')).toHaveCount(0)

    await page.getByRole('button', { name: 'Save Agreement' }).click()
    await expect.poll(saved).not.toBeNull()
    expect(saved()!.template_html).toContain('<h2 style="font-family:Söhne;font-size:24px;margin:16px 0 8px">2. Fees</h2>')
    expect(saved()!.template_html).toContain('<a href="https://example.com/terms" target="_blank" rel="noopener noreferrer" style="color:#7ab7ff">the terms</a>')
    expect(saved()!.template_html).toContain('<blockquote>')
    expect(saved()!.template_html).not.toContain('#212121')
    expect(saved()!.template_html).not.toContain('color:#ffffff')
  })

  // A contract copied from Microsoft Word: its Title, headings, bold clause
  // labels, spacing and border-less signature table come through as in Word.
  test('pastes a Word document with its title, headings, bold labels and border-less signature table', async ({ page }) => {
    const { saved } = await openBuilder(page, 'partner', JSON.stringify({
      blocks: [{ id: 'w-1', type: 'text', paletteType: 'text', fontSize: 14, lineHeight: 1.6, marginTop: 0, marginBottom: 8, content: 'Start.' }],
      pagePad: 80,
      docBg: '#ffffff',
    }))
    const editor = page.locator('.ab4-doc .ab4-editor', { hasText: 'Start.' }).first()
    await editor.click()
    await page.keyboard.press('End')

    const html = "<html xmlns:w=\"urn:schemas-microsoft-com:office:word\"><body><!--StartFragment-->"
      + "<div style='mso-element:para-border-div;border:none;border-bottom:solid #4F81BD 1.0pt'><p class=MsoTitle>PARTNER AGREEMENT<o:p></o:p></p></div>"
      + "<h1>1. Purpose<o:p></o:p></h1>"
      + "<p class=MsoNormal><b style='mso-bidi-font-weight:normal'>1.1. Purpose. </b>Company operates a platform.<o:p></o:p></p>"
      + "<table class=MsoNormalTable border=0 cellspacing=0 cellpadding=0>\n <tr>\n  <td style='padding:0in 5.4pt'><p class=MsoNormal><b>COMPANY</b><o:p></o:p></p><p class=MsoNormal>Signature: ____<o:p></o:p></p></td>"
      + "<td style='padding:0in 5.4pt'><p class=MsoNormal><b>PARTNER</b><o:p></o:p></p><p class=MsoNormal>Signature: ____<o:p></o:p></p></td>\n </tr>\n</table>"
      + '<!--EndFragment--></body></html>'
    await editor.evaluate((el, pasted) => {
      const data = new DataTransfer()
      data.setData('text/html', pasted)
      data.setData('text/plain', 'plain fallback')
      el.dispatchEvent(new ClipboardEvent('paste', { clipboardData: data, bubbles: true, cancelable: true }))
    }, html)

    await expect(editor.locator('h1', { hasText: 'PARTNER AGREEMENT' })).toBeVisible()
    await expect(editor.locator('h2', { hasText: '1. Purpose' })).toBeVisible()
    await expect(editor.locator('strong', { hasText: '1.1. Purpose.' })).toBeVisible()
    await expect(editor).toContainText('1.1. Purpose. Company operates a platform.')
    const table = editor.locator('table.ab-plain-table')
    await expect(table).toBeVisible()
    // Drawn without the borders a data table gets.
    expect(await table.locator('td').first().evaluate((td) => getComputedStyle(td).borderTopStyle)).not.toBe('solid')

    await page.getByRole('button', { name: 'Save Agreement' }).click()
    await expect.poll(saved).not.toBeNull()
    // The line under the title is Word's own border, kept as it was.
    expect(saved()!.template_html).toContain('<div style="border:none;border-bottom:solid #4F81BD 1.0pt"><h1>PARTNER AGREEMENT</h1></div>')
    expect(saved()!.template_html).toContain('<strong>1.1. Purpose.</strong> Company operates a platform.')
    expect(saved()!.template_html).toContain('<table class="ab-plain-table">')
  })

  // An agreement pasted in as one long text block runs over several pages.
  const LONG_BLOCK_JSON = JSON.stringify({
    blocks: [{
      id: 'long-1', type: 'text', paletteType: 'text', fontSize: 14, lineHeight: 1.7, marginTop: 0, marginBottom: 8,
      content: '<p><b>Funding Provider Partner Agreement</b></p>' + Array.from({ length: 60 }, (_, n) =>
        `<p>Clause ${n + 1}. The Funding Provider agrees to review each Qualified Application within the agreed service levels and to report its decision through the platform.</p>`).join(''),
    }],
    pagePad: 80,
    docBg: '#ffffff',
  })

  // Defect: a block that runs over pages sits in clip windows that cut off
  // anything outside them - its toolbar (above the block) showed as a sliver.
  test("shows the toolbar of a block that runs over several pages", async ({ page }) => {
    await openBuilder(page, 'partner', LONG_BLOCK_JSON)
    const head = page.locator('.ab4-block-clip-window').first()
    await expect(head).toBeVisible()
    await page.getByText('Funding Provider Partner Agreement').first().click()

    const ctrl = head.locator('.ab4-ctrl').first()
    await expect(ctrl).toBeVisible()
    const box = (await ctrl.boundingBox())!
    // The whole toolbar can be seen and clicked: the point at its top edge is the toolbar itself.
    const hit = await page.evaluate(({ x, y }) => {
      const el = document.elementFromPoint(x, y)
      return !!el?.closest('.ab4-ctrl')
    }, { x: box.x + box.width / 2, y: box.y + 2 })
    expect(hit).toBe(true)
    await expect(ctrl.getByRole('button', { name: /delete/i }).first()).toBeVisible()
  })

  // Defect: the + menu near the bottom of a page opened downwards, where the
  // page cut it off, so most blocks (Page Break among them) couldn't be picked.
  test('the + menu near the bottom of a page opens where it fits, and adds a page break there', async ({ page }) => {
    const { saved } = await openBuilder(page)
    const firstPage = page.locator('.ab4-pages-container .ab4-doc').first()
    // Let pagination settle, then take the last gap on page 1.
    await page.waitForTimeout(1500)
    const gaps = firstPage.locator(':scope > .ab4-iz')
    const lastGap = gaps.last()
    // A gap has no height of its own: bring it to the middle of the window.
    await lastGap.evaluate((el) => el.scrollIntoView({ block: 'center' }))
    await page.waitForTimeout(200)
    const gapBox = (await lastGap.boundingBox())!
    await page.mouse.move(gapBox.x + gapBox.width / 2, gapBox.y)
    await lastGap.locator('.ab4-iz-btn').click()

    const picker = lastGap.locator('.ab4-iz-picker')
    await expect(picker).toBeVisible()
    const pageBox = (await firstPage.boundingBox())!
    const pickerBox = (await picker.boundingBox())!
    expect(pickerBox.y).toBeGreaterThanOrEqual(pageBox.y)
    expect(pickerBox.y + pickerBox.height).toBeLessThanOrEqual(pageBox.y + pageBox.height)

    await picker.getByRole('button', { name: 'Page Break' }).click()
    await page.getByRole('button', { name: 'Save Agreement' }).click()
    await expect.poll(saved).not.toBeNull()
    expect(blockTypes(saved())).toContain('page-break')
  })
})
