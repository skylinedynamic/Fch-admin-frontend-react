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

export interface ScoreModel {
    id: number;
    slug: string;
    name: string;
    description: string | null;
    pivot: { weight: number; sort_order: number };
    [key: string]: any;
}

export interface ScoreFactorTier {
    id: number;
    label: string | null;
    min_value: number | null;
    max_value: number | null;
    numeric_value: number | null;
    conditions: any;
    sort_order: number;
}

export interface ScoreFactor {
    id: number;
    slug: string;
    name: string;
    description: string | null;
    unit: string | null;
    sort_order: number;
    subscore_tiers: ScoreFactorTier[];
    [key: string]: any;
}

export interface ScoreConfigItem {
    id: number;
    partner_id: number | null;
    score_model_id: number | null;
    factor_slug: string | null;
    category: string;
    label: string | null;
    min_value: number | null;
    max_value: number | null;
    numeric_value: number | null;
    sort_order: number;
    conditions?: any;
}

export interface ScoreConfiguration {
    models: ScoreModel[];
    factors: ScoreFactor[];
    band_mappings: ScoreConfigItem[];
    readiness_bands: ScoreConfigItem[];
    play_eligibility: ScoreConfigItem[];
    late_payment_modifiers?: ScoreConfigItem[];
    probability_factors?: ScoreFactor[];
    odds_factors?: ScoreFactor[];
    startup_revenue_strength?: ScoreConfigItem;
    next_play_delay?: number;
    time_settings?: any[];
}

export interface ScoreConfigurationResponse {
    status: boolean;
    message: string;
    data: ScoreConfiguration;
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
    credit_profile_weight_fico?: string;
    credit_profile_weight_utilization?: string;
    credit_profile_weight_time_in_business?: string;
    credit_profile_weight_revenue_strength?: string;
    credit_profile_weight_tradeline_depth?: string;
    credit_profile_weight_banking_relationships?: string;
    
    // FICO ranges
    credit_profile_fico_subscore_780_plus?: string;
    credit_profile_fico_subscore_760_779?: string;
    credit_profile_fico_subscore_740_759?: string;
    credit_profile_fico_subscore_720_739?: string;
    credit_profile_fico_subscore_700_719?: string;
    credit_profile_fico_subscore_680_699?: string;
    credit_profile_fico_subscore_660_679?: string;
    credit_profile_fico_subscore_below_660?: string;

    // Utilization ranges
    credit_profile_util_subscore_0_5?: string;
    credit_profile_util_subscore_5_10?: string;
    credit_profile_util_subscore_10_20?: string;
    credit_profile_util_subscore_20_30?: string;
    credit_profile_util_subscore_30_40?: string;
    credit_profile_util_subscore_above_40?: string;

    // Time in Business ranges
    credit_profile_time_subscore_36_plus?: string;
    credit_profile_time_subscore_24_35?: string;
    credit_profile_time_subscore_12_23?: string;
    credit_profile_time_subscore_6_11?: string;
    credit_profile_time_subscore_below_6?: string;

    // Revenue strength categories
    credit_profile_rev_subscore_strong?: string;
    credit_profile_rev_subscore_moderate?: string;
    credit_profile_rev_subscore_limited?: string;
    credit_profile_rev_subscore_weak?: string;

    // Tradeline Depth categories
    credit_profile_trade_subscore_multiple_high?: string;
    credit_profile_trade_subscore_good_depth?: string;
    credit_profile_trade_subscore_moderate?: string;
    credit_profile_trade_subscore_thin?: string;

    // Banking Relationship categories
    credit_profile_bank_subscore_strong?: string;
    credit_profile_bank_subscore_established?: string;
    credit_profile_bank_subscore_basic?: string;
    credit_profile_bank_subscore_weak?: string;

    // Play Eligibility Matrix FICO thresholds
    credit_profile_play_min_fico_recovery?: string;
    credit_profile_play_min_fico_foundation?: string;
    credit_profile_play_min_fico_startup?: string;
    credit_profile_play_min_fico_zerocost?: string;
    credit_profile_play_min_fico_relationship?: string;
    credit_profile_play_min_fico_investor?: string;
    credit_profile_play_min_fico_executive?: string;
    credit_profile_play_min_fico_acquisition?: string;
    credit_profile_play_min_fico_elite?: string;

    // Rule threshold parameters
    credit_profile_rule_fico_t1?: string;
    credit_profile_rule_fico_t2?: string;
    credit_profile_rule_fico_t3?: string;
    credit_profile_rule_fico_t4?: string;
    credit_profile_rule_fico_t5?: string;
    credit_profile_rule_fico_t6?: string;
    credit_profile_rule_fico_t7?: string;

    credit_profile_rule_util_t1?: string;
    credit_profile_rule_util_t2?: string;
    credit_profile_rule_util_t3?: string;
    credit_profile_rule_util_t4?: string;
    credit_profile_rule_util_t5?: string;

    credit_profile_rule_time_t1?: string;
    credit_profile_rule_time_t2?: string;
    credit_profile_rule_time_t3?: string;
    credit_profile_rule_time_t4?: string;

    credit_profile_rule_rev_strong_bus?: string;
    credit_profile_rule_rev_strong_pers?: string;
    credit_profile_rule_rev_mod_bus?: string;
    credit_profile_rule_rev_mod_pers?: string;
    credit_profile_rule_rev_lim_bus?: string;
    credit_profile_rule_rev_lim_pers?: string;

    credit_profile_rule_trade_multi_accounts?: string;
    credit_profile_rule_trade_multi_high_limit_count?: string;
    credit_profile_rule_trade_multi_high_limit_amount?: string;
    credit_profile_rule_trade_good_accounts?: string;
    credit_profile_rule_trade_good_high_limit_count?: string;
    credit_profile_rule_trade_good_high_limit_amount?: string;
    credit_profile_rule_trade_mod_accounts_min?: string;
    credit_profile_rule_trade_mod_accounts_max?: string;

    credit_profile_rule_bank_strong_years?: string;
    credit_profile_rule_bank_established_months?: string;
    credit_profile_rule_bank_basic_months?: string;
}
