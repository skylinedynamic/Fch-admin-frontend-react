export interface SettingsData {
    id: number;
    payment_mode: string;
    stripe_key_sandbox: string | null;
    stripe_secret_sandbox: string | null;
    stripe_key_production: string | null;
    stripe_secret_production: string | null;
    payment_method: string;

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
    stripe_key_sandbox?: string;
    stripe_secret_sandbox?: string;
    stripe_key_production?: string;
    stripe_secret_production?: string;
    payment_mode?: string;
    configuration?: {
        theme?: string;
        notifications?: boolean;
    };
}

export interface SendTestMailPayload {
    email: string;
    body: string;
}

export interface SendTestMailResponse {
    status: boolean;
    message: string;
    data: any[];
}

export interface AppConfigResponse<T = Record<string, string>> {
    status: boolean;
    message: string;
    data: T;
}

export interface MicroBiltConfig {
    microbilt_mode: string;
    microbilt_base_url_sandbox: string;
    microbilt_client_id_sandbox: string;
    microbilt_client_secret_sandbox: string;
    microbilt_base_url_production: string;
    microbilt_client_id_production: string;
    microbilt_client_secret_production: string;
}

