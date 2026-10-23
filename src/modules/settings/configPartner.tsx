import React, { createContext, useContext } from 'react';

/**
 * Whose settings the settings screens work on.
 *
 * The Settings page has no provider: every screen works on the signed-in
 * user's own partner, as it always has. Partner profile › Configuration wraps
 * the same screens in a ConfigPartnerProvider, and the settings hooks and
 * services then name that partner (`partner_id`) on every call.
 */
export type ConfigPartner = {
    id: number;
    company_name?: string | null;
    partner_type?: string | null;
    is_host?: number | boolean | null;
    /** Shown in the Configuration tab's partner summary. */
    full_name?: string | null;
    email?: string | null;
    phone_number?: string | null;
    status?: string | null;
};

const ConfigPartnerContext = createContext<ConfigPartner | null>(null);

export const ConfigPartnerProvider: React.FC<{ partner: ConfigPartner; children: React.ReactNode }> = ({ partner, children }) => (
    <ConfigPartnerContext.Provider value={partner}>{children}</ConfigPartnerContext.Provider>
);

/** The partner being configured for, or null on the user's own Settings page. */
export const useConfigPartner = (): ConfigPartner | null => useContext(ConfigPartnerContext);

/** The id to send as `partner_id`, or undefined for the user's own partner. */
export const useConfigPartnerId = (): number | undefined => useConfigPartner()?.id;
