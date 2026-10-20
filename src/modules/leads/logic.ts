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
