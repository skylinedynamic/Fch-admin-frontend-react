import { describe, expect, it } from 'vitest'
import { FILE_MANAGER_CONFIG, maxUploadSizeFor } from '../../../src/modules/filemanager/config'

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

/**
 * BUG-014 (QA round 2): a 12 MB file named .png was uploaded and set as a
 * profile picture. The API now takes a picture up to 5 MB and anything else up
 * to 20 MB (config/uploads.php); the file manager refuses a larger file before
 * uploading it.
 */
describe('file manager size limits', () => {
  it('allows a picture up to 5 MB, in any letter case', () => {
    expect(maxUploadSizeFor('photo.png')).toBe(5 * 1024 * 1024)
    expect(maxUploadSizeFor('SCAN.JPG')).toBe(5 * 1024 * 1024)
    expect(maxUploadSizeFor('qa-12mb.png')).toBe(FILE_MANAGER_CONFIG.MAX_PICTURE_SIZE)
  })

  it('allows any other file up to 20 MB', () => {
    expect(maxUploadSizeFor('statement.pdf')).toBe(20 * 1024 * 1024)
    expect(maxUploadSizeFor('clip.mp4')).toBe(FILE_MANAGER_CONFIG.MAX_FILE_SIZE)
    expect(maxUploadSizeFor('no-extension')).toBe(FILE_MANAGER_CONFIG.MAX_FILE_SIZE)
  })
})
