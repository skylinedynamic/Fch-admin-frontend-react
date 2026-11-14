import { describe, expect, it } from 'vitest'
import { fileExtension } from '../../src/config/fileTypeConfig'

/**
 * R3-BUG-003: private files come as signed links (…/x.pdf?expires=…&signature=…),
 * so the extension is read from the path, not from the end of the whole link.
 */
describe('fileExtension', () => {
  it.each([
    ['https://api.test/private-files/resources/ein.pdf?expires=1&signature=abc', 'pdf'],
    ['https://api.test/storage/resources/EIN.PDF', 'pdf'],
    ['resources/7/guide.docx#page=2', 'docx'],
    ['https://api.test/private-files/resources/archive.tar.gz?signature=a.b', 'gz'],
    ['https://api.test/files/no-extension?x=1.pdf', ''],
    ['', ''],
    [null, ''],
    [undefined, ''],
  ])('%s → "%s"', (path, expected) => {
    expect(fileExtension(path)).toBe(expected)
  })
})
