import { isAxiosError } from 'axios';

/** The API's own message for a failed request, else the given fallback. */
export function apiErrorMessage(error: unknown, fallback: string): string {
    if (isAxiosError(error)) {
        const message = error.response?.data?.message;
        if (typeof message === 'string' && message !== '') {
            return message;
        }
    }

    return fallback;
}

/**
 * Field errors of a 422 response, one message per field. The API sends a
 * string per field; Laravel's default is an array.
 */
export function apiFieldErrors(error: unknown): Record<string, string> | null {
    if (!isAxiosError(error) || error.response?.status !== 422) {
        return null;
    }

    const errors = error.response.data?.errors ?? {};

    return Object.fromEntries(
        Object.entries(errors).map(([field, message]) => [field, Array.isArray(message) ? String(message[0]) : String(message)])
    );
}
