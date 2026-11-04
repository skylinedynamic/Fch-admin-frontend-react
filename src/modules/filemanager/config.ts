export const FILE_MANAGER_CONFIG = {
  MAX_FILE_SIZE: 20 * 1024 * 1024, // 20MB
  // A picture may be up to 5 MB - the API's limit (config/uploads.php, BUG-014).
  MAX_PICTURE_SIZE: 5 * 1024 * 1024,
  PICTURE_EXTENSIONS: ['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp', 'heic', 'tiff', 'tif', 'ico', 'avif', 'svg'],
  MAX_NAME_LENGTH: 20,
  ALLOWED_EXTENSIONS: [
    // Images
    // No SVG: it can carry a script, and the API refuses it (BUG-015).
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
} as const
