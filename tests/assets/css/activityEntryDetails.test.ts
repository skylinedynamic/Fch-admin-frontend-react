import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

/**
 * Activity sidebar: an opened email or event entry lists its details as
 * label / value rows (To, Subject - Type, Date, Assigned to).
 */
const css = readFileSync(resolve(__dirname, '../../..', 'assets/css/custom.css'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '')

const ruleFor = (selector: string) => {
  let body = ''
  for (const match of css.matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
    if (match[1].split(',').map((s) => s.trim()).includes(selector)) body += match[2] + ';'
  }
  return body
}

describe('custom.css - activity entry details', () => {
  it('puts each label beside its value', () => {
    const row = ruleFor('.activity-entry-details__row')
    expect(row).toMatch(/display\s*:\s*grid/)
    expect(row).toMatch(/grid-template-columns\s*:\s*\d+px\s+1fr/)
  })
})

describe('custom.css - activity entry row', () => {
  it('keeps the title on one line, cut with an ellipsis', () => {
    const title = ruleFor('.activity-entry-title')
    expect(title).toMatch(/white-space\s*:\s*nowrap/)
    expect(title).toMatch(/text-overflow\s*:\s*ellipsis/)
    expect(ruleFor('.activity-entry-text')).toMatch(/min-width\s*:\s*0/)
  })

  it('keeps who / when / visibility / status on one line', () => {
    const meta = ruleFor('.activity-entry-meta')
    expect(meta).toMatch(/flex-wrap\s*:\s*nowrap/)
    expect(meta).toMatch(/white-space\s*:\s*nowrap/)
  })
})
