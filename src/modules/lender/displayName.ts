type NamedLender = { name?: string | null; legal_name?: string | null; display_name?: string | null };

/**
 * How a lender is shown everywhere: "Lender Name - Legal Name" (R2 BUG-008).
 * Two lenders may share a name, never a legal name, so this tells them apart.
 * The API sends it as `display_name`; it is built here when a payload has none.
 */
export const lenderDisplayName = (lender?: NamedLender | null): string => {
    if (!lender) return '';
    if (lender.display_name) return lender.display_name;

    const name = (lender.name ?? '').trim();
    const legalName = (lender.legal_name ?? '').trim();
    if (!legalName) return name;
    return name ? `${name} - ${legalName}` : legalName;
};
