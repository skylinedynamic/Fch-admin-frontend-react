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
