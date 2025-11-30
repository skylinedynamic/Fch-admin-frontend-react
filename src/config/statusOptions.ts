/**
 * Status Options Configuration
 */

export interface StatusOption {
    label: string;
    value: string;
}

export const STATUS: StatusOption[] = [
    { label: 'Active', value: 'Active' },
    { label: 'Inactive', value: 'Inactive' },
];
