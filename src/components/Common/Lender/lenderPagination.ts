/** Rows per page the Lender Information table offers. */
export const LENDER_PAGE_SIZES = [10, 25, 50];

export type Page<T> = {
    rows: T[];
    /** The page shown: the one asked for, kept between 1 and the last page. */
    page: number;
    pageCount: number;
    total: number;
    /** "Showing from to to of total" - 0 to 0 when there is nothing. */
    from: number;
    to: number;
};

/**
 * One page of the lenders (12 at 10 a page: page 2 is lenders 11-12). A page
 * past the end (a filter left fewer rows) shows the last page, so the table
 * is never empty while lenders match.
 */
export function paginate<T>(items: T[], page: number, perPage: number): Page<T> {
    const total = items.length;
    const pageCount = Math.max(1, Math.ceil(total / perPage));
    const current = Math.min(Math.max(1, page), pageCount);
    const start = (current - 1) * perPage;
    const rows = items.slice(start, start + perPage);

    return { rows, page: current, pageCount, total, from: total ? start + 1 : 0, to: start + rows.length };
}
