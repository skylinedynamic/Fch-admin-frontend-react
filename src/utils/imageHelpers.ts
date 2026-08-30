/**
 * Builds a full URL for an image/file path from the backend storage.
 * Handles existing full URLs, blobs, and relative paths.
 * 
 * @param path - The raw path or URL
 * @param fallback - Optional fallback value if path is empty (default: '')
 * @returns The resolved full URL
 */
export const buildStorageUrl = (path: any, fallback: string = ''): string => {
    if (!path || typeof path !== 'string') {
        return fallback;
    }

    if (path.startsWith('http') || path.startsWith('blob:') || path.startsWith('data:') || path.startsWith('/assets/')) {
        return path;
    }

    const STORAGE_URL = import.meta.env.VITE_STORAGE_URL || (import.meta.env.VITE_BASE_API_URL ? `${import.meta.env.VITE_BASE_API_URL}/storage` : '');

    // Clean up base URL and path
    const baseUrl = (STORAGE_URL.trim() || '/storage').replace(/\/+$/, '');
    const cleanPath = path.trim().replace(/^\/+/, '');

    // Construct full URL and remove any double slashes (except for http://)
    const fullUrl = `${baseUrl}/${cleanPath}`;
    const consolidatedUrl = fullUrl.replace(/([^:]\/)\/+/g, "$1");

    return encodeURI(consolidatedUrl);
};
