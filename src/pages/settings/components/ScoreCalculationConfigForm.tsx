import React, { useState, useEffect, useRef } from 'react';
import { toast } from 'react-toastify';
import { fetchScoreConfigurations, updateScoreConfigurations } from '../../../modules/settings/services';
import type { ScoreConfiguration, ScoreFactorTier } from '../../../modules/settings/types';
import { STATIC_TIER_LABELS } from '../../../config/scoreCalculation';

import { MicroBiltConfigSkeleton } from '../../../components/Loader/SpecificSkeletons';
import FundingReadinessTab from './ScoreCalculation/FundingReadinessTab';
import ApprovalProbabilityTab from './ScoreCalculation/ApprovalProbabilityTab';
import ApprovalOddsTab from './ScoreCalculation/ApprovalOddsTab';
import GeneralSettingTab from './ScoreCalculation/GeneralSettingTab';

export interface FormData {
    weight_fico: string;
    weight_utilization: string;
    weight_time_in_business: string;
    weight_revenue_strength: string;
    weight_tradeline_depth: string;
    weight_banking_relationships: string;

    // FICO subscores
    fico_subscore_780_plus: string;
    fico_subscore_760_779: string;
    fico_subscore_740_759: string;
    fico_subscore_720_739: string;
    fico_subscore_700_719: string;
    fico_subscore_680_699: string;
    fico_subscore_660_679: string;
    fico_subscore_below_660: string;

    // Utilization subscores
    util_subscore_0_5: string;
    util_subscore_5_10: string;
    util_subscore_10_20: string;
    util_subscore_20_30: string;
    util_subscore_30_40: string;
    util_subscore_above_40: string;

    // Time in Business subscores
    time_subscore_36_plus: string;
    time_subscore_24_35: string;
    time_subscore_12_23: string;
    time_subscore_6_11: string;
    time_subscore_below_6: string;

    // Revenue subscores
    rev_subscore_strong: string;
    rev_subscore_moderate: string;
    rev_subscore_limited: string;
    rev_subscore_weak: string;

    // Tradeline Depth subscores
    trade_subscore_multiple_high: string;
    trade_subscore_good_depth: string;
    trade_subscore_moderate: string;
    trade_subscore_thin: string;

    // Banking Relationship subscores
    bank_subscore_strong: string;
    bank_subscore_established: string;
    bank_subscore_basic: string;
    bank_subscore_weak: string;

    // Banking Relationship rule fields (per tier)
    bank_strong_accounts: string;
    bank_strong_months: string;
    bank_established_accounts: string;
    bank_established_months: string;
    bank_basic_accounts: string;
    bank_weak_accounts: string;

    // Rule threshold parameters
    fico_rule_t1: string;
    fico_rule_t2: string;
    fico_rule_t3: string;
    fico_rule_t4: string;
    fico_rule_t5: string;
    fico_rule_t6: string;
    fico_rule_t7: string;

    util_rule_t1: string;
    util_rule_t2: string;
    util_rule_t3: string;
    util_rule_t4: string;
    util_rule_t5: string;

    time_rule_t1: string;
    time_rule_t2: string;
    time_rule_t3: string;
    time_rule_t4: string;

    rev_rule_t1: string;
    rev_rule_t2: string;
    rev_rule_t3: string;
    rev_rule_personal_t1: string;
    rev_rule_personal_t2: string;
    rev_rule_personal_t3: string;

    trade_rule_multi_accounts: string;
    trade_rule_multi_high_limit_count: string;
    trade_rule_multi_high_limit_amount: string;
    trade_rule_good_accounts: string;
    trade_rule_good_high_limit_count: string;
    trade_rule_good_high_limit_amount: string;
    trade_rule_mod_accounts_min: string;
    trade_rule_mod_accounts_max: string;

    // Readiness Bands
    fund_readiness_bucket_a_label: string;
    fund_readiness_bucket_a_min_score: string;
    fund_readiness_bucket_a_color: string;
    fund_readiness_bucket_b_label: string;
    fund_readiness_bucket_b_min_score: string;
    fund_readiness_bucket_b_color: string;
    fund_readiness_bucket_c_label: string;
    fund_readiness_bucket_c_min_score: string;
    fund_readiness_bucket_c_color: string;
    fund_readiness_bucket_d_label: string;
    fund_readiness_bucket_d_min_score: string;
    fund_readiness_bucket_d_color: string;
    fund_readiness_bucket_e_label: string;
    fund_readiness_bucket_e_color: string;

    // Late Payment Modifiers
    late_30_1_qty: string;
    late_30_1_val: string;
    late_30_1_lbl: string;
    late_30_2_plus_qty: string;
    late_30_2_plus_val: string;
    late_30_2_plus_lbl: string;
    late_60_1_qty: string;
    late_60_1_val: string;
    late_60_1_lbl: string;
    late_60_2_plus_qty: string;
    late_60_2_plus_val: string;
    late_60_2_plus_lbl: string;
    late_90_1_qty: string;
    late_90_1_val: string;
    late_90_1_lbl: string;
    late_90_2_plus_qty: string;
    late_90_2_plus_val: string;
    late_90_2_plus_lbl: string;
    late_120_1_qty: string;
    late_120_1_val: string;
    late_120_1_lbl: string;
    late_120_2_plus_qty: string;
    late_120_2_plus_val: string;
    late_120_2_plus_lbl: string;

    // Approval Probability Tiers
    prob_fico_above_40: string;
    prob_fico_above_20_39: string;
    prob_fico_above_0_19: string;

    prob_util_0_5: string;
    prob_util_5_10: string;
    prob_util_10_20: string;
    prob_util_20_25: string;
    prob_util_above_25: string;

    prob_inquiries_0_2: string;
    prob_inquiries_3_4: string;
    prob_inquiries_above_5: string;

    prob_banking_strong: string;
    prob_banking_moderate: string;
    prob_banking_limited: string;
    prob_banking_none: string;

    prob_trade_multiple_high: string;
    prob_trade_good_depth: string;
    prob_trade_moderate: string;
    prob_trade_thin: string;

    prob_revenue_strong: string;
    prob_revenue_moderate: string;
    prob_revenue_limited: string;
    prob_revenue_startup: string;

    // Approval Probability Range Thresholds
    prob_fico_rule_t1: string;
    prob_fico_rule_t2: string;

    prob_util_rule_t1: string;
    prob_util_rule_t2: string;
    prob_util_rule_t3: string;
    prob_util_rule_t4: string;

    prob_inquiries_rule_t1: string;
    prob_inquiries_rule_t2: string;

    // Approval Odds Tiers
    odds_fico_above_40: string;
    odds_fico_above_20_39: string;
    odds_fico_above_0_19: string;

    odds_util_0_5: string;
    odds_util_5_10: string;
    odds_util_10_20: string;
    odds_util_20_25: string;
    odds_util_above_25: string;

    odds_inquiries_0_2: string;
    odds_inquiries_3_4: string;
    odds_inquiries_above_5: string;

    odds_banking_strong: string;
    odds_banking_moderate: string;
    odds_banking_limited: string;
    odds_banking_none: string;

    odds_trade_multiple_high: string;
    odds_trade_good_depth: string;
    odds_trade_moderate: string;
    odds_trade_thin: string;

    odds_revenue_strong: string;
    odds_revenue_moderate: string;
    odds_revenue_limited: string;
    odds_revenue_startup: string;

    // Approval Odds Range Thresholds
    odds_fico_rule_t1: string;
    odds_fico_rule_t2: string;

    odds_util_rule_t1: string;
    odds_util_rule_t2: string;
    odds_util_rule_t3: string;
    odds_util_rule_t4: string;

    odds_inquiries_rule_t1: string;
    odds_inquiries_rule_t2: string;
}

export interface FormErrors {
    [key: string]: string | null;
}

interface TimeRange {
    start: string;
    end: string;
}

interface TimeSettings {
    morning: TimeRange;
    midday: TimeRange;
    evening: TimeRange;
}

const ScoreCalculationConfigForm: React.FC = () => {
    const [loading, setLoading] = useState<boolean>(false);
    const [fetching, setFetching] = useState<boolean>(true);
    const [activeTab, setActiveTab] = useState<'readiness' | 'probability' | 'odds' | 'general'>('readiness');
    const [formData, setFormData] = useState<FormData>({
        weight_fico: '35',
        weight_utilization: '25',
        weight_time_in_business: '15',
        weight_revenue_strength: '10',
        weight_tradeline_depth: '10',
        weight_banking_relationships: '5',

        // Defaults for subscores
        fico_subscore_780_plus: '100',
        fico_subscore_760_779: '95',
        fico_subscore_740_759: '90',
        fico_subscore_720_739: '80',
        fico_subscore_700_719: '70',
        fico_subscore_680_699: '55',
        fico_subscore_660_679: '40',
        fico_subscore_below_660: '20',

        util_subscore_0_5: '100',
        util_subscore_5_10: '90',
        util_subscore_10_20: '75',
        util_subscore_20_30: '60',
        util_subscore_30_40: '35',
        util_subscore_above_40: '10',

        time_subscore_36_plus: '100',
        time_subscore_24_35: '85',
        time_subscore_12_23: '70',
        time_subscore_6_11: '50',
        time_subscore_below_6: '25',

        rev_subscore_strong: '100',
        rev_subscore_moderate: '75',
        rev_subscore_limited: '55',
        rev_subscore_weak: '25',

        trade_subscore_multiple_high: '100',
        trade_subscore_good_depth: '80',
        trade_subscore_moderate: '60',
        trade_subscore_thin: '35',

        bank_subscore_strong: '100',
        bank_subscore_established: '75',
        bank_subscore_basic: '50',
        bank_subscore_weak: '20',

        // Rule thresholds defaults
        fico_rule_t1: '780',
        fico_rule_t2: '760',
        fico_rule_t3: '740',
        fico_rule_t4: '720',
        fico_rule_t5: '700',
        fico_rule_t6: '680',
        fico_rule_t7: '660',

        util_rule_t1: '5',
        util_rule_t2: '10',
        util_rule_t3: '20',
        util_rule_t4: '30',
        util_rule_t5: '40',

        time_rule_t1: '36',
        time_rule_t2: '24',
        time_rule_t3: '12',
        time_rule_t4: '6',

        rev_rule_t1: '500000',
        rev_rule_t2: '150000',
        rev_rule_t3: '50000',
        rev_rule_personal_t1: '150000',
        rev_rule_personal_t2: '75000',
        rev_rule_personal_t3: '40000',

        trade_rule_multi_accounts: '5',
        trade_rule_multi_high_limit_count: '2',
        trade_rule_multi_high_limit_amount: '15000',
        trade_rule_good_accounts: '3',
        trade_rule_good_high_limit_count: '1',
        trade_rule_good_high_limit_amount: '10000',
        trade_rule_mod_accounts_min: '2',
        trade_rule_mod_accounts_max: '3',

        bank_strong_accounts: '2',
        bank_strong_months: '12',
        bank_established_accounts: '1',
        bank_established_months: '12',
        bank_basic_accounts: '1',
        bank_weak_accounts: '0',

        // Readiness Bands Defaults
        fund_readiness_bucket_a_label: 'Elite Ready',
        fund_readiness_bucket_a_min_score: '90',
        fund_readiness_bucket_a_color: '#198754',
        fund_readiness_bucket_b_label: 'Executive Ready',
        fund_readiness_bucket_b_min_score: '80',
        fund_readiness_bucket_b_color: '#0d6efd',
        fund_readiness_bucket_c_label: 'Foundation Ready',
        fund_readiness_bucket_c_min_score: '70',
        fund_readiness_bucket_c_color: '#ffc107',
        fund_readiness_bucket_d_label: 'Conditional',
        fund_readiness_bucket_d_min_score: '60',
        fund_readiness_bucket_d_color: '#fd7e14',
        fund_readiness_bucket_e_label: 'Not Ready',
        fund_readiness_bucket_e_color: '#dc3545',

        // Late Payment Modifiers defaults
        late_30_1_qty: '1',
        late_30_1_val: '-5',
        late_30_1_lbl: '1 x 30-day late',
        late_30_2_plus_qty: '2',
        late_30_2_plus_val: '-10',
        late_30_2_plus_lbl: '2+ x 30-day lates',
        late_60_1_qty: '1',
        late_60_1_val: '-15',
        late_60_1_lbl: '1 x 60-day late',
        late_60_2_plus_qty: '2',
        late_60_2_plus_val: '-25',
        late_60_2_plus_lbl: '2+ x 60-day lates',
        late_90_1_qty: '1',
        late_90_1_val: '-30',
        late_90_1_lbl: '1 x 90-day late',
        late_90_2_plus_qty: '2',
        late_90_2_plus_val: '-50',
        late_90_2_plus_lbl: '2+ x 90-day lates',
        late_120_1_qty: '1',
        late_120_1_val: '-40',
        late_120_1_lbl: '1 x 120-day late',
        late_120_2_plus_qty: '2',
        late_120_2_plus_val: '-60',
        late_120_2_plus_lbl: '2+ x 120-day lates',

        // Approval Probability defaults
        prob_fico_above_40: '7',
        prob_fico_above_20_39: '4',
        prob_fico_above_0_19: '0',

        prob_util_0_5: '5',
        prob_util_5_10: '3',
        prob_util_10_20: '0',
        prob_util_20_25: '-5',
        prob_util_above_25: '-10',

        prob_inquiries_0_2: '3',
        prob_inquiries_3_4: '0',
        prob_inquiries_above_5: '-8',

        prob_banking_strong: '5',
        prob_banking_moderate: '2',
        prob_banking_limited: '0',
        prob_banking_none: '0',

        prob_trade_multiple_high: '5',
        prob_trade_good_depth: '3',
        prob_trade_moderate: '0',
        prob_trade_thin: '-10',

        prob_revenue_strong: '5',
        prob_revenue_moderate: '2',
        prob_revenue_limited: '0',
        prob_revenue_startup: '-5',

        // Approval Probability Range Thresholds Defaults
        prob_fico_rule_t1: '40',
        prob_fico_rule_t2: '20',

        prob_util_rule_t1: '5',
        prob_util_rule_t2: '10',
        prob_util_rule_t3: '20',
        prob_util_rule_t4: '25',

        prob_inquiries_rule_t1: '5',
        prob_inquiries_rule_t2: '3',

        // Approval Odds defaults
        odds_fico_above_40: '7',
        odds_fico_above_20_39: '4',
        odds_fico_above_0_19: '0',

        odds_util_0_5: '5',
        odds_util_5_10: '3',
        odds_util_10_20: '0',
        odds_util_20_25: '-5',
        odds_util_above_25: '-10',

        odds_inquiries_0_2: '3',
        odds_inquiries_3_4: '0',
        odds_inquiries_above_5: '-8',

        odds_banking_strong: '5',
        odds_banking_moderate: '2',
        odds_banking_limited: '0',
        odds_banking_none: '0',

        odds_trade_multiple_high: '5',
        odds_trade_good_depth: '3',
        odds_trade_moderate: '0',
        odds_trade_thin: '-10',

        odds_revenue_strong: '5',
        odds_revenue_moderate: '2',
        odds_revenue_limited: '0',
        odds_revenue_startup: '-5',

        // Approval Odds Range Thresholds Defaults
        odds_fico_rule_t1: '40',
        odds_fico_rule_t2: '20',

        odds_util_rule_t1: '5',
        odds_util_rule_t2: '10',
        odds_util_rule_t3: '20',
        odds_util_rule_t4: '25',

        odds_inquiries_rule_t1: '5',
        odds_inquiries_rule_t2: '3',
    });
    const [timeSettings, setTimeSettings] = useState<TimeSettings>({
        morning: { start: '06:00', end: '12:00' },
        midday: { start: '12:00', end: '17:00' },
        evening: { start: '17:00', end: '22:00' },
    });
    const [errors, setErrors] = useState<FormErrors>({});
    const scoreDataRef = useRef<ScoreConfiguration | null>(null);

    const sv = (v: any, fallback: string): string => v !== null && v !== undefined && v !== '' ? String(v) : fallback;

    const factorTierLabel = (slug: string, sortOrder: number): string => {
        const labels = STATIC_TIER_LABELS[slug];
        if (labels) {
            const found = labels.find(t => t.sortOrder === sortOrder);
            if (found) return found.label;
        }
        return '';
    };

    useEffect(() => {
        loadScoreConfig();
    }, []);

    const loadScoreConfig = async () => {
        try {
            setFetching(true);
            const scoreRes = await fetchScoreConfigurations();
            const scoreConfig = scoreRes?.data;

            if (scoreConfig) {
                scoreDataRef.current = scoreConfig;
            }

            const buildLatePaymentModifier = (slug: string, key: 'qty' | 'val' | 'label', fallback: string): string => {
                const found = scoreConfig?.late_payment_modifiers?.find((m: any) => m.factor_slug === slug);
                if (!found) return fallback;
                if (key === 'qty') return sv(found.min_value, fallback);
                if (key === 'label') return sv(found.label, fallback);
                return sv(found.numeric_value, fallback);
            };

            const buildProbTierValue = (factorSlug: string, index: number, key: string, fallback: string): string => {
                const factor = scoreConfig?.probability_factors?.find((f: any) => f.slug === factorSlug);
                const tier = factor?.subscore_tiers?.[index];
                if (!tier) return fallback;
                let val: any;
                if (key === 'points') val = tier.numeric_value;
                else if (key === 'min') val = tier.min_value;
                else if (key === 'max') val = tier.max_value;
                return sv(val, fallback);
            };

            const buildOddsTierValue = (factorSlug: string, index: number, key: string, fallback: string): string => {
                const factor = scoreConfig?.odds_factors?.find((f: any) => f.slug === factorSlug);
                const tier = factor?.subscore_tiers?.[index];
                if (!tier) return fallback;
                let val: any;
                if (key === 'points') val = tier.numeric_value;
                else if (key === 'min') val = tier.min_value;
                else if (key === 'max') val = tier.max_value;
                return sv(val, fallback);
            };

            const buildWeight = (modelSlug: string, factorSlug: string, fallback: string): string => {
                const model = scoreConfig?.models?.find((m: any) => m.slug === modelSlug);
                if (!model?.factors) return fallback;
                const f = model.factors.find((ff: any) => ff.slug === factorSlug);
                return sv(f?.pivot?.weight, fallback);
            };

            const buildTierValue = (factorSlug: string, index: number, key: string, fallback: string): string => {
                const factor = scoreConfig?.factors?.find((f: any) => f.slug === factorSlug);
                const tier = factor?.subscore_tiers?.[index];
                if (!tier) return fallback;
                let val: any;
                if (key === 'subscore') val = tier.numeric_value;
                else if (key === 'min') val = tier.min_value;
                else if (key === 'max') val = tier.max_value;
                return sv(val, fallback);
            };

            const getTiers = (slug: string): ScoreFactorTier[] => {
                const factor = scoreConfig?.factors?.find((f: any) => f.slug === slug);
                return factor?.subscore_tiers || [];
            };

            const getCond = (slug: string, index: number, field: string, fallback: string, valIndex: number = 0): string => {
                const tiers = getTiers(slug);
                const tier = tiers[index];
                if (!tier?.conditions) return fallback;
                const conditions = typeof tier.conditions === 'string' ? JSON.parse(tier.conditions) : tier.conditions;
                let list = [];
                if (Array.isArray(conditions)) {
                    list = conditions;
                } else {
                    list = conditions?.any || conditions?.all || [];
                }
                const found = list.find((c: any) => c[field] !== undefined);
                if (!found) return fallback;
                return sv(found[field]?.value, fallback);
            };

            setFormData(prev => ({
                ...prev,

                weight_fico: buildWeight('funding_readiness', 'fico', '35'),
                weight_utilization: buildWeight('funding_readiness', 'utilization', '25'),
                weight_time_in_business: buildWeight('funding_readiness', 'time_in_business', '15'),
                weight_revenue_strength: buildWeight('funding_readiness', 'revenue_strength', '10'),
                weight_tradeline_depth: buildWeight('funding_readiness', 'tradeline_depth', '10'),
                weight_banking_relationships: buildWeight('funding_readiness', 'banking_relationships', '5'),

                fico_subscore_780_plus: buildTierValue('fico', 0, 'subscore', '100'),
                fico_subscore_760_779: buildTierValue('fico', 1, 'subscore', '95'),
                fico_subscore_740_759: buildTierValue('fico', 2, 'subscore', '90'),
                fico_subscore_720_739: buildTierValue('fico', 3, 'subscore', '80'),
                fico_subscore_700_719: buildTierValue('fico', 4, 'subscore', '70'),
                fico_subscore_680_699: buildTierValue('fico', 5, 'subscore', '55'),
                fico_subscore_660_679: buildTierValue('fico', 6, 'subscore', '40'),
                fico_subscore_below_660: buildTierValue('fico', 7, 'subscore', '20'),

                util_subscore_0_5: buildTierValue('utilization', 0, 'subscore', '100'),
                util_subscore_5_10: buildTierValue('utilization', 1, 'subscore', '90'),
                util_subscore_10_20: buildTierValue('utilization', 2, 'subscore', '75'),
                util_subscore_20_30: buildTierValue('utilization', 3, 'subscore', '60'),
                util_subscore_30_40: buildTierValue('utilization', 4, 'subscore', '35'),
                util_subscore_above_40: buildTierValue('utilization', 5, 'subscore', '10'),

                time_subscore_36_plus: buildTierValue('time_in_business', 0, 'subscore', '100'),
                time_subscore_24_35: buildTierValue('time_in_business', 1, 'subscore', '85'),
                time_subscore_12_23: buildTierValue('time_in_business', 2, 'subscore', '70'),
                time_subscore_6_11: buildTierValue('time_in_business', 3, 'subscore', '50'),
                time_subscore_below_6: buildTierValue('time_in_business', 4, 'subscore', '25'),

                rev_subscore_strong: buildTierValue('revenue_strength', 0, 'subscore', '100'),
                rev_subscore_moderate: buildTierValue('revenue_strength', 1, 'subscore', '75'),
                rev_subscore_limited: buildTierValue('revenue_strength', 2, 'subscore', '55'),
                rev_subscore_weak: buildTierValue('revenue_strength', 3, 'subscore', '25'),

                trade_subscore_multiple_high: buildTierValue('tradeline_depth', 0, 'subscore', '100'),
                trade_subscore_good_depth: buildTierValue('tradeline_depth', 1, 'subscore', '80'),
                trade_subscore_moderate: buildTierValue('tradeline_depth', 2, 'subscore', '60'),
                trade_subscore_thin: buildTierValue('tradeline_depth', 3, 'subscore', '35'),

                bank_subscore_strong: buildTierValue('banking_relationships', 0, 'subscore', '100'),
                bank_subscore_established: buildTierValue('banking_relationships', 1, 'subscore', '75'),
                bank_subscore_basic: buildTierValue('banking_relationships', 2, 'subscore', '50'),
                bank_subscore_weak: buildTierValue('banking_relationships', 3, 'subscore', '20'),

                fico_rule_t1: buildTierValue('fico', 0, 'min', '780'),
                fico_rule_t2: buildTierValue('fico', 1, 'min', '760'),
                fico_rule_t3: buildTierValue('fico', 2, 'min', '740'),
                fico_rule_t4: buildTierValue('fico', 3, 'min', '720'),
                fico_rule_t5: buildTierValue('fico', 4, 'min', '700'),
                fico_rule_t6: buildTierValue('fico', 5, 'min', '680'),
                fico_rule_t7: buildTierValue('fico', 6, 'min', '660'),

                util_rule_t1: buildTierValue('utilization', 0, 'max', '5'),
                util_rule_t2: buildTierValue('utilization', 1, 'max', '10'),
                util_rule_t3: buildTierValue('utilization', 2, 'max', '20'),
                util_rule_t4: buildTierValue('utilization', 3, 'max', '30'),
                util_rule_t5: buildTierValue('utilization', 4, 'max', '40'),

                time_rule_t1: buildTierValue('time_in_business', 0, 'min', '36'),
                time_rule_t2: buildTierValue('time_in_business', 1, 'min', '24'),
                time_rule_t3: buildTierValue('time_in_business', 2, 'min', '12'),
                time_rule_t4: buildTierValue('time_in_business', 3, 'min', '6'),

                rev_rule_t1: buildTierValue('revenue_strength', 0, 'min', '500000'),
                rev_rule_t2: buildTierValue('revenue_strength', 1, 'min', '150000'),
                rev_rule_t3: buildTierValue('revenue_strength', 2, 'min', '50000'),

                trade_rule_multi_accounts: getCond('tradeline_depth', 0, 'open_accounts', '5'),
                trade_rule_multi_high_limit_count: getCond('tradeline_depth', 0, 'high_limit_accounts', '2'),
                trade_rule_multi_high_limit_amount: getCond('tradeline_depth', 0, 'limit', '15000'),
                trade_rule_good_accounts: getCond('tradeline_depth', 1, 'open_accounts', '3'),
                trade_rule_good_high_limit_count: getCond('tradeline_depth', 1, 'high_limit_accounts', '1'),
                trade_rule_good_high_limit_amount: getCond('tradeline_depth', 1, 'limit', '10000'),
                trade_rule_mod_accounts_min: getCond('tradeline_depth', 2, 'open_accounts', '2'),
                trade_rule_mod_accounts_max: getCond('tradeline_depth', 2, 'open_accounts', '3', 1),

                fund_readiness_bucket_a_label: sv(scoreConfig?.readiness_bands?.[0]?.label, 'Elite Ready'),
                fund_readiness_bucket_a_min_score: sv(scoreConfig?.readiness_bands?.[0]?.min_value, '90'),
                fund_readiness_bucket_a_color: sv((scoreConfig?.readiness_bands?.[0] as any)?.color, '#198754'),

                fund_readiness_bucket_b_label: sv(scoreConfig?.readiness_bands?.[1]?.label, 'Executive Ready'),
                fund_readiness_bucket_b_min_score: sv(scoreConfig?.readiness_bands?.[1]?.min_value, '80'),
                fund_readiness_bucket_b_color: sv((scoreConfig?.readiness_bands?.[1] as any)?.color, '#0d6efd'),

                fund_readiness_bucket_c_label: sv(scoreConfig?.readiness_bands?.[2]?.label, 'Foundation Ready'),
                fund_readiness_bucket_c_min_score: sv(scoreConfig?.readiness_bands?.[2]?.min_value, '70'),
                fund_readiness_bucket_c_color: sv((scoreConfig?.readiness_bands?.[2] as any)?.color, '#ffc107'),

                fund_readiness_bucket_d_label: sv(scoreConfig?.readiness_bands?.[3]?.label, 'Conditional'),
                fund_readiness_bucket_d_min_score: sv(scoreConfig?.readiness_bands?.[3]?.min_value, '60'),
                fund_readiness_bucket_d_color: sv((scoreConfig?.readiness_bands?.[3] as any)?.color, '#fd7e14'),

                fund_readiness_bucket_e_label: sv(scoreConfig?.readiness_bands?.[4]?.label, 'Not Ready'),
                fund_readiness_bucket_e_color: sv((scoreConfig?.readiness_bands?.[4] as any)?.color, '#dc3545'),

                bank_strong_accounts: getCond('banking_relationships', 0, 'accounts', '2'),
                bank_strong_months: getCond('banking_relationships', 0, 'checking_months', '12'),
                bank_established_accounts: getCond('banking_relationships', 1, 'accounts', '1'),
                bank_established_months: getCond('banking_relationships', 1, 'checking_months', '12'),
                bank_basic_accounts: getCond('banking_relationships', 2, 'accounts', '1'),
                bank_weak_accounts: getCond('banking_relationships', 3, 'accounts', '0'),

                late_30_1_qty: buildLatePaymentModifier('late_30_1', 'qty', '1'),
                late_30_1_val: buildLatePaymentModifier('late_30_1', 'val', '-5'),
                late_30_1_lbl: buildLatePaymentModifier('late_30_1', 'label', '1 x 30-day late'),
                late_30_2_plus_qty: buildLatePaymentModifier('late_30_2_plus', 'qty', '2'),
                late_30_2_plus_val: buildLatePaymentModifier('late_30_2_plus', 'val', '-10'),
                late_30_2_plus_lbl: buildLatePaymentModifier('late_30_2_plus', 'label', '2+ x 30-day lates'),

                late_60_1_qty: buildLatePaymentModifier('late_60_1', 'qty', '1'),
                late_60_1_val: buildLatePaymentModifier('late_60_1', 'val', '-15'),
                late_60_1_lbl: buildLatePaymentModifier('late_60_1', 'label', '1 x 60-day late'),
                late_60_2_plus_qty: buildLatePaymentModifier('late_60_2_plus', 'qty', '2'),
                late_60_2_plus_val: buildLatePaymentModifier('late_60_2_plus', 'val', '-25'),
                late_60_2_plus_lbl: buildLatePaymentModifier('late_60_2_plus', 'label', '2+ x 60-day lates'),

                late_90_1_qty: buildLatePaymentModifier('late_90_1', 'qty', '1'),
                late_90_1_val: buildLatePaymentModifier('late_90_1', 'val', '-30'),
                late_90_1_lbl: buildLatePaymentModifier('late_90_1', 'label', '1 x 90-day late'),
                late_90_2_plus_qty: buildLatePaymentModifier('late_90_2_plus', 'qty', '2'),
                late_90_2_plus_val: buildLatePaymentModifier('late_90_2_plus', 'val', '-50'),
                late_90_2_plus_lbl: buildLatePaymentModifier('late_90_2_plus', 'label', '2+ x 90-day lates'),

                late_120_1_qty: buildLatePaymentModifier('late_120_1', 'qty', '1'),
                late_120_1_val: buildLatePaymentModifier('late_120_1', 'val', '-40'),
                late_120_1_lbl: buildLatePaymentModifier('late_120_1', 'label', '1 x 120-day late'),
                late_120_2_plus_qty: buildLatePaymentModifier('late_120_2_plus', 'qty', '2'),
                late_120_2_plus_val: buildLatePaymentModifier('late_120_2_plus', 'val', '-60'),
                late_120_2_plus_lbl: buildLatePaymentModifier('late_120_2_plus', 'label', '2+ x 120-day lates'),

                // Map Approval Probability fields
                prob_fico_above_40: buildProbTierValue('fico_above_minimum', 0, 'points', '7'),
                prob_fico_above_20_39: buildProbTierValue('fico_above_minimum', 1, 'points', '4'),
                prob_fico_above_0_19: buildProbTierValue('fico_above_minimum', 2, 'points', '0'),

                prob_util_0_5: buildProbTierValue('utilization', 0, 'points', '5'),
                prob_util_5_10: buildProbTierValue('utilization', 1, 'points', '3'),
                prob_util_10_20: buildProbTierValue('utilization', 2, 'points', '0'),
                prob_util_20_25: buildProbTierValue('utilization', 3, 'points', '-5'),
                prob_util_above_25: buildProbTierValue('utilization', 4, 'points', '-10'),

                prob_inquiries_0_2: buildProbTierValue('recent_inquiries', 0, 'points', '3'),
                prob_inquiries_3_4: buildProbTierValue('recent_inquiries', 1, 'points', '0'),
                prob_inquiries_above_5: buildProbTierValue('recent_inquiries', 2, 'points', '-8'),

                prob_banking_strong: buildProbTierValue('banking_relationship', 0, 'points', '5'),
                prob_banking_moderate: buildProbTierValue('banking_relationship', 1, 'points', '2'),
                prob_banking_limited: buildProbTierValue('banking_relationship', 2, 'points', '0'),
                prob_banking_none: buildProbTierValue('banking_relationship', 3, 'points', '0'),

                prob_trade_multiple_high: buildProbTierValue('tradeline_depth', 0, 'points', '5'),
                prob_trade_good_depth: buildProbTierValue('tradeline_depth', 1, 'points', '3'),
                prob_trade_moderate: buildProbTierValue('tradeline_depth', 2, 'points', '0'),
                prob_trade_thin: buildProbTierValue('tradeline_depth', 3, 'points', '-10'),

                prob_revenue_strong: buildProbTierValue('revenue_income', 0, 'points', '5'),
                prob_revenue_moderate: buildProbTierValue('revenue_income', 1, 'points', '2'),
                prob_revenue_limited: buildProbTierValue('revenue_income', 2, 'points', '0'),
                prob_revenue_startup: buildProbTierValue('revenue_income', 3, 'points', '-5'),

                // Map Range Rules Thresholds
                prob_fico_rule_t1: buildProbTierValue('fico_above_minimum', 0, 'min', '40'),
                prob_fico_rule_t2: buildProbTierValue('fico_above_minimum', 1, 'min', '20'),

                prob_util_rule_t1: buildProbTierValue('utilization', 0, 'max', '5'),
                prob_util_rule_t2: buildProbTierValue('utilization', 1, 'max', '10'),
                prob_util_rule_t3: buildProbTierValue('utilization', 2, 'max', '20'),
                prob_util_rule_t4: buildProbTierValue('utilization', 3, 'max', '25'),

                prob_inquiries_rule_t1: buildProbTierValue('recent_inquiries', 2, 'min', '5'),
                prob_inquiries_rule_t2: buildProbTierValue('recent_inquiries', 1, 'min', '3'),

                // Map Approval Odds fields
                odds_fico_above_40: buildOddsTierValue('fico_above_minimum', 0, 'points', '7'),
                odds_fico_above_20_39: buildOddsTierValue('fico_above_minimum', 1, 'points', '4'),
                odds_fico_above_0_19: buildOddsTierValue('fico_above_minimum', 2, 'points', '0'),

                odds_util_0_5: buildOddsTierValue('utilization', 0, 'points', '5'),
                odds_util_5_10: buildOddsTierValue('utilization', 1, 'points', '3'),
                odds_util_10_20: buildOddsTierValue('utilization', 2, 'points', '0'),
                odds_util_20_25: buildOddsTierValue('utilization', 3, 'points', '-5'),
                odds_util_above_25: buildOddsTierValue('utilization', 4, 'points', '-10'),

                odds_inquiries_0_2: buildOddsTierValue('recent_inquiries', 0, 'points', '3'),
                odds_inquiries_3_4: buildOddsTierValue('recent_inquiries', 1, 'points', '0'),
                odds_inquiries_above_5: buildOddsTierValue('recent_inquiries', 2, 'points', '-8'),

                odds_banking_strong: buildOddsTierValue('banking_relationship', 0, 'points', '5'),
                odds_banking_moderate: buildOddsTierValue('banking_relationship', 1, 'points', '2'),
                odds_banking_limited: buildOddsTierValue('banking_relationship', 2, 'points', '0'),
                odds_banking_none: buildOddsTierValue('banking_relationship', 3, 'points', '0'),

                odds_trade_multiple_high: buildOddsTierValue('tradeline_depth', 0, 'points', '5'),
                odds_trade_good_depth: buildOddsTierValue('tradeline_depth', 1, 'points', '3'),
                odds_trade_moderate: buildOddsTierValue('tradeline_depth', 2, 'points', '0'),
                odds_trade_thin: buildOddsTierValue('tradeline_depth', 3, 'points', '-10'),

                odds_revenue_strong: buildOddsTierValue('revenue_income', 0, 'points', '5'),
                odds_revenue_moderate: buildOddsTierValue('revenue_income', 1, 'points', '2'),
                odds_revenue_limited: buildOddsTierValue('revenue_income', 2, 'points', '0'),
                odds_revenue_startup: buildOddsTierValue('revenue_income', 3, 'points', '-5'),

                // Map Odds Range Rules Thresholds
                odds_fico_rule_t1: buildOddsTierValue('fico_above_minimum', 0, 'min', '40'),
                odds_fico_rule_t2: buildOddsTierValue('fico_above_minimum', 1, 'min', '20'),

                odds_util_rule_t1: buildOddsTierValue('utilization', 0, 'max', '5'),
                odds_util_rule_t2: buildOddsTierValue('utilization', 1, 'max', '10'),
                odds_util_rule_t3: buildOddsTierValue('utilization', 2, 'max', '20'),
                odds_util_rule_t4: buildOddsTierValue('utilization', 3, 'max', '25'),

                odds_inquiries_rule_t1: buildOddsTierValue('recent_inquiries', 2, 'min', '5'),
                odds_inquiries_rule_t2: buildOddsTierValue('recent_inquiries', 1, 'min', '3'),
            }));

            const decimalToTime = (d: number): string => {
                const h = Math.floor(d);
                const m = Math.round((d - h) * 60);
                return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
            };
            const ts = scoreConfig?.time_settings;
            if (ts && Array.isArray(ts)) {
                const st: Record<string, TimeRange> = {};
                ts.forEach((s: any) => {
                    const key = s.label?.toLowerCase().replace(' ', '');
                    if (key) {
                        st[key] = {
                            start: s.start != null ? decimalToTime(s.start) : '00:00',
                            end: s.end != null ? decimalToTime(s.end) : '00:00',
                        };
                    }
                });
                setTimeSettings({
                    morning: st.morning || { start: '06:00', end: '12:00' },
                    midday: st.midday || { start: '12:00', end: '17:00' },
                    evening: st.evening || { start: '17:00', end: '22:00' },
                });
            }
        } catch (error) {
            console.error('Failed to load score configuration:', error);
            toast.error('Failed to load score configuration.');
        } finally {
            setFetching(false);
        }
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
        if (errors[name]) {
            setErrors(prev => ({ ...prev, [name]: null }));
        }
    };

    const validate = (): boolean => {
        const newErrors: FormErrors = {};

        const sum = (Number(formData.weight_fico) || 0) +
            (Number(formData.weight_utilization) || 0) +
            (Number(formData.weight_time_in_business) || 0) +
            (Number(formData.weight_revenue_strength) || 0) +
            (Number(formData.weight_tradeline_depth) || 0) +
            (Number(formData.weight_banking_relationships) || 0);
        if (sum !== 100) {
            newErrors.weights_sum = `The sum of weights must equal exactly 100%. Current sum: ${sum}%.`;
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const getTierValue = (key: keyof FormData): number => Number(formData[key] as any) || 0;

    const TIER_DEFINITIONS: Record<string, Array<{
        i: number;
        each?: boolean;
        min?: keyof FormData;
        max?: keyof FormData;
        sub: keyof FormData;
        maxOffset?: number;
        rules?: Array<{ field: string; operator: string; valueKey?: keyof FormData; value?: number; transform?: (val: number) => any }>;
    }>> = {
        fico: [
            { i: 0, min: 'fico_rule_t1', sub: 'fico_subscore_780_plus' },
            { i: 1, min: 'fico_rule_t2', sub: 'fico_subscore_760_779' },
            { i: 2, min: 'fico_rule_t3', sub: 'fico_subscore_740_759' },
            { i: 3, min: 'fico_rule_t4', sub: 'fico_subscore_720_739' },
            { i: 4, min: 'fico_rule_t5', sub: 'fico_subscore_700_719' },
            { i: 5, min: 'fico_rule_t6', sub: 'fico_subscore_680_699' },
            { i: 6, min: 'fico_rule_t7', sub: 'fico_subscore_660_679' },
            { i: 7, sub: 'fico_subscore_below_660' },
        ],
        utilization: [
            { i: 0, max: 'util_rule_t1', sub: 'util_subscore_0_5' },
            { i: 1, max: 'util_rule_t2', sub: 'util_subscore_5_10' },
            { i: 2, max: 'util_rule_t3', sub: 'util_subscore_10_20' },
            { i: 3, max: 'util_rule_t4', sub: 'util_subscore_20_30' },
            { i: 4, max: 'util_rule_t5', sub: 'util_subscore_30_40' },
            { i: 5, sub: 'util_subscore_above_40' },
        ],
        time_in_business: [
            { i: 0, min: 'time_rule_t1', sub: 'time_subscore_36_plus' },
            { i: 1, min: 'time_rule_t2', sub: 'time_subscore_24_35' },
            { i: 2, min: 'time_rule_t3', sub: 'time_subscore_12_23' },
            { i: 3, min: 'time_rule_t4', sub: 'time_subscore_6_11' },
            { i: 4, sub: 'time_subscore_below_6' },
        ],
        revenue_strength: [
            { i: 0, min: 'rev_rule_t1', sub: 'rev_subscore_strong' },
            { i: 1, min: 'rev_rule_t2', max: 'rev_rule_t1', maxOffset: -1, sub: 'rev_subscore_moderate' },
            { i: 2, min: 'rev_rule_t3', max: 'rev_rule_t2', maxOffset: -1, sub: 'rev_subscore_limited' },
            { i: 3, max: 'rev_rule_t3', maxOffset: -1, sub: 'rev_subscore_weak' },
        ],
        tradeline_depth: [
            {
                i: 0, sub: 'trade_subscore_multiple_high', rules: [
                    { field: 'open_accounts', operator: '>=', valueKey: 'trade_rule_multi_accounts' },
                    { field: 'high_limit_accounts', operator: '>=', valueKey: 'trade_rule_multi_high_limit_count' },
                    { field: 'limit', operator: '>=', valueKey: 'trade_rule_multi_high_limit_amount' },
                ]
            },
            {
                i: 1, sub: 'trade_subscore_good_depth', rules: [
                    { field: 'open_accounts', operator: '>=', valueKey: 'trade_rule_good_accounts' },
                    { field: 'high_limit_accounts', operator: '>=', valueKey: 'trade_rule_good_high_limit_count' },
                    { field: 'limit', operator: '>=', valueKey: 'trade_rule_good_high_limit_amount' },
                ]
            },
            {
                i: 2, sub: 'trade_subscore_moderate', rules: [
                    { field: 'open_accounts', operator: '>=', valueKey: 'trade_rule_mod_accounts_min' },
                ]
            },
            {
                i: 3, sub: 'trade_subscore_thin', rules: [
                    { field: 'open_accounts', operator: '>=', value: 0 },
                ]
            },
        ],
        banking_relationships: [
            {
                i: 0, each: true, sub: 'bank_subscore_strong', rules: [
                    { field: 'accounts', operator: '>=', valueKey: 'bank_strong_accounts' },
                    { field: 'checking_months', operator: '>', valueKey: 'bank_strong_months' },
                ]
            },
            {
                i: 1, each: false, sub: 'bank_subscore_established', rules: [
                    { field: 'accounts', operator: '>=', valueKey: 'bank_established_accounts' },
                    { field: 'checking_months', operator: '>', valueKey: 'bank_established_months' },
                ]
            },
            {
                i: 2, each: false, sub: 'bank_subscore_basic', rules: [
                    { field: 'accounts', operator: '>=', valueKey: 'bank_basic_accounts' },
                ]
            },
            {
                i: 3, each: false, sub: 'bank_subscore_weak', rules: [
                    { field: 'accounts', operator: '=', valueKey: 'bank_weak_accounts' },
                ]
            },
        ],
    };

    const buildFundingReadinessPayload = () => {
        const payload: Record<string, any> = {};

        const orderMap: Record<string, number> = {
            fico: 1, utilization: 2, time_in_business: 3,
            revenue_strength: 4, tradeline_depth: 5, banking_relationships: 6,
        };

        const weightMap: Record<string, keyof FormData> = {
            fico: 'weight_fico',
            utilization: 'weight_utilization',
            time_in_business: 'weight_time_in_business',
            revenue_strength: 'weight_revenue_strength',
            tradeline_depth: 'weight_tradeline_depth',
            banking_relationships: 'weight_banking_relationships',
        };

        for (const [slug, tiers] of Object.entries(TIER_DEFINITIONS)) {
            const factorEntry: Record<string, any> = {
                weight: getTierValue(weightMap[slug] as keyof FormData),
                order_sort: orderMap[slug],
                factors: tiers.map(t => {
                    const tierEntry: Record<string, any> = {};

                    if (t.min) {
                        tierEntry.min_value = getTierValue(t.min);
                    } else {
                        tierEntry.min_value = null;
                    }

                    if (t.max) {
                        let maxVal = getTierValue(t.max);
                        if (t.maxOffset !== undefined) maxVal += t.maxOffset;
                        tierEntry.max_value = maxVal;
                    } else {
                        tierEntry.max_value = null;
                    }

                    tierEntry.sub_score = getTierValue(t.sub);
                    tierEntry.sort_order = t.i + 1;

                    if (t.rules) {
                        const condition: Record<string, any> = {};
                        for (const rule of t.rules) {
                            let value: any;
                            if (rule.value !== undefined) {
                                value = rule.value;
                            } else if (rule.valueKey) {
                                value = getTierValue(rule.valueKey as keyof FormData);
                                if (rule.transform) value = rule.transform(value);
                            }
                            condition[rule.field] = { value, operator: rule.operator };
                        }
                        if (t.each !== undefined) {
                            condition.each = t.each;
                        }
                        tierEntry.condition = condition;
                    }

                    const staticLabels = STATIC_TIER_LABELS[slug];
                    if (staticLabels) {
                        const found = staticLabels.find(sl => sl.sortOrder === t.i + 1);
                        if (found) {
                            tierEntry.label = found.label;
                        }
                    }

                    return tierEntry;
                }),
            };

            payload[slug] = factorEntry;
        }

        return { funding_readiness: payload };
    };

    const buildApprovalProbabilityPayload = () => {
        const ficoT1 = Number(formData.prob_fico_rule_t1) || 40;
        const ficoT2 = Number(formData.prob_fico_rule_t2) || 20;

        const utilT1 = Number(formData.prob_util_rule_t1) || 5;
        const utilT2 = Number(formData.prob_util_rule_t2) || 10;
        const utilT3 = Number(formData.prob_util_rule_t3) || 20;
        const utilT4 = Number(formData.prob_util_rule_t4) || 25;

        const inqT1 = Number(formData.prob_inquiries_rule_t1) || 5;
        const inqT2 = Number(formData.prob_inquiries_rule_t2) || 3;

        return {
            fico_above_minimum: {
                factors: [
                    { sort_order: 1, min_value: ficoT1, max_value: null, sub_score: Number(formData.prob_fico_above_40) || 0, label: `${ficoT1}+ points above minimum` },
                    { sort_order: 2, min_value: ficoT2, max_value: ficoT1 - 1, sub_score: Number(formData.prob_fico_above_20_39) || 0, label: `${ficoT2}–${ficoT1 - 1} points above minimum` },
                    { sort_order: 3, min_value: 0, max_value: ficoT2 - 1, sub_score: Number(formData.prob_fico_above_0_19) || 0, label: `0–${ficoT2 - 1} points above minimum` },
                ]
            },
            utilization: {
                factors: [
                    { sort_order: 1, min_value: 0, max_value: utilT1, sub_score: Number(formData.prob_util_0_5) || 0, label: `0–${utilT1}%` },
                    { sort_order: 2, min_value: Number((utilT1 + 0.01).toFixed(2)), max_value: utilT2, sub_score: Number(formData.prob_util_5_10) || 0, label: `${(utilT1 + 0.01).toFixed(2)}–${utilT2}%` },
                    { sort_order: 3, min_value: Number((utilT2 + 0.01).toFixed(2)), max_value: utilT3, sub_score: Number(formData.prob_util_10_20) || 0, label: `${(utilT2 + 0.01).toFixed(2)}–${utilT3}%` },
                    { sort_order: 4, min_value: Number((utilT3 + 0.01).toFixed(2)), max_value: utilT4, sub_score: Number(formData.prob_util_20_25) || 0, label: `${(utilT3 + 0.01).toFixed(2)}–${utilT4}%` },
                    { sort_order: 5, min_value: Number((utilT4 + 0.01).toFixed(2)), max_value: null, sub_score: Number(formData.prob_util_above_25) || 0, label: `${(utilT4 + 0.01).toFixed(2)}%+` },
                ]
            },
            recent_inquiries: {
                factors: [
                    { sort_order: 1, min_value: 0, max_value: inqT2 - 1, sub_score: Number(formData.prob_inquiries_0_2) || 0, label: `0–${inqT2 - 1} inquiries` },
                    { sort_order: 2, min_value: inqT2, max_value: inqT1 - 1, sub_score: Number(formData.prob_inquiries_3_4) || 0, label: `${inqT2}–${inqT1 - 1} inquiries` },
                    { sort_order: 3, min_value: inqT1, max_value: null, sub_score: Number(formData.prob_inquiries_above_5) || 0, label: `${inqT1}+ inquiries` },
                ]
            },
            banking_relationship: {
                factors: [
                    { sort_order: 1, sub_score: Number(formData.prob_banking_strong) || 0, label: 'Strong business banking relationship' },
                    { sort_order: 2, sub_score: Number(formData.prob_banking_moderate) || 0, label: 'Moderate banking relationship' },
                    { sort_order: 3, sub_score: Number(formData.prob_banking_limited) || 0, label: 'Limited banking relationship' },
                    { sort_order: 4, sub_score: Number(formData.prob_banking_none) || 0, label: 'No meaningful banking relationship' },
                ]
            },
            tradeline_depth: {
                factors: [
                    { sort_order: 1, sub_score: Number(formData.prob_trade_multiple_high) || 0, label: 'Multiple High-Limit & Installment Depth' },
                    { sort_order: 2, sub_score: Number(formData.prob_trade_good_depth) || 0, label: 'Good Depth with High-Limit account' },
                    { sort_order: 3, sub_score: Number(formData.prob_trade_moderate) || 0, label: 'Moderate tradeline depth' },
                    { sort_order: 4, sub_score: Number(formData.prob_trade_thin) || 0, label: 'Thin file' },
                ]
            },
            revenue_income: {
                factors: [
                    { sort_order: 1, sub_score: Number(formData.prob_revenue_strong) || 0, label: 'Strong revenue or strong documented income' },
                    { sort_order: 2, sub_score: Number(formData.prob_revenue_moderate) || 0, label: 'Moderate revenue/income' },
                    { sort_order: 3, sub_score: Number(formData.prob_revenue_limited) || 0, label: 'Limited revenue/income' },
                    { sort_order: 4, sub_score: Number(formData.prob_revenue_startup) || 0, label: 'Startup with no revenue' },
                ]
            }
        };
    };

    const buildApprovalOddsPayload = () => {
        const ficoT1 = Number(formData.odds_fico_rule_t1) || 40;
        const ficoT2 = Number(formData.odds_fico_rule_t2) || 20;

        const utilT1 = Number(formData.odds_util_rule_t1) || 5;
        const utilT2 = Number(formData.odds_util_rule_t2) || 10;
        const utilT3 = Number(formData.odds_util_rule_t3) || 20;
        const utilT4 = Number(formData.odds_util_rule_t4) || 25;

        const inqT1 = Number(formData.odds_inquiries_rule_t1) || 5;
        const inqT2 = Number(formData.odds_inquiries_rule_t2) || 3;

        return {
            fico_above_minimum: {
                factors: [
                    { sort_order: 1, min_value: ficoT1, max_value: null, sub_score: Number(formData.odds_fico_above_40) || 0, label: `${ficoT1}+ points above minimum` },
                    { sort_order: 2, min_value: ficoT2, max_value: ficoT1 - 1, sub_score: Number(formData.odds_fico_above_20_39) || 0, label: `${ficoT2}–${ficoT1 - 1} points above minimum` },
                    { sort_order: 3, min_value: 0, max_value: ficoT2 - 1, sub_score: Number(formData.odds_fico_above_0_19) || 0, label: `0–${ficoT2 - 1} points above minimum` },
                ]
            },
            utilization: {
                factors: [
                    { sort_order: 1, min_value: 0, max_value: utilT1, sub_score: Number(formData.odds_util_0_5) || 0, label: `0–${utilT1}%` },
                    { sort_order: 2, min_value: Number((utilT1 + 0.01).toFixed(2)), max_value: utilT2, sub_score: Number(formData.odds_util_5_10) || 0, label: `${(utilT1 + 0.01).toFixed(2)}–${utilT2}%` },
                    { sort_order: 3, min_value: Number((utilT2 + 0.01).toFixed(2)), max_value: utilT3, sub_score: Number(formData.odds_util_10_20) || 0, label: `${(utilT2 + 0.01).toFixed(2)}–${utilT3}%` },
                    { sort_order: 4, min_value: Number((utilT3 + 0.01).toFixed(2)), max_value: utilT4, sub_score: Number(formData.odds_util_20_25) || 0, label: `${(utilT3 + 0.01).toFixed(2)}–${utilT4}%` },
                    { sort_order: 5, min_value: Number((utilT4 + 0.01).toFixed(2)), max_value: null, sub_score: Number(formData.odds_util_above_25) || 0, label: `${(utilT4 + 0.01).toFixed(2)}%+` },
                ]
            },
            recent_inquiries: {
                factors: [
                    { sort_order: 1, min_value: 0, max_value: inqT2 - 1, sub_score: Number(formData.odds_inquiries_0_2) || 0, label: `0–${inqT2 - 1} inquiries` },
                    { sort_order: 2, min_value: inqT2, max_value: inqT1 - 1, sub_score: Number(formData.odds_inquiries_3_4) || 0, label: `${inqT2}–${inqT1 - 1} inquiries` },
                    { sort_order: 3, min_value: inqT1, max_value: null, sub_score: Number(formData.odds_inquiries_above_5) || 0, label: `${inqT1}+ inquiries` },
                ]
            },
            banking_relationship: {
                factors: [
                    { sort_order: 1, sub_score: Number(formData.odds_banking_strong) || 0, label: 'Strong business banking relationship' },
                    { sort_order: 2, sub_score: Number(formData.odds_banking_moderate) || 0, label: 'Moderate banking relationship' },
                    { sort_order: 3, sub_score: Number(formData.odds_banking_limited) || 0, label: 'Limited banking relationship' },
                    { sort_order: 4, sub_score: Number(formData.odds_banking_none) || 0, label: 'No meaningful banking relationship' },
                ]
            },
            tradeline_depth: {
                factors: [
                    { sort_order: 1, sub_score: Number(formData.odds_trade_multiple_high) || 0, label: 'Multiple High-Limit & Installment Depth' },
                    { sort_order: 2, sub_score: Number(formData.odds_trade_good_depth) || 0, label: 'Good Depth with High-Limit account' },
                    { sort_order: 3, sub_score: Number(formData.odds_trade_moderate) || 0, label: 'Moderate tradeline depth' },
                    { sort_order: 4, sub_score: Number(formData.odds_trade_thin) || 0, label: 'Thin file' },
                ]
            },
            revenue_income: {
                factors: [
                    { sort_order: 1, sub_score: Number(formData.odds_revenue_strong) || 0, label: 'Strong revenue or strong documented income' },
                    { sort_order: 2, sub_score: Number(formData.odds_revenue_moderate) || 0, label: 'Moderate revenue/income' },
                    { sort_order: 3, sub_score: Number(formData.odds_revenue_limited) || 0, label: 'Limited revenue/income' },
                    { sort_order: 4, sub_score: Number(formData.odds_revenue_startup) || 0, label: 'Startup with no revenue' },
                ]
            }
        };
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!validate()) {
            toast.error('Validation failed. Please correct the errors before saving.');
            return;
        }

        setLoading(true);
        try {
            const scorePayload: any = buildFundingReadinessPayload();
            scorePayload.approval_probability = buildApprovalProbabilityPayload();
            scorePayload.approval_odds = buildApprovalOddsPayload();

            const bucketIds = ['a', 'b', 'c', 'd', 'e'];
            const readinessBands = bucketIds.map((bucket, i) => ({
                sort_order: i + 1,
                label: formData[`fund_readiness_bucket_${bucket}_label` as keyof FormData] || '',
                color: formData[`fund_readiness_bucket_${bucket}_color` as keyof FormData] || '',
                min_value: formData[`fund_readiness_bucket_${bucket}_min_score` as keyof FormData]
                    ? Number(formData[`fund_readiness_bucket_${bucket}_min_score` as keyof FormData])
                    : null,
            }));
            scorePayload.readiness_bands = readinessBands;

            const latePaymentModifiers = [
                { factor_slug: 'late_30_1', label: formData.late_30_1_lbl, min_value: Number(formData.late_30_1_qty), numeric_value: Number(formData.late_30_1_val), sort_order: 1 },
                { factor_slug: 'late_30_2_plus', label: formData.late_30_2_plus_lbl, min_value: Number(formData.late_30_2_plus_qty), numeric_value: Number(formData.late_30_2_plus_val), sort_order: 2 },
                { factor_slug: 'late_60_1', label: formData.late_60_1_lbl, min_value: Number(formData.late_60_1_qty), numeric_value: Number(formData.late_60_1_val), sort_order: 3 },
                { factor_slug: 'late_60_2_plus', label: formData.late_60_2_plus_lbl, min_value: Number(formData.late_60_2_plus_qty), numeric_value: Number(formData.late_60_2_plus_val), sort_order: 4 },
                { factor_slug: 'late_90_1', label: formData.late_90_1_lbl, min_value: Number(formData.late_90_1_qty), numeric_value: Number(formData.late_90_1_val), sort_order: 5 },
                { factor_slug: 'late_90_2_plus', label: formData.late_90_2_plus_lbl, min_value: Number(formData.late_90_2_plus_qty), numeric_value: Number(formData.late_90_2_plus_val), sort_order: 6 },
                { factor_slug: 'late_120_1', label: formData.late_120_1_lbl, min_value: Number(formData.late_120_1_qty), numeric_value: Number(formData.late_120_1_val), sort_order: 7 },
                { factor_slug: 'late_120_2_plus', label: formData.late_120_2_plus_lbl, min_value: Number(formData.late_120_2_plus_qty), numeric_value: Number(formData.late_120_2_plus_val), sort_order: 8 },
            ];
            scorePayload.late_payment_modifiers = latePaymentModifiers;

            const timeToDecimal = (t: string): number => {
                const [h, m] = t.split(':');
                return parseInt(h) + parseInt(m) / 60;
            };
            scorePayload.time_settings = [
                { label: 'Morning', start: timeToDecimal(timeSettings.morning.start), end: timeToDecimal(timeSettings.morning.end), sort_order: 1 },
                { label: 'Mid Day', start: timeToDecimal(timeSettings.midday.start), end: timeToDecimal(timeSettings.midday.end), sort_order: 2 },
                { label: 'Evening', start: timeToDecimal(timeSettings.evening.start), end: timeToDecimal(timeSettings.evening.end), sort_order: 3 },
            ];

            const saveResp = await updateScoreConfigurations(scorePayload);
            if (saveResp?.status === false) {
                toast.error(saveResp?.message || 'Failed to save score configuration.');
                return;
            }
            toast.success('Score configuration saved successfully!');
            await loadScoreConfig();
        } catch (error: any) {
            console.error('Failed to save score configuration:', error);
            toast.error(error?.response?.data?.message || 'Failed to save score configuration.');
        } finally {
            setLoading(false);
        }
    };

    const totalWeight = (Number(formData.weight_fico) || 0) +
        (Number(formData.weight_utilization) || 0) +
        (Number(formData.weight_time_in_business) || 0) +
        (Number(formData.weight_revenue_strength) || 0) +
        (Number(formData.weight_tradeline_depth) || 0) +
        (Number(formData.weight_banking_relationships) || 0);

    const getProgressBarColor = () => {
        if (totalWeight === 100) return 'bg-success';
        if (totalWeight > 100) return 'bg-danger';
        return 'bg-warning';
    };

    return (
        <div className="card">
            <div className="card-header d-flex align-items-center justify-content-between bg-white border-bottom py-3">
                <div className="d-flex align-items-center gap-3">
                    <div className="avatar-sm flex-shrink-0">
                        <div className="avatar-title bg-primary-subtle text-primary rounded fs-20">
                            <i className="ri-percent-line"></i>
                        </div>
                    </div>
                    <div>
                        <h5 className="card-title mb-0 fs-15">Score Calculation</h5>
                        <p className="text-muted mb-0 fs-13">Configure weight distribution, metric subscores, and readiness bands</p>
                    </div>
                </div>
            </div>

            <div className="card-body p-4">
                {fetching ? (
                    <MicroBiltConfigSkeleton />
                ) : (
                    <form id="score-config-form" onSubmit={handleSubmit}>
                        {/* Tab List */}
                        <ul className="nav nav-tabs nav-tabs-custom nav-primary mb-4 border-bottom" role="tablist">
                            <li className="nav-item">
                                <button
                                    type="button"
                                    className={`nav-link fw-semibold ${activeTab === 'readiness' ? 'active' : ''}`}
                                    onClick={() => setActiveTab('readiness')}
                                    role="tab"
                                >
                                    Funding Readiness
                                </button>
                            </li>
                            <li className="nav-item">
                                <button
                                    type="button"
                                    className={`nav-link fw-semibold ${activeTab === 'probability' ? 'active' : ''}`}
                                    onClick={() => setActiveTab('probability')}
                                    role="tab"
                                >
                                    Approval Probability
                                </button>
                            </li>
                            <li className="nav-item">
                                <button
                                    type="button"
                                    className={`nav-link fw-semibold ${activeTab === 'odds' ? 'active' : ''}`}
                                    onClick={() => setActiveTab('odds')}
                                    role="tab"
                                >
                                    Approval Odds
                                </button>
                            </li>
                            <li className="nav-item">
                                <button
                                    type="button"
                                    className={`nav-link fw-semibold ${activeTab === 'general' ? 'active' : ''}`}
                                    onClick={() => setActiveTab('general')}
                                    role="tab"
                                >
                                    General setting
                                </button>
                            </li>
                        </ul>

                        {activeTab === 'readiness' && (
                            <FundingReadinessTab
                                formData={formData}
                                errors={errors}
                                loading={loading}
                                handleInputChange={handleInputChange}
                                factorTierLabel={factorTierLabel}
                                totalWeight={totalWeight}
                                getProgressBarColor={getProgressBarColor}
                            />
                        )}

                        {activeTab === 'probability' && (
                            <ApprovalProbabilityTab
                                formData={formData}
                                loading={loading}
                                handleInputChange={handleInputChange}
                                factorTierLabel={factorTierLabel}
                            />
                        )}

                        {activeTab === 'odds' && (
                            <ApprovalOddsTab
                                formData={formData}
                                loading={loading}
                                handleInputChange={handleInputChange}
                                factorTierLabel={factorTierLabel}
                            />
                        )}

                        {activeTab === 'general' && (
                            <GeneralSettingTab
                                timeSettings={timeSettings}
                                onChange={setTimeSettings}
                            />
                        )}

                        <div className="col-12 mt-5 pt-3 border-top">
                            <div className="d-flex justify-content-end">
                                <button
                                    type="submit"
                                    className="btn btn-primary px-4 py-2 fw-medium d-flex align-items-center gap-2"
                                    disabled={loading}
                                >
                                    {loading ? (
                                        <>
                                            <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>
                                            <span>Saving Configuration...</span>
                                        </>
                                    ) : (
                                        <>
                                            <i className="ri-checkbox-circle-line fs-16"></i>
                                            <span>Save Configuration</span>
                                        </>
                                    )}
                                </button>
                            </div>
                        </div>
                    </form>
                )}
            </div>
        </div>
    );
};

export default ScoreCalculationConfigForm;
