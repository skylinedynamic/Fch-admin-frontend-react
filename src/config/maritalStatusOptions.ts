/**
 * Marital Status Options Configuration
 */

export interface MaritalStatusOption {
    label: string;
    value: string;
}

export const MARITAL_STATUS_OPTIONS: MaritalStatusOption[] = [
    { label: 'Single', value: 'Single' },
    { label: 'Married', value: 'Married' },
    { label: 'Divorced', value: 'Divorced' },
    { label: 'Widowed', value: 'Widowed' },
];
