export const FILE_MANAGER_CONFIG = {
  MAX_FILE_SIZE: 20 * 1024 * 1024, // 20MB
  // A picture may be up to 5 MB - the API's limit (config/uploads.php, BUG-014).
  MAX_PICTURE_SIZE: 5 * 1024 * 1024,
  PICTURE_EXTENSIONS: ['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp', 'heic', 'tiff', 'tif', 'ico', 'avif', 'svg'],
  MAX_NAME_LENGTH: 20,
  ALLOWED_EXTENSIONS: [
    // Images
    // No SVG here: it can carry a script, so a document may not be one
    // (BUG-015). A public folder (a logo) adds it: allowedExtensionsFor().
    'jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp', 'heic', 'tiff', 'tif', 'ico', 'avif',

    // Documents
    'doc', 'docx', 'pdf', 'txt', 'rtf', 'odt',

    // Data
    'xls', 'xlsx', 'csv', 'ods',

    // Archives
    'zip', 'rar', '7z',

    // Videos
    'mp4', 'mov', 'avi', 'mkv', 'webm', 'wmv', 'flv', 'm4v'
  ]
}

/** The largest file of this name the API takes: 5 MB for a picture, else 20 MB. */
export const maxUploadSizeFor = (fileName: string): number => {
  const extension = fileName.includes('.') ? fileName.split('.').pop()!.toLowerCase() : ''
  return FILE_MANAGER_CONFIG.PICTURE_EXTENSIONS.includes(extension)
    ? FILE_MANAGER_CONFIG.MAX_PICTURE_SIZE
    : FILE_MANAGER_CONFIG.MAX_FILE_SIZE
}

/**
 * The folder a file manager opens on (its entity_type). The API keeps each one
 * on its own disk: a partner's documents are private, its branding public.
 */
export const FILE_MANAGER_FOLDERS = {
  PARTNER_DOCUMENTS: 'partner-documents',
  PARTNERS: 'partners',
} as const

/**
 * Folders the API keeps private (fch-api config/files.php private_folders):
 * documents, never served without signing in. Every other folder is public -
 * logos and branding - and takes an SVG, which the API strips of its scripts
 * (UploadFileRequest: SafeUpload::image). Keep in step with that list.
 */
export const PRIVATE_FILE_MANAGER_FOLDERS: readonly string[] = [
  'audit',
  'borrowers',
  'credit-reports',
  'funding-application',
  FILE_MANAGER_FOLDERS.PARTNER_DOCUMENTS,
  'embed_forms',
  'attachments',
  'agreement-images',
  'resources',
]

const SVG_EXTENSION = 'svg'

/**
 * What may be uploaded into this folder (the file manager's entity_type):
 * the usual types, plus SVG into a public folder - an SVG logo (R3-BUG-064).
 * An unknown folder gets no SVG.
 */
export const allowedExtensionsFor = (folder?: string | null): string[] =>
  folder && !PRIVATE_FILE_MANAGER_FOLDERS.includes(folder)
    ? [...FILE_MANAGER_CONFIG.ALLOWED_EXTENSIONS, SVG_EXTENSION]
    : FILE_MANAGER_CONFIG.ALLOWED_EXTENSIONS
