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

/** "1 – 30 Nov 2026" from two Y-m-d dates. */
export const dateRange = (from: string, to: string): string => {
    const f = new Date(`${from}T00:00:00Z`);
    const t = new Date(`${to}T00:00:00Z`);
    const day = (d: Date) => d.getUTCDate();
    const mon = (d: Date) => d.toLocaleString('en-GB', { month: 'short', timeZone: 'UTC' });
    const sameYear = f.getUTCFullYear() === t.getUTCFullYear();
    const sameMonth = sameYear && f.getUTCMonth() === t.getUTCMonth();

    if (sameMonth) return `${day(f)} – ${day(t)} ${mon(t)} ${t.getUTCFullYear()}`;
    if (sameYear) return `${day(f)} ${mon(f)} – ${day(t)} ${mon(t)} ${t.getUTCFullYear()}`;
    return `${day(f)} ${mon(f)} ${f.getUTCFullYear()} – ${day(t)} ${mon(t)} ${t.getUTCFullYear()}`;
};
