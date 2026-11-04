import { test, expect } from '../../support/live/fixtures'

// Real API, nothing written: both uploads are refused.
//
// BUG-014 (QA round 2): as host admin, Profile > camera > Upload took
// qa-12mb.png - 12 MB, the PNG signature and then zeros - with 200, and it
// could then be set as the profile picture. A picture may now be up to 5 MB
// and has to open as an image; the file manager says why it refuses one.
const PNG_MAGIC = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])
const fakePng = (name: string, bytes: number) => ({
  name,
  mimeType: 'image/png',
  buffer: Buffer.concat([PNG_MAGIC, Buffer.alloc(bytes - PNG_MAGIC.length)]),
})

test.describe('Topbar › Profile › picture upload — size and content (live)', () => {
  test('refuses QA\'s 12 MB fake PNG and a small one that is not an image', async ({ page }) => {
    await page.goto('/profile')
    await page.locator('.btn.btn-primary.rounded-circle.position-absolute').click()

    const fileManager = page.locator('.fm-toolbar-btn', { hasText: 'Upload' })
    await expect(fileManager).toBeVisible()

    const uploadOne = async (file: ReturnType<typeof fakePng>) => {
      await fileManager.click()
      await page.locator('input[type="file"]').last().setInputFiles(file)
      await page.getByRole('button', { name: 'Upload (1)' }).click()
    }

    // Over the 5 MB picture limit: refused before it is sent.
    const sent: string[] = []
    page.on('request', (r) => r.url().includes('/filemanager/upload') && sent.push(r.url()))
    await uploadOne(fakePng('qa-12mb.png', 12 * 1024 * 1024))
    await expect(page.getByText('File "qa-12mb.png" exceeds 5MB limit.')).toBeVisible()
    expect(sent).toEqual([])

    // The upload dialog stays open on a refusal; close it to start again.
    await page.locator('.fm-modal .fm-btn.fm-btn-secondary').click()

    // Small enough, but not a picture: the API refuses it and says why.
    const refused = page.waitForResponse((r) => r.url().includes('/filemanager/upload') && r.request().method() === 'POST')
    await uploadOne(fakePng('qa-fake.png', 50 * 1024))
    const response = await refused
    expect(response.status()).toBe(422)
    expect((await response.json()).errors?.file).toBe('This file is not a valid image.')
    await expect(page.getByText('This file is not a valid image.')).toBeVisible()
  })
})
