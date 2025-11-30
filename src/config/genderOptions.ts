/**
 * Gender Options Configuration
 */

export interface GenderOption {
    label: string;
    value: string;
}

export const GENDER_OPTIONS: GenderOption[] = [
    { label: 'Male', value: 'male' },
    { label: 'Female', value: 'female' },
    { label: 'Other', value: 'other' },
];
