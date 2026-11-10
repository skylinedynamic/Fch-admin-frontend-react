import { test, expect } from '../../support/live/fixtures'

/**
 * A table's column filter popup (match mode, value, Clear / Apply) uses the
 * theme primary colour (--vz-primary), not a PrimeReact theme's own blue or
 * indigo. The style is global, so every table's popup looks the same.
 */
test('the column filter popup buttons use the theme primary colour', async ({ page }) => {
  await page.goto('/payments')
  await page.locator('.p-column-filter-menu-button').first().click()
  const overlay = page.locator('.p-column-filter-overlay')
  await expect(overlay).toBeVisible()

  const colours = await page.evaluate(() => {
    const probe = document.createElement('span')
    probe.style.color = 'var(--vz-primary)'
    document.body.appendChild(probe)
    const primary = getComputedStyle(probe).color
    probe.remove()
    const style = (sel: string) => getComputedStyle(document.querySelector(sel) as Element)
    const apply = style('.p-column-filter-buttonbar .p-button:not(.p-button-outlined)')
    const clear = style('.p-column-filter-buttonbar .p-button-outlined')
    return {
      primary,
      applyBg: apply.backgroundColor, applyBorder: apply.borderColor,
      clearColor: clear.color, clearBorder: clear.borderColor, clearBg: clear.backgroundColor,
    }
  })

  expect(colours.applyBg).toBe(colours.primary)
  expect(colours.applyBorder).toBe(colours.primary)
  expect(colours.clearColor).toBe(colours.primary)
  expect(colours.clearBorder).toBe(colours.primary)
  expect(colours.clearBg).toBe('rgba(0, 0, 0, 0)')

  // Match mode and value fields are the same size; focusing the value field
  // changes neither its border colour nor adds a ring; the buttons are small.
  const sizes = await page.evaluate(() => {
    const box = (sel: string) => (document.querySelector(sel) as Element).getBoundingClientRect()
    return {
      dropdown: box('.p-column-filter-overlay .p-column-filter-matchmode-dropdown'),
      input: box('.p-column-filter-overlay input.p-column-filter'),
      button: box('.p-column-filter-buttonbar .p-button:not(.p-button-outlined)'),
    }
  })
  expect(Math.round(sizes.dropdown.width)).toBe(Math.round(sizes.input.width))
  expect(Math.round(sizes.dropdown.height)).toBe(Math.round(sizes.input.height))
  expect(sizes.button.height).toBeLessThanOrEqual(32)

  const value = page.locator('.p-column-filter-overlay input.p-column-filter')
  const before = await value.evaluate((el) => getComputedStyle(el).borderColor)
  await value.focus()
  await expect(value).toHaveCSS('box-shadow', 'none')
  await expect(value).toHaveCSS('border-color', before)
})
