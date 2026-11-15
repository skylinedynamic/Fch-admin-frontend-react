import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

/**
 * Add/Edit Lender (found 2026-11-11): "Select product categories" looked
 * faded - disabled - beside "Select ISO Status". The shared tag-picker style
 * draws its placeholder lighter (#878a99) and smaller (13px). On the Lender
 * form it reads like the form's other selects: the theme's placeholder colour
 * (#6c757d) at .875rem, as slim-dropdown's label.
 */
const css = readFileSync(resolve(__dirname, '../../..', 'assets/css/lenders.css'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '')

describe('Lender form: Product Categories placeholder', () => {
  it('matches the ISO Status select', () => {
    // More specific than the shared .taxonomy-field rule, so it wins whatever the CSS order.
    const rule = css.match(/\.taxonomy-field\.lender-categories-field\s+\.p-multiselect\s+\.p-multiselect-label\.p-placeholder\s*\{([^}]*)\}/)?.[1] ?? ''

    expect(rule).toMatch(/color:\s*#6c757d/i)
    expect(rule).toMatch(/font-size:\s*\.875rem/)
  })

  // Its border was the shared picker's lighter #e9ebec; ISO Status has the theme's #ced4da.
  it('has the same border as the ISO Status select', () => {
    const rule = css.match(/\.taxonomy-field\.lender-categories-field\s+\.p-multiselect\s*\{([^}]*)\}/)?.[1] ?? ''

    expect(rule).toMatch(/border-color:\s*#ced4da/i)
  })
})
