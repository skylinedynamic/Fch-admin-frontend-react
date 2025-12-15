export const FILE_MANAGER_CONFIG = {
  MAX_FILE_SIZE: 20 * 1024 * 1024, // 20MB
  MAX_NAME_LENGTH: 20,
  ALLOWED_EXTENSIONS: [
    // Images
    'jpg', 'jpeg', 'png', 'svg', 'gif', 'webp', 'bmp',
    // Documents
    'doc', 'docx', 'pdf', 'txt',
    // Data
    'xls', 'xlsx', 'csv',
    // Archives
    'zip',
    // Videos
    'mp4', 'mov', 'avi', 'mkv', 'webm', 'wmv', 'flv'
  ]
}
