export interface AccessTimeOption {
    label: string;
    value: string;
}

export interface DayOption {
    label: string;
    value: string;
}

export const ACCESS_TIME_OPTIONS: AccessTimeOption[] = [
    { label: 'Morning', value: 'Morning' },
    { label: 'Evening', value: 'Evening' },
    { label: 'Day', value: 'Day' },
];

export const DAY_OPTIONS: DayOption[] = Array.from({ length: 60 }, (_, i) => ({
    label: `Day ${i + 1}`,
    value: String(i + 1),
}));

export const DAY_TIME_OPTIONS: AccessTimeOption[] = [
    { label: 'Morning', value: 'Morning' },
    { label: 'Evening', value: 'Evening' },
];
