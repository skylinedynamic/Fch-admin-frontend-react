import { describe, expect, it } from 'vitest'
import { FILE_MANAGER_CONFIG } from '../../../src/modules/filemanager/config'

/**
 * BUG-015 (QA round 2): an SVG can carry a <script> that runs when the file is
 * opened, so it is not a document. The API refuses it (config/uploads.php);
 * the file manager (CustomFileManager) refuses it first so nobody waits for
 * an upload to fail.
 */
describe('file manager upload types', () => {
  it('does not offer SVG, as the API refuses it', () => {
    expect(FILE_MANAGER_CONFIG.ALLOWED_EXTENSIONS).not.toContain('svg')
  })

  it('still offers documents and ordinary images, but not HTML', () => {
    expect(FILE_MANAGER_CONFIG.ALLOWED_EXTENSIONS).toEqual(expect.arrayContaining(['pdf', 'jpg', 'png', 'docx', 'xlsx']))
    expect(FILE_MANAGER_CONFIG.ALLOWED_EXTENSIONS).not.toContain('html')
  })
})
