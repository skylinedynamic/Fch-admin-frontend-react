/**
 * Deleting a lookup entry a funding sequence still uses - a lender product
 * category (in its underwriting logic) or a funding group (sequences filed
 * under it). The list says how many sequences use each entry
 * (funding_sequences_count), so the dialog refuses at once instead of asking
 * "Are you sure?"; if it came into use after the list loaded, the API refuses
 * the delete (422, errors.blocked) and the same reason is shown.
 */

/** An entry kept because funding sequences use it. */
export interface InUseEntry {
    name: string;
    /** How many funding sequences use it. */
    count?: number;
}

/** In use by the list's count: what to say instead of "Are you sure?". */
export const inUseFromList = (item: { name: string; funding_sequences_count?: number | string }): InUseEntry | null => {
    const count = Number(item.funding_sequences_count) || 0;
    return count > 0 ? { name: item.name, count } : null;
};

/** The entry the API names in a 422 refusal (errors.blocked), if any. */
export const inUseFromError = (error: any): InUseEntry | null => {
    const blocked = error?.response?.data?.errors?.blocked;
    return error?.response?.status === 422 && Array.isArray(blocked) && blocked.length > 0
        ? { name: blocked[0].name, count: blocked[0].count }
        : null;
};

/** `"Term Loan" is used by 12 funding sequences and cannot be deleted. <fix>` */
export const inUseMessage = ({ name, count }: InUseEntry, fix: string): string => {
    const sequences = count ? `${count} funding sequence${count === 1 ? '' : 's'}` : 'a funding sequence';
    return `"${name}" is used by ${sequences} and cannot be deleted. ${fix}`;
};
