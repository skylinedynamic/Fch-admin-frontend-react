import type { Page } from '@playwright/test'

/**
 * Opens `path` and returns the path the router finally settles on.
 *
 * Reading the URL straight after goto() is wrong for this app: main.jsx waits
 * for the locations request before its first render, so the route guards have
 * not run yet when the load event fires - on a slow API the browser is still
 * sitting on the requested URL. This waits for the app to render, then for the
 * path to stop changing.
 */
export async function landingPath(page: Page, path: string, timeout = 30_000): Promise<string> {
  await page.goto(path)
  // Layout (signed in) or the auth wrapper (login / standalone error page).
  await page.locator('#layout-wrapper, .auth-page-wrapper').first().waitFor({ state: 'attached', timeout })

  const current = () => new URL(page.url()).pathname
  const deadline = Date.now() + timeout
  let last = current()
  let stableSince = Date.now()

  while (Date.now() < deadline) {
    await page.waitForTimeout(100)
    const now = current()
    if (now !== last) {
      last = now
      stableSince = Date.now()
    } else if (Date.now() - stableSince >= 500) {
      return last
    }
  }
  return last
}
