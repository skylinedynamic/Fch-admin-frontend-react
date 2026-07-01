export interface AccessTimeOption {
    label: string;
    value: string;
}

export interface DayOption {
    label: string;
    value: string;
}

export const ACCESS_TIME = {
    MORNING: 'Morning',
    EVENING: 'Evening',
    ANYTIME: 'Anytime',
    DAY: 'Day',
} as const;

export const ACCESS_TIME_OPTIONS: AccessTimeOption[] = [
    { label: ACCESS_TIME.MORNING, value: ACCESS_TIME.MORNING },
    { label: ACCESS_TIME.EVENING, value: ACCESS_TIME.EVENING },
    { label: ACCESS_TIME.ANYTIME, value: ACCESS_TIME.ANYTIME },
    { label: ACCESS_TIME.DAY, value: ACCESS_TIME.DAY },
];

export const DAY_OPTIONS: DayOption[] = Array.from({ length: 60 }, (_, i) => ({
    label: `Day ${i + 1}`,
    value: String(i + 1),
}));

export const DAY_TIME_OPTIONS: AccessTimeOption[] = [
    { label: ACCESS_TIME.MORNING, value: ACCESS_TIME.MORNING },
    { label: ACCESS_TIME.EVENING, value: ACCESS_TIME.EVENING },
    { label: ACCESS_TIME.ANYTIME, value: ACCESS_TIME.ANYTIME },
];

export const PRE_FLIGHT_TASKS = [
    "Business Information",
    "EIN Verified",
    "Personal Credit Pulled",
    "Business Bank Account",
    "Identity Verified",
    "No Recent Derogatories"
];

export interface ScoreTierLabel {
    sortOrder: number;
    label: string;
}

export const SCORE_CATEGORIES = {
    MODEL_WEIGHT: 'model_weight',
    SUBSCORE_TIER: 'subscore_tier',
    READINESS_BAND: 'readiness_band',
    LATE_PAYMENT_MODIFIER: 'late_payment_modifier',
    TIME: 'time',
} as const;

export const SCORE_MODELS = {
    FUNDING_READINESS: 'funding_readiness',
    APPROVAL_PROBABILITY: 'approval_probability',
    APPROVAL_ODDS: 'approval_odds',
    GENERAL_SETTING: 'general_setting',
} as const;

export const SCORE_FACTORS = {
    FICO: 'fico',
    UTILIZATION: 'utilization',
    TIME_IN_BUSINESS: 'time_in_business',
    REVENUE_STRENGTH: 'revenue_strength',
    TRADELINE_DEPTH: 'tradeline_depth',
    BANKING_RELATIONSHIPS: 'banking_relationships',
    FICO_ABOVE_MINIMUM: 'fico_above_minimum',
    RECENT_INQUIRIES: 'recent_inquiries',
    BANKING_RELATIONSHIP: 'banking_relationship',
    REVENUE_INCOME: 'revenue_income',
} as const;

export const STATIC_TIER_LABELS: Record<string, ScoreTierLabel[]> = {
    [SCORE_FACTORS.REVENUE_STRENGTH]: [
        { sortOrder: 1, label: 'Strong' },
        { sortOrder: 2, label: 'Moderate' },
        { sortOrder: 3, label: 'Limited' },
        { sortOrder: 4, label: 'Weak' },
    ],
    [SCORE_FACTORS.TRADELINE_DEPTH]: [
        { sortOrder: 1, label: 'Multiple High-Limit & Installment Depth' },
        { sortOrder: 2, label: 'Good Depth with High-Limit account' },
        { sortOrder: 3, label: 'Moderate Depth' },
        { sortOrder: 4, label: 'Thin File' },
    ],
    [SCORE_FACTORS.BANKING_RELATIONSHIPS]: [
        { sortOrder: 1, label: 'Strong' },
        { sortOrder: 2, label: 'Moderate' },
        { sortOrder: 3, label: 'Limited' },
        { sortOrder: 4, label: 'None' },
    ],
    [SCORE_FACTORS.TIME_IN_BUSINESS]: [
        { sortOrder: 1, label: 'Established' },
        { sortOrder: 2, label: 'Mature' },
        { sortOrder: 3, label: 'Young' },
        { sortOrder: 4, label: 'Early Stage' },
        { sortOrder: 5, label: 'Startup' },
    ],
};
