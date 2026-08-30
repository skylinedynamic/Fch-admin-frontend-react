export interface FileTypeConfig {
    icon: string;
    color: string;
    bg: string;
}

export const fileTypeConfig: Record<string, FileTypeConfig> = {
    // Archives
    zip: { icon: 'ri-file-zip-fill', color: 'text-primary', bg: 'bg-primary-subtle' },
    rar: { icon: 'ri-file-zip-fill', color: 'text-primary', bg: 'bg-primary-subtle' },
    '7z': { icon: 'ri-file-zip-fill', color: 'text-primary', bg: 'bg-primary-subtle' },

    // Documents
    pdf: { icon: 'ri-file-pdf-fill', color: 'text-danger', bg: 'bg-danger-subtle' },
    doc: { icon: 'ri-file-word-fill', color: 'text-primary', bg: 'bg-primary-subtle' },
    docx: { icon: 'ri-file-word-fill', color: 'text-primary', bg: 'bg-primary-subtle' },
    txt: { icon: 'ri-file-word-fill', color: 'text-primary', bg: 'bg-primary-subtle' },
    rtf: { icon: 'ri-file-word-fill', color: 'text-primary', bg: 'bg-primary-subtle' },
    odt: { icon: 'ri-file-word-fill', color: 'text-primary', bg: 'bg-primary-subtle' },

    // Spreadsheets
    xls: { icon: 'ri-file-excel-fill', color: 'text-success', bg: 'bg-success-subtle' },
    xlsx: { icon: 'ri-file-excel-fill', color: 'text-success', bg: 'bg-success-subtle' },
    xsl: { icon: 'ri-file-excel-fill', color: 'text-success', bg: 'bg-success-subtle' },
    csv: { icon: 'ri-file-excel-fill', color: 'text-success', bg: 'bg-success-subtle' },

    // Videos
    mp4: { icon: 'ri-video-line', color: 'text-secondary', bg: 'bg-secondary-subtle' },
    mkv: { icon: 'ri-video-line', color: 'text-secondary', bg: 'bg-secondary-subtle' },
    avi: { icon: 'ri-video-line', color: 'text-secondary', bg: 'bg-secondary-subtle' },
    mov: { icon: 'ri-video-line', color: 'text-secondary', bg: 'bg-secondary-subtle' },

    // Images
    png: { icon: 'ri-image-2-fill', color: 'text-danger', bg: 'bg-danger-subtle' },
    jpg: { icon: 'ri-image-2-fill', color: 'text-warning', bg: 'bg-warning-subtle' },
    jpeg: { icon: 'ri-image-2-fill', color: 'text-warning', bg: 'bg-warning-subtle' },
    gif: { icon: 'ri-image-2-fill', color: 'text-warning', bg: 'bg-warning-subtle' },
    webp: { icon: 'ri-image-2-fill', color: 'text-warning', bg: 'bg-warning-subtle' },
    svg: { icon: 'ri-image-2-fill', color: 'text-info', bg: 'bg-info-subtle' },
    heic: { icon: 'ri-image-2-fill', color: 'text-info', bg: 'bg-info-subtle' },
    heif: { icon: 'ri-image-2-fill', color: 'text-info', bg: 'bg-info-subtle' },
    avif: { icon: 'ri-image-2-fill', color: 'text-info', bg: 'bg-info-subtle' },

    // Others
    folder: { icon: 'ri-folder-line', color: 'text-info', bg: 'bg-info-subtle' },
    default: { icon: 'ri-file-text-fill', color: 'text-secondary', bg: 'bg-secondary-subtle' }
};

export const getFileConfig = (filePath: string): FileTypeConfig => {
    if (!filePath) return fileTypeConfig.default;

    // Handle URL or simple filename
    const fileName = filePath.split('/').pop() || '';
    // Remove query params if any
    const cleanFileName = fileName.split('?')[0];
    const ext = cleanFileName.split('.').pop()?.toLowerCase() || '';

    return fileTypeConfig[ext] || fileTypeConfig.default;
};

export const getFileTypeLabel = (filePath: string): string => {
    if (!filePath) return 'File';

    const fileName = filePath.split('/').pop() || '';
    const cleanFileName = fileName.split('?')[0];
    const ext = cleanFileName.split('.').pop()?.toUpperCase() || '';

    return `${ext} File`;
};
