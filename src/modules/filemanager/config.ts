export const FILE_MANAGER_CONFIG = {
  MAX_FILE_SIZE: 20 * 1024 * 1024, // 20MB
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
