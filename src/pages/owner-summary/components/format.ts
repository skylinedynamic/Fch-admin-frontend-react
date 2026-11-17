import { formatCurrency } from '../../../utils/helper';

/** Whole dollars, for tables and line items: $120,000. */
export const money = (value: number | null | undefined): string => formatCurrency(value ?? 0, '$', 1, 0);

/** Headline figures: $950, $14.3K, $2.31M. */
export const compactMoney = (value: number | null | undefined): string => {
    const v = value ?? 0;
    const abs = Math.abs(v);
    if (abs >= 1_000_000) return `$${(v / 1_000_000).toFixed(2)}M`;
    if (abs >= 1_000) return `$${(v / 1_000).toFixed(1)}K`;
    return money(v);
};

export const count = (value: number, one: string, many: string): string => `${value.toLocaleString()} ${value === 1 ? one : many}`;

export type DeltaTone = 'up' | 'down' | 'flat';

/** "+12%" against the previous period; "new" when there was nothing before. */
export const delta = (current: number, previous: number): { text: string; tone: DeltaTone } => {
    if (previous === 0) {
        return current === 0 ? { text: 'no change', tone: 'flat' } : { text: 'new', tone: 'up' };
    }
    const pct = Math.round(((current - previous) / previous) * 100);
    if (pct === 0) return { text: '0%', tone: 'flat' };
    return { text: `${pct > 0 ? '+' : ''}${pct}%`, tone: pct > 0 ? 'up' : 'down' };
};

/** Share of a whole, as a whole percent. */
export const percent = (part: number, whole: number): number => (whole > 0 ? Math.round((part / whole) * 100) : 0);

/** "Nov" from "2026-11". */
export const monthShort = (month: string): string => {
    const [year, m] = month.split('-').map(Number);
    return new Date(Date.UTC(year, m - 1, 1)).toLocaleString('en-US', { month: 'short', timeZone: 'UTC' });
};

/** The API sends a field's errors as a list or, on some requests, as one string. */
export const firstMessage = (value: unknown): string | undefined =>
    (Array.isArray(value) ? value[0] : value) as string | undefined;

/** How many days a range of Y-m-d dates covers, counting both ends. */
export const daysInRange = (from: string, to: string): number =>
    Math.round((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / 86_400_000) + 1;

/** The same day a year ago up to the given day, as local dates; 29 Feb falls back to the 28th. */
export const lastYearRange = (today: Date = new Date()): { from: Date; to: Date } => {
    const year = today.getFullYear() - 1;
    const month = today.getMonth();
    const lastDayThen = new Date(year, month + 1, 0).getDate();

    return {
        from: new Date(year, month, Math.min(today.getDate(), lastDayThen)),
        to: new Date(today.getFullYear(), month, today.getDate()),
    };
};

/** "1 – 30 Nov 2026" from two Y-m-d dates. */
export const dateRange = (from: string, to: string): string => {
    const f = new Date(`${from}T00:00:00Z`);
    const t = new Date(`${to}T00:00:00Z`);
    const day = (d: Date) => d.getUTCDate();
    const mon = (d: Date) => d.toLocaleString('en-US', { month: 'short', timeZone: 'UTC' });
    const sameYear = f.getUTCFullYear() === t.getUTCFullYear();
    const sameMonth = sameYear && f.getUTCMonth() === t.getUTCMonth();

    if (from === to) return `${day(t)} ${mon(t)} ${t.getUTCFullYear()}`;
    if (sameMonth) return `${day(f)} – ${day(t)} ${mon(t)} ${t.getUTCFullYear()}`;
    if (sameYear) return `${day(f)} ${mon(f)} – ${day(t)} ${mon(t)} ${t.getUTCFullYear()}`;
    return `${day(f)} ${mon(f)} ${f.getUTCFullYear()} – ${day(t)} ${mon(t)} ${t.getUTCFullYear()}`;
};
