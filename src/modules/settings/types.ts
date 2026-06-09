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

export interface ThemeConfigurations {
    favicon: string | null;
    favicon_full_url: string | null;
    primary_color: string | null;
    primary_logo: string | null;
    primary_logo_full_url: string | null;
    secondary_color: string | null;
    secondary_logo: string | null;
    secondary_logo_full_url: string | null;
    site_name: string | null;
    site_slogan: string | null;
}

export interface CreditProfileConfig {
    credit_profile_parser_mode: string;
    credit_profile_openai_api_key: string;
    credit_profile_openai_model: string;
}
