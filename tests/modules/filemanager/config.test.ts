import { describe, expect, it } from 'vitest'
import { FILE_MANAGER_CONFIG, FILE_MANAGER_FOLDERS, allowedExtensionsFor, maxUploadSizeFor } from '../../../src/modules/filemanager/config'

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
 * R3-BUG-064: Branding says a logo may be "PNG, JPG, SVG or WebP", and the API
 * takes an SVG into a public folder (logos, branding - partners/...) after
 * stripping its scripts (UploadFileRequest: SafeUpload::image). The file
 * manager refused every SVG in the browser, so a logo could not be one. It
 * now follows the API: SVG into a public folder, never into a private
 * (documents) folder.
 */
describe('file manager upload types per folder', () => {
  it('takes an SVG into a public folder such as a partner\'s branding', () => {
    expect(allowedExtensionsFor(FILE_MANAGER_FOLDERS.PARTNERS)).toContain('svg')
    expect(allowedExtensionsFor('site-settings')).toContain('svg')
  })

  it('refuses an SVG into a private (documents) folder', () => {
    for (const folder of [FILE_MANAGER_FOLDERS.PARTNER_DOCUMENTS, 'borrowers', 'resources', 'funding-application', 'attachments']) {
      expect(allowedExtensionsFor(folder)).not.toContain('svg')
    }
  })

  it('refuses an SVG when the folder is not known', () => {
    expect(allowedExtensionsFor(undefined)).not.toContain('svg')
    expect(allowedExtensionsFor('')).not.toContain('svg')
  })

  it('takes the ordinary types into any folder, and never HTML', () => {
    for (const folder of [FILE_MANAGER_FOLDERS.PARTNERS, FILE_MANAGER_FOLDERS.PARTNER_DOCUMENTS, undefined]) {
      expect(allowedExtensionsFor(folder)).toEqual(expect.arrayContaining(['pdf', 'jpg', 'png', 'docx']))
      expect(allowedExtensionsFor(folder)).not.toContain('html')
    }
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
