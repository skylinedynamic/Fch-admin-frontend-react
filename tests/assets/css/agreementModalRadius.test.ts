import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

/**
 * Every agreement modal - signing, adopt-a-signature, starter templates,
 * confirm and preview - has 4px corners, like the app's other modals. Round
 * things (icons, spinners) and square edges (0) are left as they are.
 */
const FILES = ['assets/css/agreement-builder.css', 'src/components/Common/Modals/SignatureDialog.css']
const MODAL = /\.(asm-|ab4-confirm|ab4-templates|ab4-preview|sgd-)/
const ROUND = /^(50%|inherit|0( !important)?)$/

const radii = (css: string) => {
  const found: { selector: string; value: string }[] = []
  for (const match of css.replace(/\/\*[\s\S]*?\*\//g, '').matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
    const selector = match[1].trim()
    if (!MODAL.test(selector)) continue
    for (const radius of match[2].matchAll(/border-radius\s*:\s*([^;]+)/g)) found.push({ selector, value: radius[1].trim() })
  }
  return found
}

describe('agreement modals', () => {
  it.each(FILES)('%s gives every modal corner 4px', (file) => {
    const found = radii(readFileSync(resolve(__dirname, '../../..', file), 'utf8'))

    expect(found.length).toBeGreaterThan(0)
    const wrong = found.filter(({ value }) => !ROUND.test(value) && value.split(/\s+/).some((v) => v !== '4px' && v !== '0' && v !== '!important'))
    expect(wrong).toEqual([])
  })
})
