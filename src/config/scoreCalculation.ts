export interface ScoreTierLabel {
    sortOrder: number;
    label: string;
}

export const STATIC_TIER_LABELS: Record<string, ScoreTierLabel[]> = {
    revenue_strength: [
        { sortOrder: 1, label: 'Strong' },
        { sortOrder: 2, label: 'Moderate' },
        { sortOrder: 3, label: 'Limited' },
        { sortOrder: 4, label: 'Weak' },
    ],
    tradeline_depth: [
        { sortOrder: 1, label: 'Multiple High-Limit & Installment Depth' },
        { sortOrder: 2, label: 'Good Depth with High-Limit account' },
        { sortOrder: 3, label: 'Moderate Depth' },
        { sortOrder: 4, label: 'Thin File' },
    ],
    banking_relationships: [
        { sortOrder: 1, label: 'Strong' },
        { sortOrder: 2, label: 'Moderate' },
        { sortOrder: 3, label: 'Limited' },
        { sortOrder: 4, label: 'None' },
    ],
    time_in_business: [
        { sortOrder: 1, label: 'Established' },
        { sortOrder: 2, label: 'Mature' },
        { sortOrder: 3, label: 'Young' },
        { sortOrder: 4, label: 'Early Stage' },
        { sortOrder: 5, label: 'Startup' },
    ],
};
