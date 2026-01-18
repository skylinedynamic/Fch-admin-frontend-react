export interface SettingsData {
    id: number;
    partner_id: number;
    card_no: string | null;
    card_name: string | null;
    card_expiry: string | null;
    card_cvv: string | null;
    currency: string | null;
    status: string;
    stripe_key: string | null;
    stripe_secret: string | null;
    payment_method: string;
    configuration: {
        theme: string;
        notifications: boolean;
    };
    created_at: string;
    updated_at: string;
    deleted_at: string | null;
}

export interface UpdateSettingsPayload {
    card_no?: string;
    card_name?: string;
    card_expiry?: string;
    card_cvv?: string;
    currency?: string;
    stripe_key?: string;
    stripe_secret?: string;
    configuration?: {
        theme?: string;
        notifications?: boolean;
    };
}
