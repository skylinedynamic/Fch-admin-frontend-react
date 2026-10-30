import type { MailConfiguration, MailProviderOption, SaveMailConfigurationPayload } from '../../../../modules/settings/types';

/** Every form value as typed, keyed by field. */
export type MailFormState = Record<string, string>;

/**
 * What the form shows, and sends back, in place of a stored secret (the API only
 * says one is stored, as `has_<field>`). Sending
 * it back unchanged keeps the stored password.
 */
export const SECRET_MASK = '••••••••';

/**
 * The form for one provider. A stored secret shows as the mask - the API never
 * returns it in clear - and saving the mask back keeps it.
 */
export const toMailFormState = (
    provider: MailProviderOption | undefined,
    configuration: MailConfiguration | null,
    keep: Partial<MailFormState> = {}
): MailFormState => {
    const state: MailFormState = {
        from_address: keep.from_address ?? String(configuration?.from_address ?? ''),
        bcc_emails: keep.bcc_emails ?? String(configuration?.bcc_emails ?? ''),
    };

    for (const field of provider?.fields ?? []) {
        const sameProvider = configuration?.provider === provider?.value;
        const saved = sameProvider ? configuration?.[field.secret ? `has_${field.key}` : field.key] : null;
        if (field.secret) {
            state[field.key] = saved ? SECRET_MASK : '';
        } else {
            state[field.key] = saved === null || saved === undefined ? '' : String(saved);
        }
    }

    // A select with nothing saved starts on its first option, as it shows.
    for (const field of provider?.fields ?? []) {
        if (field.type === 'select' && state[field.key] === '' && field.options.length > 0) {
            state[field.key] = field.options[0].value;
        }
    }

    return state;
};

/** Whether the form says anything other than what is saved. */
export const isMailFormChanged = (form: MailFormState, saved: MailFormState): boolean =>
    Object.keys({ ...form, ...saved }).some((key) => (form[key] ?? '') !== (saved[key] ?? ''));

/** What the API takes: numbers as numbers, an empty BCC list as null. */
export const toMailPayload = (provider: MailProviderOption, form: MailFormState): SaveMailConfigurationPayload => {
    const payload: SaveMailConfigurationPayload = {
        provider: provider.value,
        from_address: form.from_address.trim(),
        bcc_emails: form.bcc_emails.trim() === '' ? null : form.bcc_emails.trim(),
    };

    for (const field of provider.fields) {
        const value = form[field.key] ?? '';
        payload[field.key] = field.type === 'number' && value.trim() !== '' && !Number.isNaN(Number(value))
            ? Number(value)
            : value;
    }

    return payload;
};
