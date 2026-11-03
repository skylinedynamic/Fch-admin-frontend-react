import type { MatchedLender } from '../../../modules/application/types';
import { formatCurrency } from '../../../utils/helper';

export type LenderFilters = {
    search: string;
    category: string;
    lenderName: string;
};

/**
 * Everything a row shows, as it is shown - name, contact, category, match
 * analysis and each requirement ("450+", "$4,500+", "6 mo") - so a search
 * finds what the user can see in the table.
 */
export const lenderSearchText = (lender: MatchedLender): string => {
    const r = lender.requirements || ({} as MatchedLender['requirements']);
    return [
        lender.name,
        lender.phone,
        lender.email,
        lender.product_category,
        lender.score_text,
        lender.matches_fraction,
        lender.score != null ? `${lender.score}%` : null,
        r.min_fico != null ? `${r.min_fico}+ ${r.min_fico}` : null,
        r.min_revenue != null ? `${formatCurrency(r.min_revenue, '$', 1, 0)}+ ${r.min_revenue}` : null,
        r.min_tib != null ? `${r.min_tib} mo ${r.min_tib}` : null,
        r.min_deposit != null ? `${formatCurrency(r.min_deposit, '$', 1, 0)}+ ${r.min_deposit}` : null,
    ].filter(Boolean).join(' ').toLowerCase();
};

/**
 * The lenders matching every filter. Search: case-insensitive, trimmed, and
 * every word must appear somewhere in the row ("term loan 450" finds a Term
 * Loan lender needing FICO 450). Category and lender: exact.
 */
export const filterLenders = (lenders: MatchedLender[], filters: LenderFilters): MatchedLender[] => {
    const words = filters.search.trim().toLowerCase().split(/\s+/).filter(Boolean);

    return lenders.filter((lender) => {
        if (filters.category && lender.product_category !== filters.category) return false;
        if (filters.lenderName && lender.name !== filters.lenderName) return false;
        if (words.length === 0) return true;

        const text = lenderSearchText(lender);
        return words.every((word) => text.includes(word));
    });
};
