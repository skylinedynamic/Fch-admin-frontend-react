import { test, expect, pageHeading, type Page } from '../../support/live/fixtures'

// Real API, nothing sent. Clients › a client › Activity › New Email, as the
// host: the client's email is already selected in To, and To looks like
// Subject - the same corners, height and focus border, no blue glow.
//
// Needs a local client with an email (E2E_PRIVATE_FILES_CLIENT_ID, default 165).
const CLIENT_ID = process.env.E2E_PRIVATE_FILES_CLIENT_ID || '165'
// A client of a partner other than the host, for the From switch (default 164).
const PARTNER_CLIENT_ID = process.env.E2E_PARTNER_CLIENT_ID || '164'

const openNewEmail = async (page: Page, clientId = CLIENT_ID) => {
  await page.goto(`/clients/${clientId}`)
  await expect(pageHeading(page, 'Client Profile')).toBeVisible()
  const email = page.locator('.page-content input[name="email"]').first()
  await expect(email).not.toHaveValue('')
  const clientEmail = await email.inputValue()

  await page.getByRole('button', { name: /New Email/ }).first().click()
  const modal = page.locator('#emailComposeModal.show')
  await expect(modal.locator('#emailSubject')).toBeVisible()
  return { modal, clientEmail }
}

const look = (page: Page, selector: string) =>
  page.locator(`#emailComposeModal.show ${selector}`).first().evaluate((el) => {
    const s = getComputedStyle(el)
    return { radius: s.borderTopLeftRadius, height: s.height, border: s.borderTopColor, shadow: s.boxShadow }
  })

test.describe('Sidebar › Clients › New Email (live)', () => {
  test("the client's email is selected in To", async ({ page }) => {
    const { modal, clientEmail } = await openNewEmail(page)

    await expect(modal.locator('.choices__list--multiple .choices__item')).toHaveCount(1)
    await expect(modal.locator('.choices__list--multiple .choices__item').first()).toContainText(clientEmail)
  })

  // The host sees, above To in a warning box, the client's partner's sending
  // address by default; the switch shows the host's. Each is the fallback's
  // address when it has no mail settings of its own.
  test("From, above To, shows the client's partner's address, and the switch the host's", async ({ page }) => {
    const sender = page.waitForResponse((r) => r.url().includes('/common/activity-logs/email-sender'))
    const { modal } = await openNewEmail(page, PARTNER_CLIENT_ID)
    const response = await sender
    expect(new URL(response.url()).searchParams.get('partner_id')).toBeTruthy()
    const { data } = await response.json()

    const from = modal.getByTestId('email-from')
    await expect(from).toHaveClass(/acm-from/)
    await expect(from).toContainText('Sending from')
    const expectShows = async (option: { name: string; address: string | null; uses_fallback: boolean }) => {
      if (option.address) {
        await expect(from).toContainText(option.name)
        await expect(from).toContainText(option.address)
        if (option.uses_fallback) await expect(from).toContainText('goes out from the fallback address')
      } else {
        await expect(from).toContainText('No email account is set up')
      }
    }

    if (data.options.partner) {
      expect(data.default).toBe('partner')
      await expectShows(data.options.partner)
      await modal.screenshot({ path: 'test-results/new-email-from-partner.png' })
      await modal.getByRole('switch', { name: "Send from the host's email" }).check()
    }
    await expectShows(data.options.host)

    const fromBox = await from.boundingBox()
    const toBox = await modal.locator('.acm-tags').boundingBox()
    expect(fromBox!.y).toBeLessThan(toBox!.y)
    await modal.screenshot({ path: 'test-results/new-email-from.png' })
  })

  test('To looks like Subject, at rest and focused', async ({ page }) => {
    const { modal } = await openNewEmail(page)
    await modal.locator('.choices__list--multiple .choices__item').first().waitFor()

    // At rest, with a tag in it.
    const toRest = await look(page, '.choices__inner')
    const subjectRest = await look(page, '#emailSubject')
    expect(toRest.radius).toBe(subjectRest.radius)
    expect(toRest.height).toBe(subjectRest.height)
    expect(toRest.border).toBe(subjectRest.border)

    // Focused: the border eases in, so read it once it has settled.
    await modal.locator('#emailSubject').click()
    let subjectFocused = ''
    await expect.poll(async () => {
      const now = (await look(page, '#emailSubject')).border
      const settled = now === subjectFocused
      subjectFocused = now
      return settled
    }, { intervals: [300] }).toBe(true)
    await modal.locator('input.choices__input--cloned').click()
    await expect.poll(async () => (await look(page, '.choices__inner')).border).toBe(subjectFocused)
    expect((await look(page, '.choices__inner')).shadow).toBe('none')
  })

  test("the tag's remove cross is red, the same red as the required mark", async ({ page }) => {
    const { modal } = await openNewEmail(page)
    const cross = modal.locator('.choices__list--multiple .choices__item .choices__button').first()
    await cross.waitFor()

    const red = await modal.locator('label .text-danger').first().evaluate((el) => getComputedStyle(el).color)
    const paint = await cross.evaluate((el) => {
      const s = getComputedStyle(el)
      return { color: s.backgroundColor, image: s.backgroundImage, mask: s.maskImage || s.webkitMaskImage }
    })
    expect(paint.color).toBe(red)
    expect(paint.image).toBe('none')
    expect(paint.mask).toContain('svg')
  })
})
