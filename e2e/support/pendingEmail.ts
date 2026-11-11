import { test, expect, type Page, type Request } from '@playwright/test'
import { mockApi, ok, seedSession, type Handler } from './helpers'

/**
 * BUG-203, shared by the admin edit forms that hold a sign-in email (Clients,
 * Partners, Employees, Users). While a change waits the email field shows the
 * pending email and the notice names the current one; saving other fields
 * sends the pending email back (the API keeps the change), and typing the
 * current email back in withdraws it. Mocked API: nothing is written or mailed.
 */
export type PendingEmailScreen = {
  title: string
  route: string
  permissions: string[]
  current: string
  requested: string
  placeholder: string
  /** The record's GET, answered with the pending email given. */
  load: { match: RegExp; body: (pending: string | null) => unknown }
  /** The record's save, answered with the pending email after it. */
  save: { method: string; match: RegExp; body: (pending: string | null) => unknown }
  /** Anything else the screen needs answered. */
  extra?: Handler[]
  /** After the page loads, e.g. open the tab that holds the email. */
  open?: (page: Page) => Promise<void>
  /** The screen moves to another tab after a save, so open() runs again. */
  reopenAfterSave?: boolean
  saveButton?: (page: Page) => ReturnType<Page['getByRole']>
}

/** The email in a save, from a JSON or multipart body. */
const sentEmail = (req: Request): string => {
  const raw = req.postData() || ''
  try {
    return String(JSON.parse(raw).email)
  } catch {
    return /name="email"\r?\n\r?\n([^\r\n]*)/.exec(raw)?.[1] ?? ''
  }
}

export function describePendingEmail(screen: PendingEmailScreen) {
  test.describe(`${screen.title} - a pending email change (BUG-203)`, () => {
    let pending: string | null
    let sent: string[]

    async function open(page: Page) {
      pending = screen.requested
      sent = []
      await seedSession(page, { permissions: screen.permissions })
      await mockApi(page, [
        ...(screen.extra ?? []),
        { method: 'GET', match: screen.load.match, body: () => ok(screen.load.body(pending)) },
        {
          method: screen.save.method,
          match: screen.save.match,
          body: (req: Request) => {
            const email = sentEmail(req)
            sent.push(email)
            // As the API: the current email withdraws the change, the pending one keeps it.
            if (email.toLowerCase() === screen.current.toLowerCase()) pending = null
            return ok(screen.save.body(pending), 'ok')
          },
        },
      ])
      await page.goto(screen.route)
      if (screen.open) await screen.open(page)
      const email = page.getByPlaceholder(screen.placeholder, { exact: true })
      await expect(email).toHaveValue(screen.requested)
      return email
    }

    const saveButton = (page: Page) =>
      screen.saveButton ? screen.saveButton(page) : page.getByRole('button', { name: 'Update', exact: false }).first()
    const notice = (page: Page) => page.getByText(/Waiting for confirmation from/)
    // Some screens move on to their next tab after a save; come back to the email.
    const backToEmail = async (page: Page) => {
      if (screen.reopenAfterSave && screen.open) await screen.open(page)
    }

    test('the field shows the pending email and the notice the current one', async ({ page }) => {
      await open(page)

      await expect(notice(page)).toContainText(screen.requested)
      await expect(notice(page)).toContainText(`Sign-in stays ${screen.current}`)
    })

    test('saving without touching the email sends the pending one back, so the change stays', async ({ page }) => {
      const email = await open(page)

      await saveButton(page).click()

      await expect.poll(() => sent).toEqual([screen.requested])
      await backToEmail(page)
      await expect(email).toHaveValue(screen.requested)
      await expect(notice(page)).toContainText(screen.requested)
    })

    test('typing the current email back in withdraws the change', async ({ page }) => {
      const email = await open(page)

      await email.fill(screen.current)
      await saveButton(page).click()

      await expect.poll(() => sent).toEqual([screen.current])
      await backToEmail(page)
      await expect(email).toBeVisible()
      await expect(notice(page)).toHaveCount(0)
      await expect(email).toHaveValue(screen.current)
    })
  })
}
