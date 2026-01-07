// Verification Status Options
export const VERIFICATION_STATUS = {
    PENDING: 'pending',
    PROCESSING: 'processing',
    COMPLETED: 'verified',
    REJECTED: 'rejected'
} as const;

export type VerificationStatus = typeof VERIFICATION_STATUS[keyof typeof VERIFICATION_STATUS];

// Tier Status Options
export interface TierStatusOption {
    label: string;
    value: string;
}

export const TIER_STATUS_OPTIONS: TierStatusOption[] = [
    { label: 'Active', value: 'Active' },
    { label: 'Inactive', value: 'Inactive' }
];
