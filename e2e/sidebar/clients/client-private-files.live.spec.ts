import { test, expect, pageHeading, waitForApi } from '../../support/live/fixtures'

// Real API, nothing written. BUG-016: a client's documents and credit report
// are kept on fch-api's private disk. The page gets a short-lived signed
// /private-files URL for each, which opens the file; the old /storage URL for
// the same file no longer does.
//
// Needs a local client with documents and a credit report on disk
// (E2E_PRIVATE_FILES_CLIENT_ID, default 165 in the local fch_dev data).
const CLIENT_ID = process.env.E2E_PRIVATE_FILES_CLIENT_ID || '165'

const isSigned = (url: string) => /\/private-files\//.test(url) && /[?&]signature=/.test(url)
const asStorageUrl = (url: string) => url.replace('/private-files/', '/storage/').split('?')[0]

test.describe('Sidebar › Clients › private files (live)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(`/clients/${CLIENT_ID}`)
    await expect(pageHeading(page, 'Client Profile')).toBeVisible()
  })

  test('a document opens by its signed URL, not by /storage', async ({ page, request }) => {
    const loaded = waitForApi(page, /\/common\/borrowers-documents\/\d+$/, 'POST')
    await page.locator('.nav-link', { hasText: /^\s*Documents\s*$/ }).first().click()
    const body = await (await loaded).json()

    const urls: string[] = JSON.stringify(body).match(/https?:[^"]*\/private-files\/[^"]*/g)?.map((u) => u.replace(/\\\//g, '/')) ?? []
    expect(urls.length, 'the documents list gave no private file URL').toBeGreaterThan(0)
    expect(JSON.stringify(body)).not.toMatch(/\/storage\/borrowers\//)

    const url = urls[0]
    expect(isSigned(url)).toBe(true)
    expect((await request.get(url)).status()).toBe(200)
    expect((await request.get(asStorageUrl(url))).status()).toBe(404)
    expect((await request.get(url.split('?')[0])).status()).toBe(403)
  })

  test('the credit report shows on the Credit Profile tab and its URL is signed', async ({ page, request }) => {
    const loaded = waitForApi(page, /get-credit-profile/)
    await page.locator('.nav-link', { hasText: /^\s*Credit Profile\s*$/ }).first().click()
    const profile = (await (await loaded).json()).data

    expect(profile.pdf, 'the profile came without its report').toBeTruthy()
    expect(isSigned(profile.pdf_url)).toBe(true)
    expect(profile.pdf_url).toMatch(/\/private-files\/credit-reports\//)
    expect((await request.get(profile.pdf_url)).status()).toBe(200)
    expect((await request.get(asStorageUrl(profile.pdf_url))).status()).toBe(404)
  })
})
