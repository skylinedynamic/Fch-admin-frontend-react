/**
 * Whether a number typed into a box has more digits after its decimal point
 * than `places`. "10.22" fits 2, "10.222" does not (BUG-076).
 */
export const hasMoreDecimalsThan = (value: string, places: number): boolean => {
    const point = value.indexOf('.');
    return point !== -1 && value.length - point - 1 > places;
};
