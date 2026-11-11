type NamedLender = { name?: string | null; legal_name?: string | null; display_name?: string | null; lender_code?: string | null };

/**
 * How a lender is named in every lender dropdown: "Lender Name - Lender Code"
 * (2026-11-11). Names and legal names may repeat; the Lender Code never does.
 * A lender without a Lender Code yet falls back to its usual name.
 */
export const lenderOptionLabel = (lender?: NamedLender | null): string => {
    if (!lender) return '';
    const code = (lender.lender_code ?? '').trim();
    if (!code) return lenderDisplayName(lender);

    const name = (lender.name ?? '').trim();
    return name ? `${name} - ${code}` : code;
};

/**
 * A lender as a dropdown shows it (design A): its name, and its Lender Code
 * apart. Without a code yet: "Lender Name - Legal Name" and no code.
 */
export const lenderOptionParts = (lender: NamedLender): { name: string; code: string | null } => {
    const code = (lender.lender_code ?? '').trim();
    if (!code) return { name: lenderDisplayName(lender), code: null };

    return { name: (lender.name ?? '').trim() || code, code };
};

/**
 * How a lender is shown in lists and tables: "Lender Name - Legal Name"
 * (R2 BUG-008). Since 2026-11-11 two lenders may share both; the Lender Code
 * tells them apart. The API sends it as `display_name`; it is built here
 * when a payload has none.
 */
export const lenderDisplayName = (lender?: NamedLender | null): string => {
    if (!lender) return '';
    if (lender.display_name) return lender.display_name;

    const name = (lender.name ?? '').trim();
    const legalName = (lender.legal_name ?? '').trim();
    if (!legalName) return name;
    return name ? `${name} - ${legalName}` : legalName;
};
