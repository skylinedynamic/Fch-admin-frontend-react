import type { Lead } from './types';

/**
 * The lead details a conversion can't go ahead without - the ones the
 * missing-info form marks required. State and city are optional: the borrower
 * and partner records a lead converts into accept a blank address.
 */
export const LEAD_CONVERT_REQUIRED_FIELDS = ['contact_person', 'email', 'phone_number', 'country'] as const;

/** A lead, or the form holding one: any other fields may be there too. */
type ConvertFields = { [K in typeof LEAD_CONVERT_REQUIRED_FIELDS[number]]?: Lead[K] | null } & Record<string, unknown>;

/** Whether converting this lead must first ask for missing details. */
export function isMissingConvertInfo(lead: ConvertFields | null | undefined): boolean {
    if (!lead) return true;

    return LEAD_CONVERT_REQUIRED_FIELDS.some((field) => {
        const value = lead[field];
        return typeof value !== 'string' || value.trim() === '';
    });
}

/** Who is looking at a lead: whether they are the host, and their partner. */
type LeadViewer = { is_host?: boolean | number | null; partner_id?: string | number | null } | null | undefined;

/** A lead, as far as whose it is and who owns it. */
type LeadOwnership = {
    partner?: { id: number | string } | null;
    salesperson_id?: number | string | null;
    salesperson_name?: string | null;
} | null | undefined;

const isHostViewer = (viewer: LeadViewer): boolean => viewer?.is_host == 1;

/**
 * The partner whose team owns this lead, when it isn't the viewer's own: the
 * host working another partner's lead picks its owner from that partner's
 * team. Null means the viewer's own team.
 */
export function leadTeamPartnerId(viewer: LeadViewer, lead: LeadOwnership): number | null {
    const partnerId = lead?.partner?.id;
    if (!isHostViewer(viewer) || partnerId == null || partnerId == viewer?.partner_id) return null;
    return Number(partnerId);
}

/**
 * Whether the lead's type is shown: to the host, on every lead. Anyone else's
 * leads are all Borrower leads, so they are never asked.
 */
export function showsLeadType(viewer: LeadViewer): boolean {
    return isHostViewer(viewer);
}

/**
 * Whether the lead's type is read-only: on another partner's lead, which is
 * always a Borrower lead, and on a converted lead, which already became a
 * borrower or partner of its type. fch-api refuses a change to either.
 */
export function isLeadTypeLocked(viewer: LeadViewer, lead: (LeadOwnership & { convert_to?: string | null }) | null | undefined): boolean {
    return !!lead?.convert_to || leadTeamPartnerId(viewer, lead) !== null;
}

/**
 * The Lead Owner options: the team, plus the lead's current owner when the
 * team doesn't include them, so the field never shows blank.
 */
export function leadOwnerOptions(
    users: { id: number | string; name: string }[] | null | undefined,
    lead: LeadOwnership,
): { label: string; value: number | string }[] {
    const options = (users ?? []).map((user) => ({ label: user.name, value: user.id }));
    const ownerId = lead?.salesperson_id;
    if (ownerId != null && lead?.salesperson_name && !options.some((option) => option.value == ownerId)) {
        options.push({ label: lead.salesperson_name, value: ownerId });
    }
    return options;
}

/** The platform's default country for a lead (Lead::DEFAULT_COUNTRY in the API). */
export const DEFAULT_LEAD_COUNTRY = 'United States';

/**
 * The country a lead's Contact Info form starts with: its own, else the
 * default. The default used to be shown without being put in the form, so a
 * save answered "Country is required." (R2 BUG-065).
 */
export function leadCountryFor(country: string | null | undefined): string {
    return country && country.trim() !== '' ? country : DEFAULT_LEAD_COUNTRY;
}
