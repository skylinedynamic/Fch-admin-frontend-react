import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join, relative } from 'node:path'
import { describe, expect, it } from 'vitest'

/**
 * BUG-004 (QA round 2): stored HTML rendered with dangerouslySetInnerHTML ran
 * a lead name's onerror script. Every such render must pass its HTML through
 * sanitizeHtml(). This test fails, naming the file and line, when a new one
 * does not - add sanitizeHtml(), or, for markup the code builds itself with no
 * stored or user value in it, add it to ALLOWED below with the reason.
 */
const SRC = join(__dirname, '../../src')

const ALLOWED: { file: string; contains: string; why: string }[] = [
  { file: 'components/Common/Activity/ActivitySidebar.jsx', contains: '<style dangerouslySetInnerHTML', why: 'static CSS written in the component' },
  { file: 'pages/settings/components/AgreementBuilder/BlockComponents.tsx', contains: "decorateMergeFields('{{signer.name}}')", why: 'a fixed merge-field chip, no stored value' },
]

const files = (dir: string): string[] =>
  readdirSync(dir).flatMap((name) => {
    const path = join(dir, name)
    return statSync(path).isDirectory() ? files(path) : /\.(jsx?|tsx?)$/.test(name) ? [path] : []
  })

describe('dangerouslySetInnerHTML always goes through sanitizeHtml (BUG-004)', () => {
  it('has no unsanitized raw HTML render in src/', () => {
    const offenders: string[] = []
    for (const path of files(SRC)) {
      const file = relative(SRC, path).split('\\').join('/')
      readFileSync(path, 'utf8').split(/\r?\n/).forEach((line, i) => {
        if (!/dangerouslySetInnerHTML\s*=/.test(line) || line.includes('sanitizeHtml(')) return
        if (ALLOWED.some((a) => a.file === file && line.includes(a.contains))) return
        offenders.push(`src/${file}:${i + 1}`)
      })
    }
    expect(offenders, 'Wrap these in sanitizeHtml() from src/utils/sanitizeHtml').toEqual([])
  })
})
