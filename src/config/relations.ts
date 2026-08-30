/**
 * Relation Options Configuration
 * Options for contact person relationships
 */

export interface RelationOption {
    label: string;
    value: string;
}

export const relationOptions: RelationOption[] = [
    { label: 'Partner', value: 'Partner' },
    { label: 'Co-Owner', value: 'Co-Owner' },
    { label: 'Wife/Husband', value: 'Wife/Husband' },
    { label: 'Employee', value: 'Employee' },
    { label: 'Other', value: 'Other' }
];
