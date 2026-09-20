/**
 * Formats a currency value with a symbol, conversion rate, and specific decimal precision.
 * 
 * @param value - The raw numeric value (default 0)
 * @param currencySymbol - The currency symbol to display (default '$')
 * @param conversionRate - The rate to multiply the value by (default 1)
 * @param decimalPoint - Number of decimal places (default 2)
 * @returns Formatted currency string
 */
export const formatCurrency = (
    value: number | string | null = 0,
    currencySymbol: string = '$',
    conversionRate: number | string | null = 1,
    decimalPoint: number = 2
): string => {
    const numValue = Number(value) || 0;
    const numRate = Number(conversionRate) || 1;
    const result = numValue * numRate;

    return `${currencySymbol}${result.toLocaleString(undefined, {
        minimumFractionDigits: decimalPoint,
        maximumFractionDigits: decimalPoint,
    })}`;
};

/**
 * Parse a date-only API value ("YYYY-MM-DD") as a LOCAL calendar date.
 *
 * `new Date("2026-09-07")` is parsed by JS as midnight UTC, which in any zone
 * behind UTC is the previous day locally - so a plain comparison locks a user
 * out, or flags a bill overdue, a full day early. Date-only values carry no
 * zone, so they must be read as the same calendar day everywhere.
 */
export const parseDateOnly = (value?: string | null): Date | null => {
    if (!value) return null;

    const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(value).trim());
    if (match) {
        const [, year, month, day] = match;
        return new Date(Number(year), Number(month) - 1, Number(day));
    }

    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return null;
    parsed.setHours(0, 0, 0, 0);
    return parsed;
};

/** Today as a local midnight Date, for comparing against parseDateOnly(). */
export const startOfToday = (): Date => {
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    return now;
};
