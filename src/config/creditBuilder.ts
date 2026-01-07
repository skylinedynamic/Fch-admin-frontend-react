export interface ConfigOption {
    label: string;
    value: string;
}

export const CATEGORY_OPTIONS: ConfigOption[] = [
    { label: 'Financial', value: 'Financial' },
    { label: 'Supplies', value: 'Supplies' },
    { label: 'Services', value: 'Services' },
    { label: 'Logistics', value: 'Logistics' },
    { label: 'IT', value: 'IT' },
    { label: 'Office Supplies', value: 'Office Supplies' },
    { label: 'Industrial Supplies', value: 'Industrial Supplies' },
    { label: 'Technology', value: 'Technology' }
];

export const STATUS_OPTIONS: ConfigOption[] = [
    { label: 'Active', value: 'Active' },
    { label: 'Inactive', value: 'Inactive' }
];

export const REPORT_TO_OPTIONS: ConfigOption[] = [
    { label: 'D&B', value: 'D&B' },
    { label: 'Experian', value: 'Experian' },
    { label: 'Equifax', value: 'Equifax' }
];
