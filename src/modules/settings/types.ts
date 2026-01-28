export interface SettingsData {
    id: number;
    payment_mode: string;
    stripe_key_sandbox: string | null;
    stripe_secret_sandbox: string | null;
    stripe_key_production: string | null;
    stripe_secret_production: string | null;
    payment_method: string;
    non_host_enrollment_price: string;
    non_host_enrollment_value?: string;
    status: number;
    configuration: {
        theme: string;
        notifications: boolean;
    };
    created_at: string;
}

export interface SettingsResponse {
    status: boolean;
    message: string;
    data: SettingsData;
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
