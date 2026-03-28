export interface FileIconConfig {
    icon: string;
    color: string;
}

export const getFileIconConfig = (fileName: string): FileIconConfig => {
    if (!fileName) return { icon: 'ri-file-text-line', color: 'text-secondary' };

    const ext = fileName.split('.').pop()?.toLowerCase();

    switch (ext) {
        case 'pdf':
            return { icon: 'ri-file-pdf-line', color: 'text-danger' };
        case 'png':
        case 'jpg':
        case 'jpeg':
        case 'gif':
        case 'webp':
        case 'svg':
            return { icon: 'ri-image-line', color: 'text-primary' };
        case 'xls':
        case 'xlsx':
        case 'csv':
            return { icon: 'ri-file-excel-line', color: 'text-success' };
        case 'doc':
        case 'docx':
            return { icon: 'ri-file-word-line', color: 'text-info' };
        case 'ppt':
        case 'pptx':
            return { icon: 'ri-file-ppt-line', color: 'text-warning' };
        case 'zip':
        case 'rar':
            return { icon: 'ri-file-zip-line', color: 'text-warning' };
        case 'txt':
            return { icon: 'ri-file-text-line', color: 'text-secondary' };
        default:
            return { icon: 'ri-file-line', color: 'text-primary' };
    }
};
