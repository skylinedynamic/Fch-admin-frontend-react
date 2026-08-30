import { toast } from 'react-toastify';

/**
 * MIME type mappings for various file extensions
 */
const mimeTypes: Record<string, string> = {
    // Images
    png: 'image/png',
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    gif: 'image/gif',
    webp: 'image/webp',
    svg: 'image/svg+xml',

    // Documents
    pdf: 'application/pdf',
    doc: 'application/msword',
    docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',

    // Spreadsheets
    xls: 'application/vnd.ms-excel',
    xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    xsl: 'application/vnd.ms-excel',
    csv: 'text/csv',

    // Videos
    mp4: 'video/mp4',
    mkv: 'video/x-matroska',
    avi: 'video/x-msvideo',
    mov: 'video/quicktime',

    // Archives
    zip: 'application/zip',
    rar: 'application/x-rar-compressed',
    '7z': 'application/x-7z-compressed',

    // Text
    txt: 'text/plain',
    json: 'application/json',
    xml: 'application/xml'
};

/**
 * Get MIME type for a file based on its extension
 */
export const getMimeType = (fileName: string): string => {
    if (!fileName) return 'application/octet-stream';

    const ext = fileName.split('.').pop()?.toLowerCase() || '';
    return mimeTypes[ext] || 'application/octet-stream';
};

/**
 * Download a file from blob response
 * @param blob - The blob data or response containing blob
 * @param fileName - Name to save the file as
 * @param mimeType - Optional MIME type (will be detected from fileName if not provided)
 */
export const downloadBlob = (blob: Blob, fileName: string, mimeType?: string): void => {
    const finalMimeType = mimeType || getMimeType(fileName);
    const finalBlob = blob instanceof Blob ? blob : new Blob([blob], { type: finalMimeType });

    const url = window.URL.createObjectURL(finalBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();

    // Cleanup
    setTimeout(() => {
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
    }, 100);
};

/**
 * Download file from URL using fetch (prevents browser redirect on 404)
 * Shows toast error if URL is missing, not found, or download fails
 */
export const downloadFromUrl = async (fileUrl: string, fileName: string): Promise<void> => {
    if (!fileUrl) {
        toast.error('Download failed: file URL is missing.');
        return;
    }
    try {
        const response = await fetch(fileUrl);
        if (!response.ok) {
            toast.error(`Download failed: file not found (${response.status}).`);
            return;
        }
        const blob = await response.blob();
        downloadBlob(blob, fileName);
    } catch (error) {
        console.error('Direct download failed:', error);
        toast.error('Download failed');
    }
};

/**
 * Universal file download handler
 * Attempts API download first, falls back to direct URL download
 * @param downloadFn - Async function that returns the file blob from API
 * @param fileName - Name to save the file as
 * @param filePath - Direct file URL (used as fallback)
 * @param options - Additional options
 */
export const handleFileDownload = async (
    downloadFn: () => Promise<any>,
    fileName: string,
    filePath?: string,
    options?: {
        showSuccess?: boolean;
        showError?: boolean;
        onSuccess?: () => void;
        onError?: (error: any) => void;
    }
): Promise<void> => {
    const {
        showSuccess = true,
        showError = true,
        onSuccess,
        onError
    } = options || {};

    try {
        // Try API download first
        const response = await downloadFn();

        // Handle blob response
        let blob: Blob;
        if (response.data instanceof Blob) {
            blob = response.data;
        } else {
            const mimeType = getMimeType(fileName);
            blob = new Blob([response.data], { type: mimeType });
        }

        downloadBlob(blob, fileName);



        onSuccess?.();
    } catch (error) {
        console.error("Download failed via API", error);

        // Try fallback to direct URL download
        if (filePath) {
            try {
                downloadFromUrl(filePath, fileName);



                onSuccess?.();
            } catch (fallbackError) {
                console.error("Direct download also failed", fallbackError);

                if (showError) {
                    toast.error("Failed to download document");
                }

                onError?.(fallbackError);
            }
        } else {
            if (showError) {
                toast.error("Failed to download document");
            }

            onError?.(error);
        }
    }
};
