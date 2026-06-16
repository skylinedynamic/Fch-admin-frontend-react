import React, { useState, useEffect, useRef } from 'react';
import { toast } from 'react-toastify';
import { fetchAppConfigurations, saveAppConfigurations, fetchScoreConfigurations, updateScoreConfigurations } from '../../../modules/settings/services';
import type { ScoreConfiguration, ScoreFactorTier, ScoreConfigItem } from '../../../modules/settings/types';
import { MODULE_CREDIT_PROFILE } from '../../../config/appConfig';
import { MicroBiltConfigSkeleton } from '../../../components/Loader/SpecificSkeletons';
import DynamicActionModal from '../../../components/Common/Modals/DynamicActionModal';
import { Dropdown, DropdownChangeEvent } from 'primereact/dropdown';

interface FormData {
    parser_mode: string;
    openai_api_key: string;
    openai_model: string;
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

    // Card Approval Odds weights
    weight_fico_card: string;
    weight_utilization_card: string;
    weight_inquiries_card: string;
    weight_tib_card: string;
    weight_revenue_card: string;

    // Approval Odds mapping
    odds_90_plus: string;
    odds_80_89: string;
    odds_70_79: string;
    odds_60_69: string;
    odds_50_59: string;
    odds_under_50: string;

    // Odds band thresholds
    odds_band_t1: string;
    odds_band_t2: string;
    odds_band_t3: string;
    odds_band_t4: string;
    odds_band_t5: string;

    // Readiness band thresholds
    readiness_band_t1: string;
    readiness_band_t2: string;
    readiness_band_t3: string;
    readiness_band_t4: string;

    // Play Eligibility thresholds
    play_min_fico_recovery: string;
    play_min_fico_foundation: string;
    play_min_fico_startup: string;
    play_min_fico_zerocost: string;
    play_min_fico_relationship: string;
    play_min_fico_investor: string;
    play_min_fico_executive: string;
    play_min_fico_acquisition: string;
    play_min_fico_elite: string;

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

    trade_rule_multi_accounts: string;
    trade_rule_multi_high_limit_count: string;
    trade_rule_multi_high_limit_amount: string;
    trade_rule_good_accounts: string;
    trade_rule_good_high_limit_count: string;
    trade_rule_good_high_limit_amount: string;
    trade_rule_mod_accounts_min: string;
    trade_rule_mod_accounts_max: string;

    bank_rule_strong_years: string;
    bank_rule_established_months: string;
    bank_rule_basic_months: string;
}

interface FormErrors {
    [key: string]: string | null;
}

const CreditProfileConfigForm: React.FC = () => {
    const [loading, setLoading] = useState<boolean>(false);
    const [fetching, setFetching] = useState<boolean>(true);
    const [showModal, setShowModal] = useState<boolean>(false);
    const [pendingMode, setPendingMode] = useState<string | null>(null);
    const [showApiKey, setShowApiKey] = useState<boolean>(false);
    const [activeTab, setActiveTab] = useState<'parsing' | 'score'>('parsing');
    const [formData, setFormData] = useState<FormData>({
        parser_mode: '',
        openai_api_key: '',
        openai_model: '',
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

        // Card Approval Odds weights defaults
        weight_fico_card: '40',
        weight_utilization_card: '25',
        weight_inquiries_card: '15',
        weight_tib_card: '10',
        weight_revenue_card: '10',

        // Approval Odds mapping defaults
        odds_90_plus: '95',
        odds_80_89: '85',
        odds_70_79: '75',
        odds_60_69: '65',
        odds_50_59: '50',
        odds_under_50: '25',

        // Odds band thresholds defaults
        odds_band_t1: '90',
        odds_band_t2: '80',
        odds_band_t3: '70',
        odds_band_t4: '60',
        odds_band_t5: '50',

        // Readiness band thresholds defaults
        readiness_band_t1: '90',
        readiness_band_t2: '80',
        readiness_band_t3: '70',
        readiness_band_t4: '60',

        play_min_fico_recovery: '680',
        play_min_fico_foundation: '700',
        play_min_fico_startup: '700',
        play_min_fico_zerocost: '700',
        play_min_fico_relationship: '700',
        play_min_fico_investor: '720',
        play_min_fico_executive: '740',
        play_min_fico_acquisition: '740',
        play_min_fico_elite: '760',

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

        trade_rule_multi_accounts: '5',
        trade_rule_multi_high_limit_count: '2',
        trade_rule_multi_high_limit_amount: '15000',
        trade_rule_good_accounts: '3',
        trade_rule_good_high_limit_count: '1',
        trade_rule_good_high_limit_amount: '10000',
        trade_rule_mod_accounts_min: '2',

        bank_rule_strong_years: '2',
        bank_rule_established_months: '12',
        bank_rule_basic_months: '0',
    });
    const [errors, setErrors] = useState<FormErrors>({});
    const scoreDataRef = useRef<ScoreConfiguration | null>(null);
    const [scoreLoaded, setScoreLoaded] = useState(false);

    const sv = (v: any, fallback: string): string => v !== null && v !== undefined && v !== '' ? String(v) : fallback;

    useEffect(() => {
        loadParsingConfig();
    }, []);

    useEffect(() => {
        if (activeTab === 'score' && !scoreLoaded) {
            loadScoreConfig();
        }
    }, [activeTab, scoreLoaded]);

    const loadParsingConfig = async () => {
        try {
            setFetching(true);
            const appRes = await fetchAppConfigurations(MODULE_CREDIT_PROFILE);
            const configData = appRes?.data || {};
            setFormData(prev => ({
                ...prev,
                parser_mode: configData.credit_profile_parser_mode || '',
                openai_api_key: configData.credit_profile_openai_api_key || '',
                openai_model: configData.credit_profile_openai_model || '',
            }));
        } catch (error) {
            console.error('Failed to load parsing configuration:', error);
            toast.error('Failed to load parsing configuration.');
        } finally {
            setFetching(false);
        }
    };

    const loadScoreConfig = async () => {
        try {
            setFetching(true);
            const scoreRes = await fetchScoreConfigurations();
            const scoreConfig = scoreRes?.data;

            if (scoreConfig) {
                scoreDataRef.current = scoreConfig;
                setScoreLoaded(true);
            }

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
                const found = list.find((c: any) => c.field === field);
                if (Array.isArray(found?.value)) return sv(found.value[valIndex], fallback);
                return sv(found?.value, fallback);
            };

            const buildBandVal = (items: ScoreConfigItem[], index: number, key: string, fallback: string): string => {
                const item = items?.[index];
                if (!item) return fallback;
                let val: any;
                if (key === 'numeric_value') val = item.numeric_value;
                else if (key === 'min_value') val = item.min_value;
                return sv(val, fallback);
            };

            const bands = scoreConfig?.band_mappings || [];
            const readiness = scoreConfig?.readiness_bands || [];
            const plays = scoreConfig?.play_eligibility || [];

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

                weight_fico_card: buildWeight('card_approval_odds', 'fico', '40'),
                weight_utilization_card: buildWeight('card_approval_odds', 'utilization', '25'),
                weight_inquiries_card: buildWeight('card_approval_odds', 'recent_inquiries', '15'),
                weight_tib_card: buildWeight('card_approval_odds', 'time_in_business', '10'),
                weight_revenue_card: buildWeight('card_approval_odds', 'revenue_strength', '10'),

                odds_90_plus: buildBandVal(bands, 0, 'numeric_value', '95'),
                odds_80_89: buildBandVal(bands, 1, 'numeric_value', '85'),
                odds_70_79: buildBandVal(bands, 2, 'numeric_value', '75'),
                odds_60_69: buildBandVal(bands, 3, 'numeric_value', '65'),
                odds_50_59: buildBandVal(bands, 4, 'numeric_value', '50'),
                odds_under_50: buildBandVal(bands, 5, 'numeric_value', '25'),

                odds_band_t1: buildBandVal(bands, 0, 'min_value', '90'),
                odds_band_t2: buildBandVal(bands, 1, 'min_value', '80'),
                odds_band_t3: buildBandVal(bands, 2, 'min_value', '70'),
                odds_band_t4: buildBandVal(bands, 3, 'min_value', '60'),
                odds_band_t5: buildBandVal(bands, 4, 'min_value', '50'),

                readiness_band_t1: buildBandVal(readiness, 0, 'min_value', '90'),
                readiness_band_t2: buildBandVal(readiness, 1, 'min_value', '80'),
                readiness_band_t3: buildBandVal(readiness, 2, 'min_value', '70'),
                readiness_band_t4: buildBandVal(readiness, 3, 'min_value', '60'),

                play_min_fico_recovery: buildBandVal(plays, 0, 'numeric_value', '680'),
                play_min_fico_foundation: buildBandVal(plays, 1, 'numeric_value', '700'),
                play_min_fico_startup: buildBandVal(plays, 2, 'numeric_value', '700'),
                play_min_fico_zerocost: buildBandVal(plays, 3, 'numeric_value', '700'),
                play_min_fico_relationship: buildBandVal(plays, 4, 'numeric_value', '700'),
                play_min_fico_investor: buildBandVal(plays, 5, 'numeric_value', '720'),
                play_min_fico_executive: buildBandVal(plays, 6, 'numeric_value', '740'),
                play_min_fico_acquisition: buildBandVal(plays, 7, 'numeric_value', '740'),
                play_min_fico_elite: buildBandVal(plays, 8, 'numeric_value', '760'),

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
                trade_rule_multi_high_limit_amount: getCond('tradeline_depth', 0, 'avg_high_limit', '15000'),
                trade_rule_good_accounts: getCond('tradeline_depth', 1, 'open_accounts', '3'),
                trade_rule_good_high_limit_count: getCond('tradeline_depth', 1, 'high_limit_accounts', '1'),
                trade_rule_good_high_limit_amount: getCond('tradeline_depth', 1, 'avg_high_limit', '10000'),
                trade_rule_mod_accounts_min: getCond('tradeline_depth', 2, 'open_accounts', '2'),
                trade_rule_mod_accounts_max: getCond('tradeline_depth', 2, 'open_accounts', '3', 1),

                bank_rule_strong_years: getCond('banking_relationships', 0, 'accounts', '2'),
                bank_rule_established_months: getCond('banking_relationships', 0, 'checking_months', '12'),
            }));
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

    const handleModeChangeRequest = (newMode: string) => {
        if (newMode !== formData.parser_mode) {
            setPendingMode(newMode);
            setShowModal(true);
        }
    };

    const confirmModeChange = () => {
        if (pendingMode) {
            setFormData(prev => ({ ...prev, parser_mode: pendingMode }));
            setErrors({});
        }
        setShowModal(false);
        setPendingMode(null);
    };

    const cancelModeChange = () => {
        setShowModal(false);
        setPendingMode(null);
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

        const cardSum = (Number(formData.weight_fico_card) || 0) +
            (Number(formData.weight_utilization_card) || 0) +
            (Number(formData.weight_inquiries_card) || 0) +
            (Number(formData.weight_tib_card) || 0) +
            (Number(formData.weight_revenue_card) || 0);
        if (cardSum !== 100) {
            newErrors.card_weights_sum = `Card score weights must equal exactly 100%. Current sum: ${cardSum}%.`;
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const findModel = (slug: string) => scoreDataRef.current?.models?.find((m: any) => m.slug === slug) ?? null;
    const findFactor = (slug: string) => scoreDataRef.current?.factors?.find((f: any) => f.slug === slug) ?? null;
    const findTierId = (factorSlug: string, index: number): number | null => {
        const factor = findFactor(factorSlug);
        return factor?.subscore_tiers?.[index]?.id ?? null;
    };

    const buildFactorWeight = (modelSlug: string, factorSlug: string, weightStr: string, sortOrder: number) => {
        const model = findModel(modelSlug);
        const factor = findFactor(factorSlug);
        if (!model || !factor) return null;
        return { id: factor.id, slug: factor.slug, weight: Number(weightStr) || 0, sort_order: sortOrder };
    };

    const getTierValue = (key: keyof FormData): number => Number(formData[key] as any) || 0;

    const buildTierUpdate = (factorSlug: string, index: number, overrides: Record<string, any>) => {
        const id = findTierId(factorSlug, index);
        if (!id) {
            console.warn(`[Score Save] No tier ID found for ${factorSlug}[${index}] — sending update without ID`);
        }
        return id ? { id, ...overrides } : overrides;
    };

    const buildConditions = (
        factorSlug: string,
        tierIndex: number,
        rules: Array<{ field: string; operator: string; valueKey?: string; value?: any; transform?: (val: number) => any }>
    ): any => {
        const tier = findFactor(factorSlug)?.subscore_tiers?.[tierIndex];
        const existing = tier?.conditions;
        let base = existing && typeof existing === 'object' ? JSON.parse(JSON.stringify(existing)) : { any: [] };
        
        let container = null;
        if (Array.isArray(base)) {
            container = base;
        } else {
            container = base.all ?? base.any;
        }
        
        if (!container) return base;
        for (const rule of rules) {
            let value: any;
            if (rule.value !== undefined) {
                value = rule.value;
            } else if (rule.valueKey) {
                value = getTierValue(rule.valueKey as keyof FormData);
                if (rule.transform) value = rule.transform(value);
            } else {
                continue;
            }
            const entry = { field: rule.field, operator: rule.operator, value };
            const idx = container.findIndex((c: any) => c.field === rule.field);
            if (idx >= 0) container[idx] = entry;
            else container.push(entry);
        }
        return base;
    };

    const TIER_DEFINITIONS: Record<string, Array<{
        i: number;
        min?: keyof FormData;
        max?: keyof FormData;
        sub: keyof FormData;
        rules?: Array<{ field: string; operator: string; valueKey: keyof FormData; transform?: (val: number) => any }>;
    }>> = {
        fico: [
            { i: 0, min: 'fico_rule_t1' as any, sub: 'fico_subscore_780_plus' as any },
            { i: 1, min: 'fico_rule_t2' as any, sub: 'fico_subscore_760_779' as any },
            { i: 2, min: 'fico_rule_t3' as any, sub: 'fico_subscore_740_759' as any },
            { i: 3, min: 'fico_rule_t4' as any, sub: 'fico_subscore_720_739' as any },
            { i: 4, min: 'fico_rule_t5' as any, sub: 'fico_subscore_700_719' as any },
            { i: 5, min: 'fico_rule_t6' as any, sub: 'fico_subscore_680_699' as any },
            { i: 6, min: 'fico_rule_t7' as any, sub: 'fico_subscore_660_679' as any },
            { i: 7, sub: 'fico_subscore_below_660' as any },
        ],
        utilization: [
            { i: 0, max: 'util_rule_t1' as any, sub: 'util_subscore_0_5' as any },
            { i: 1, max: 'util_rule_t2' as any, sub: 'util_subscore_5_10' as any },
            { i: 2, max: 'util_rule_t3' as any, sub: 'util_subscore_10_20' as any },
            { i: 3, max: 'util_rule_t4' as any, sub: 'util_subscore_20_30' as any },
            { i: 4, max: 'util_rule_t5' as any, sub: 'util_subscore_30_40' as any },
            { i: 5, sub: 'util_subscore_above_40' as any },
        ],
        time_in_business: [
            { i: 0, min: 'time_rule_t1' as any, sub: 'time_subscore_36_plus' as any },
            { i: 1, min: 'time_rule_t2' as any, sub: 'time_subscore_24_35' as any },
            { i: 2, min: 'time_rule_t3' as any, sub: 'time_subscore_12_23' as any },
            { i: 3, min: 'time_rule_t4' as any, sub: 'time_subscore_6_11' as any },
            { i: 4, sub: 'time_subscore_below_6' as any },
        ],
        revenue_strength: [
            { i: 0, min: 'rev_rule_t1' as any, sub: 'rev_subscore_strong' as any },
            { i: 1, min: 'rev_rule_t2' as any, max: 'rev_rule_t1' as any, maxOffset: -1, sub: 'rev_subscore_moderate' as any },
            { i: 2, min: 'rev_rule_t3' as any, max: 'rev_rule_t2' as any, maxOffset: -1, sub: 'rev_subscore_limited' as any },
            { i: 3, max: 'rev_rule_t3' as any, maxOffset: -1, sub: 'rev_subscore_weak' as any },
        ],
        tradeline_depth: [
            {
                i: 0, sub: 'trade_subscore_multiple_high' as any, rules: [
                    { field: 'open_accounts', operator: '>=', valueKey: 'trade_rule_multi_accounts' as any },
                    { field: 'high_limit_accounts', operator: '>=', valueKey: 'trade_rule_multi_high_limit_count' as any },
                    { field: 'limit', operator: '>=', valueKey: 'trade_rule_multi_high_limit_amount' as any },
                ]
            },
            {
                i: 1, sub: 'trade_subscore_good_depth' as any, rules: [
                    { field: 'open_accounts', operator: '>=', valueKey: 'trade_rule_good_accounts' as any },
                    { field: 'high_limit_accounts', operator: '>=', valueKey: 'trade_rule_good_high_limit_count' as any },
                    { field: 'limit', operator: '>=', valueKey: 'trade_rule_good_high_limit_amount' as any },
                ]
            },
            {
                i: 2, sub: 'trade_subscore_moderate' as any, rules: [
                    { field: 'open_accounts', operator: '>=', valueKey: 'trade_rule_mod_accounts_min' as any },
                ]
            },
            {
                i: 3, sub: 'trade_subscore_thin' as any, rules: [
                    { field: 'open_accounts', operator: '>=', value: 0 },
                ]
            },
        ],
        banking_relationships: [
            {
                i: 0, sub: 'bank_subscore_strong' as any, rules: [
                    { field: 'accounts', operator: '>=', valueKey: 'bank_rule_strong_years' as any },
                    { field: 'checking_months', operator: '>', valueKey: 'bank_rule_established_months' as any },
                ]
            },
            {
                i: 1, sub: 'bank_subscore_established' as any, rules: [
                    { field: 'accounts', operator: '>=', valueKey: 'bank_rule_strong_years' as any },
                    { field: 'checking_months', operator: '>', valueKey: 'bank_rule_established_months' as any },
                ]
            },
            {
                i: 2, sub: 'bank_subscore_basic' as any, rules: [
                    { field: 'accounts', operator: '>=', valueKey: 'bank_rule_strong_years' as any },
                ]
            },
            {
                i: 3, sub: 'bank_subscore_weak' as any, rules: [
                    { field: 'accounts', operator: '=', valueKey: 'bank_rule_strong_years' as any },
                ]
            },
        ],
    };

    const buildModelSection = () => {
        const models = scoreDataRef.current?.models ?? [];
        if (!models.length) return [];

        return models.map(model => {
            const factorWeights: Record<string, { weightField: keyof FormData; sortOrder: number }> = {
                funding_readiness: {
                    fico: { weightField: 'weight_fico' as any, sortOrder: 1 },
                    utilization: { weightField: 'weight_utilization' as any, sortOrder: 2 },
                    time_in_business: { weightField: 'weight_time_in_business' as any, sortOrder: 3 },
                    revenue_strength: { weightField: 'weight_revenue_strength' as any, sortOrder: 4 },
                    tradeline_depth: { weightField: 'weight_tradeline_depth' as any, sortOrder: 5 },
                    banking_relationships: { weightField: 'weight_banking_relationships' as any, sortOrder: 6 },
                },
                card_approval_odds: {
                    fico: { weightField: 'weight_fico_card' as any, sortOrder: 1 },
                    utilization: { weightField: 'weight_utilization_card' as any, sortOrder: 2 },
                    recent_inquiries: { weightField: 'weight_inquiries_card' as any, sortOrder: 3 },
                    time_in_business: { weightField: 'weight_tib_card' as any, sortOrder: 4 },
                    revenue_strength: { weightField: 'weight_revenue_card' as any, sortOrder: 5 },
                },
            };

            const factorConfigs = factorWeights[model.slug];
            if (!factorConfigs) return null;

            const factors = Object.entries(factorConfigs)
                .map(([factorSlug, cfg]) => {
                    const factor = findFactor(factorSlug);
                    if (!factor) return null;
                    return {
                        id: factor.id,
                        slug: factor.slug,
                        weight: getTierValue(cfg.weightField),
                        sort_order: cfg.sortOrder,
                    };
                })
                .filter(Boolean);

            return { id: model.id, slug: model.slug, factors };
        }).filter(Boolean);
    };

    const buildFactorsSection = () => {
        const factors: any[] = [];
        for (const [slug, tiers] of Object.entries(TIER_DEFINITIONS)) {
            const factor = findFactor(slug);
            if (!factor) continue;
            const factorTiers: any[] = [];
            for (const t of tiers) {
                const tierUpdate: any = {};
                if (t.min) tierUpdate.min_value = getTierValue(t.min);
                if (t.max) {
                    let maxVal = getTierValue(t.max);
                    if (t.maxOffset !== undefined) maxVal += t.maxOffset;
                    tierUpdate.max_value = maxVal;
                }
                tierUpdate.numeric_value = getTierValue(t.sub);
                if (t.rules) {
                    tierUpdate.conditions = buildConditions(slug, t.i, t.rules);
                } else {
                    tierUpdate.conditions = null;
                }
                const result = buildTierUpdate(slug, t.i, tierUpdate);
                if (result) factorTiers.push(result);
            }
            if (factorTiers.length) {
                factors.push({ id: factor.id, slug: factor.slug, tiers: factorTiers });
            }
        }
        return factors;
    };

    const buildBandSection = (key: 'band_mappings' | 'readiness_bands' | 'play_eligibility') => {
        const items = (scoreDataRef.current as any)?.[key] ?? [];
        const configs: Record<string, Array<{ i: number; valKey?: string; minKey?: string }>> = {
            band_mappings: [
                { i: 0, valKey: 'odds_90_plus', minKey: 'odds_band_t1' },
                { i: 1, valKey: 'odds_80_89', minKey: 'odds_band_t2' },
                { i: 2, valKey: 'odds_70_79', minKey: 'odds_band_t3' },
                { i: 3, valKey: 'odds_60_69', minKey: 'odds_band_t4' },
                { i: 4, valKey: 'odds_50_59', minKey: 'odds_band_t5' },
                { i: 5, valKey: 'odds_under_50' },
            ],
            readiness_bands: [
                { i: 0, minKey: 'readiness_band_t1' },
                { i: 1, minKey: 'readiness_band_t2' },
                { i: 2, minKey: 'readiness_band_t3' },
                { i: 3, minKey: 'readiness_band_t4' },
            ],
            play_eligibility: [
                { i: 0, valKey: 'play_min_fico_recovery' },
                { i: 1, valKey: 'play_min_fico_foundation' },
                { i: 2, valKey: 'play_min_fico_startup' },
                { i: 3, valKey: 'play_min_fico_zerocost' },
                { i: 4, valKey: 'play_min_fico_relationship' },
                { i: 5, valKey: 'play_min_fico_investor' },
                { i: 6, valKey: 'play_min_fico_executive' },
                { i: 7, valKey: 'play_min_fico_acquisition' },
                { i: 8, valKey: 'play_min_fico_elite' },
            ],
        };
        const defs = configs[key] ?? [];
        return defs.map(b => ({
            id: items[b.i]?.id,
            ...(b.valKey ? { numeric_value: getTierValue(b.valKey as any) } : {}),
            ...(b.minKey ? { min_value: getTierValue(b.minKey as any) || null } : {}),
        })).filter(b => b.id);
    };

    const validateParsing = (): boolean => {
        const newErrors: FormErrors = {};
        if (!formData.parser_mode) {
            newErrors.parser_mode = 'Please select a parsing mode.';
        }
        if (formData.parser_mode === 'openai') {
            if (!formData.openai_api_key.trim()) {
                newErrors.openai_api_key = 'OpenAI API Key is required when OpenAI parsing is selected.';
            }
            if (!formData.openai_model.trim()) {
                newErrors.openai_model = 'Please select a model.';
            }
        }
        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (activeTab === 'parsing') {
            if (!validateParsing()) {
                toast.error('Validation failed. Please correct the errors before saving.');
                return;
            }
            setLoading(true);
            try {
                const appPayload: Record<string, string> = {
                    credit_profile_parser_mode: formData.parser_mode,
                    credit_profile_openai_api_key: formData.openai_api_key,
                    credit_profile_openai_model: formData.parser_mode === 'openai' ? formData.openai_model : '',
                };
                await saveAppConfigurations(MODULE_CREDIT_PROFILE, appPayload);
                toast.success('Parsing configuration saved successfully!');
            } catch (error: any) {
                console.error('Failed to save parsing config:', error);
                toast.error(error?.response?.data?.message || 'Failed to save parsing configuration.');
            } finally {
                setLoading(false);
            }
            return;
        }

        // Score tab
        if (!validate()) {
            toast.error('Validation failed. Please correct the errors before saving.');
            return;
        }

        setLoading(true);
        try {
            const scorePayload: Record<string, any> = {
                models: buildModelSection(),
                factors: buildFactorsSection(),
                band_mappings: buildBandSection('band_mappings'),
                readiness_bands: buildBandSection('readiness_bands'),
                play_eligibility: buildBandSection('play_eligibility'),
            };

            const saveResp = await updateScoreConfigurations(scorePayload);
            if (saveResp?.status === false) {
                toast.error(saveResp?.message || 'Failed to save score configuration.');
                return;
            }
            toast.success('Score configuration saved successfully!');
            setScoreLoaded(false);
            await loadScoreConfig();
        } catch (error: any) {
            console.error('Failed to save score configuration:', error);
            toast.error(error?.response?.data?.message || 'Failed to save score configuration.');
        } finally {
            setLoading(false);
        }
    };

    const isManual = formData.parser_mode === 'manual' || formData.parser_mode === '';
    const modeLabel = formData.parser_mode === 'openai' ? 'OpenAI Data Parsing' : formData.parser_mode === 'manual' ? 'Manual Data Parsing' : 'Not Set';

    const cardTotalWeight = (Number(formData.weight_fico_card) || 0) +
        (Number(formData.weight_utilization_card) || 0) +
        (Number(formData.weight_inquiries_card) || 0) +
        (Number(formData.weight_tib_card) || 0) +
        (Number(formData.weight_revenue_card) || 0);

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
        <>
            <div className="card">
                <div className="card-header d-flex align-items-center justify-content-between bg-white border-bottom py-3">
                    <div className="d-flex align-items-center gap-3">
                        <div className="avatar-sm flex-shrink-0">
                            <div className="avatar-title bg-primary-subtle text-primary rounded fs-20">
                                <i className="ri-file-chart-line"></i>
                            </div>
                        </div>
                        <div>
                            <h5 className="card-title mb-0 fs-15">Credit Profile</h5>
                            <p className="text-muted mb-0 fs-13">Configure credit report parsing and score calculation rules</p>
                        </div>
                    </div>

                    {/* Navigation Tabs */}
                    <ul className="nav nav-pills card-header-pills fs-14 gap-2">
                        <li className="nav-item">
                            <button
                                type="button"
                                className={`nav-link fw-medium px-3 py-2 rounded-2 d-flex align-items-center gap-1 ${activeTab === 'parsing' ? 'active' : 'text-body'}`}
                                onClick={() => setActiveTab('parsing')}
                            >
                                <i className="ri-file-pdf-line fs-14"></i>
                                ISoftPull Data Parsing
                            </button>
                        </li>
                        <li className="nav-item">
                            <button
                                type="button"
                                className={`nav-link fw-medium px-3 py-2 rounded-2 d-flex align-items-center gap-1 ${activeTab === 'score' ? 'active' : 'text-body'}`}
                                onClick={() => setActiveTab('score')}
                            >
                                <i className="ri-percent-line fs-14"></i>
                                Score Calculation
                            </button>
                        </li>
                    </ul>
                </div>

                <div className="card-body p-4">
                    {fetching ? (
                        <MicroBiltConfigSkeleton />
                    ) : (
                        <form id="score-config-form" onSubmit={handleSubmit}>
                            {activeTab === 'parsing' ? (
                                <div className="animate__animated animate__fadeIn">
                                    <div className="d-flex align-items-center bg-success-subtle rounded-3 p-3 mb-4">
                                        <div className="flex-shrink-0 me-4">
                                            <div className="avatar-md">
                                                <div className="avatar-title bg-white rounded fs-24 text-danger">
                                                    <i className="ri-file-pdf-line"></i>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="flex-grow-1">
                                            <h6 className="mb-1 text-dark fw-semibold fs-14">Credit Report Data Extraction</h6>
                                            <p className="text-muted mb-0 fs-13">
                                                <strong>Manual Parsing</strong> uses built-in regex rules to extract data from iSoftPull credit report PDFs.
                                                <strong> OpenAI Parsing</strong> sends the PDF text through an AI model for more accurate and flexible extraction, especially for non-standard formats.
                                            </p>
                                        </div>
                                    </div>

                                    {/* Parsing Mode Toggle */}
                                    <div className="mb-4 bg-primary-subtle rounded-3 p-3">
                                        <div className="d-flex align-items-center justify-content-between">
                                            <div>
                                                <h6 className="mb-1 fw-bold fs-14">Parsing Mode</h6>
                                                <p className="text-muted mb-0 fs-13">
                                                    Currently using <strong>{modeLabel}</strong> for credit report extraction.
                                                </p>
                                            </div>
                                            <div>
                                                <Dropdown
                                                    value={formData.parser_mode}
                                                    options={[
                                                        { label: '📋 Manual Data Parsing', value: 'manual' },
                                                        { label: '🤖 OpenAI Data Parsing', value: 'openai' }
                                                    ]}
                                                    onChange={(e: DropdownChangeEvent) => handleModeChangeRequest(e.value)}
                                                    placeholder="Select Parsing Mode"
                                                    className={`w-100 ${errors.parser_mode ? 'p-invalid' : ''}`}
                                                    disabled={loading}
                                                />
                                                {errors.parser_mode && <div className="text-danger small mt-1"><i className="ri-error-warning-line me-1"></i>{errors.parser_mode}</div>}
                                            </div>
                                        </div>
                                    </div>

                                    {/* OpenAI Configuration Fields */}
                                    {!isManual && (
                                        <div className="row g-4 mt-2 animate__animated animate__fadeIn">
                                            <div className="col-12">
                                                <div className="border rounded-3 p-3 bg-light-subtle">
                                                    <h6 className="mb-3 fw-semibold fs-14">
                                                        <i className="ri-robot-line me-1"></i> OpenAI Configuration
                                                    </h6>
                                                    <div className="row g-4">
                                                        <div className="col-12">
                                                            <label className="form-label fw-medium">API Key</label>
                                                            <div className="input-group">
                                                                <span className="input-group-text bg-light text-muted config-label-span">
                                                                    <i className="ri-key-2-line me-1"></i> API Key
                                                                </span>
                                                                <input
                                                                    type={showApiKey ? 'text' : 'password'}
                                                                    className={`form-control fs-14 config-input-no-shadow ${errors.openai_api_key ? 'is-invalid border-danger' : ''}`}
                                                                    name="openai_api_key"
                                                                    value={formData.openai_api_key}
                                                                    onChange={handleInputChange}
                                                                    placeholder="sk-..."
                                                                />
                                                                <button
                                                                    type="button"
                                                                    className="btn btn-light border"
                                                                    onClick={() => setShowApiKey(!showApiKey)}
                                                                    title={showApiKey ? 'Hide API key' : 'Show API key'}
                                                                >
                                                                    <i className={`ri-${showApiKey ? 'eye-off-line' : 'eye-line'} text-muted`}></i>
                                                                </button>
                                                                {errors.openai_api_key && (
                                                                    <div className="invalid-feedback d-block ps-3 pt-1">
                                                                        <i className="ri-error-warning-line me-1"></i>{errors.openai_api_key}
                                                                    </div>
                                                                )}
                                                            </div>
                                                            <small className="text-muted mt-1 d-block fs-12">Your OpenAI API key is stored securely and never shared.</small>
                                                        </div>

                                                        <div className="col-12">
                                                            <label className="form-label fw-medium">Model</label>
                                                            <div className="input-group">
                                                                <span className="input-group-text bg-light text-muted config-label-span">
                                                                    <i className="ri-cpu-line me-1"></i> Model
                                                                </span>
                                                                <Dropdown
                                                                    value={formData.openai_model || 'gpt-4o-mini'}
                                                                    options={[
                                                                        { label: 'GPT-4o Mini (Cost-effective)', value: 'gpt-4o-mini' },
                                                                        { label: 'GPT-4o (Recommended)', value: 'gpt-4o' },
                                                                        { label: 'GPT-4 Turbo', value: 'gpt-4-turbo' },
                                                                        { label: 'GPT-3.5 Turbo (Fastest)', value: 'gpt-3.5-turbo' }
                                                                    ]}
                                                                    onChange={(e: DropdownChangeEvent) => {
                                                                        setFormData(prev => ({ ...prev, openai_model: e.value }));
                                                                        if (errors.openai_model) {
                                                                            setErrors(prev => ({ ...prev, openai_model: null }));
                                                                        }
                                                                    }}
                                                                    placeholder="Select Model"
                                                                    className={`flex-grow-1 config-dropdown-radius ${errors.openai_model ? 'p-invalid' : ''}`}
                                                                    disabled={loading}
                                                                />
                                                                {errors.openai_model && (
                                                                    <div className="text-danger small mt-1 ps-3 pt-1 w-100">
                                                                        <i className="ri-error-warning-line me-1"></i>{errors.openai_model}
                                                                    </div>
                                                                )}
                                                            </div>
                                                            <small className="text-muted mt-1 d-block fs-12">GPT-4o provides the best accuracy for credit report parsing.</small>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            ) : (
                                <div className="animate__animated animate__fadeIn">
                                    <div className="d-flex align-items-center bg-primary-subtle rounded-3 p-3 mb-4">
                                        <div className="flex-shrink-0 me-4">
                                            <div className="avatar-md">
                                                <div className="avatar-title bg-white rounded fs-24 text-primary">
                                                    <i className="ri-shield-check-line"></i>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="flex-grow-1">
                                            <h6 className="mb-1 text-dark fw-semibold fs-14">Funding Readiness Score Rules</h6>
                                            <p className="text-muted mb-0 fs-13">
                                                Define weight configuration for the funding readiness evaluation.
                                                The sum of all factor weights must equal exactly <strong>100%</strong>.
                                            </p>
                                        </div>
                                    </div>

                                    <div className="row g-4">
                                        {/* Left: Factor weights */}
                                        <div className="col-12">
                                            <h6 className="fw-semibold fs-14 mb-3">
                                                <i className="ri-scales-3-line me-1 text-primary align-middle"></i> Weight Configuration
                                            </h6>
                                            <div className="table-responsive border rounded-3">
                                                <table className="table table-nowrap table-hover mb-0 align-middle">
                                                    <thead className="table-light">
                                                        <tr>
                                                            <th scope="col config-th-lg">Factor</th>
                                                            <th scope="col config-th-sm">Weight (%)</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody>
                                                        <tr>
                                                            <td>
                                                                <div className="d-flex align-items-center gap-2">
                                                                    <div className="avatar-xs flex-shrink-0">
                                                                        <div className="avatar-title bg-light text-muted rounded-circle fs-13">
                                                                            <i className="ri-user-line"></i>
                                                                        </div>
                                                                    </div>
                                                                    <div>
                                                                        <span className="fw-semibold text-body fs-13">Personal FICO</span>
                                                                        <small className="text-muted d-block fs-11">Measures credit strength and issuer approval baseline.</small>
                                                                    </div>
                                                                </div>
                                                            </td>
                                                            <td>
                                                                <div className="input-group input-group-sm">
                                                                    <input
                                                                        type="number"
                                                                        min="0"
                                                                        max="100"
                                                                        className="form-control"
                                                                        name="weight_fico"
                                                                        value={formData.weight_fico}
                                                                        onChange={handleInputChange}
                                                                        disabled={loading}
                                                                    />
                                                                    <span className="input-group-text">%</span>
                                                                </div>
                                                            </td>
                                                        </tr>
                                                        <tr>
                                                            <td>
                                                                <div className="d-flex align-items-center gap-2">
                                                                    <div className="avatar-xs flex-shrink-0">
                                                                        <div className="avatar-title bg-light text-muted rounded-circle fs-13">
                                                                            <i className="ri-donut-chart-line"></i>
                                                                        </div>
                                                                    </div>
                                                                    <div>
                                                                        <span className="fw-semibold text-body fs-13">Utilization</span>
                                                                        <small className="text-muted d-block fs-11">Measures existing revolving burden and score-risk exposure.</small>
                                                                    </div>
                                                                </div>
                                                            </td>
                                                            <td>
                                                                <div className="input-group input-group-sm">
                                                                    <input
                                                                        type="number"
                                                                        min="0"
                                                                        max="100"
                                                                        className="form-control"
                                                                        name="weight_utilization"
                                                                        value={formData.weight_utilization}
                                                                        onChange={handleInputChange}
                                                                        disabled={loading}
                                                                    />
                                                                    <span className="input-group-text">%</span>
                                                                </div>
                                                            </td>
                                                        </tr>
                                                        <tr>
                                                            <td>
                                                                <div className="d-flex align-items-center gap-2">
                                                                    <div className="avatar-xs flex-shrink-0">
                                                                        <div className="avatar-title bg-light text-muted rounded-circle fs-13">
                                                                            <i className="ri-calendar-line"></i>
                                                                        </div>
                                                                    </div>
                                                                    <div>
                                                                        <span className="fw-semibold text-body fs-13">Time in Business</span>
                                                                        <small className="text-muted d-block fs-11">Measures business maturity.</small>
                                                                    </div>
                                                                </div>
                                                            </td>
                                                            <td>
                                                                <div className="input-group input-group-sm">
                                                                    <input
                                                                        type="number"
                                                                        min="0"
                                                                        max="100"
                                                                        className="form-control"
                                                                        name="weight_time_in_business"
                                                                        value={formData.weight_time_in_business}
                                                                        onChange={handleInputChange}
                                                                        disabled={loading}
                                                                    />
                                                                    <span className="input-group-text">%</span>
                                                                </div>
                                                            </td>
                                                        </tr>
                                                        <tr>
                                                            <td>
                                                                <div className="d-flex align-items-center gap-2">
                                                                    <div className="avatar-xs flex-shrink-0">
                                                                        <div className="avatar-title bg-light text-muted rounded-circle fs-13">
                                                                            <i className="ri-money-dollar-circle-line"></i>
                                                                        </div>
                                                                    </div>
                                                                    <div>
                                                                        <span className="fw-semibold text-body fs-13">Revenue / Income Strength</span>
                                                                        <small className="text-muted d-block fs-11">Measures repayment capacity and limit potential.</small>
                                                                    </div>
                                                                </div>
                                                            </td>
                                                            <td>
                                                                <div className="input-group input-group-sm">
                                                                    <input
                                                                        type="number"
                                                                        min="0"
                                                                        max="100"
                                                                        className="form-control"
                                                                        name="weight_revenue_strength"
                                                                        value={formData.weight_revenue_strength}
                                                                        onChange={handleInputChange}
                                                                        disabled={loading}
                                                                    />
                                                                    <span className="input-group-text">%</span>
                                                                </div>
                                                            </td>
                                                        </tr>
                                                        <tr>
                                                            <td>
                                                                <div className="d-flex align-items-center gap-2">
                                                                    <div className="avatar-xs flex-shrink-0">
                                                                        <div className="avatar-title bg-light text-muted rounded-circle fs-13">
                                                                            <i className="ri-links-line"></i>
                                                                        </div>
                                                                    </div>
                                                                    <div>
                                                                        <span className="fw-semibold text-body fs-13">Tradeline Depth</span>
                                                                        <small className="text-muted d-block fs-11">Measures bureau depth and exposure history.</small>
                                                                    </div>
                                                                </div>
                                                            </td>
                                                            <td>
                                                                <div className="input-group input-group-sm">
                                                                    <input
                                                                        type="number"
                                                                        min="0"
                                                                        max="100"
                                                                        className="form-control"
                                                                        name="weight_tradeline_depth"
                                                                        value={formData.weight_tradeline_depth}
                                                                        onChange={handleInputChange}
                                                                        disabled={loading}
                                                                    />
                                                                    <span className="input-group-text">%</span>
                                                                </div>
                                                            </td>
                                                        </tr>
                                                        <tr>
                                                            <td>
                                                                <div className="d-flex align-items-center gap-2">
                                                                    <div className="avatar-xs flex-shrink-0">
                                                                        <div className="avatar-title bg-light text-muted rounded-circle fs-13">
                                                                            <i className="ri-bank-line"></i>
                                                                        </div>
                                                                    </div>
                                                                    <div>
                                                                        <span className="fw-semibold text-body fs-13">Banking Relationships</span>
                                                                        <small className="text-muted d-block fs-11">Measures relationship-based approval leverage.</small>
                                                                    </div>
                                                                </div>
                                                            </td>
                                                            <td>
                                                                <div className="input-group input-group-sm">
                                                                    <input
                                                                        type="number"
                                                                        min="0"
                                                                        max="100"
                                                                        className="form-control"
                                                                        name="weight_banking_relationships"
                                                                        value={formData.weight_banking_relationships}
                                                                        onChange={handleInputChange}
                                                                        disabled={loading}
                                                                    />
                                                                    <span className="input-group-text">%</span>
                                                                </div>
                                                            </td>
                                                        </tr>
                                                        <tr className="table-light fw-bold">
                                                            <td>
                                                                <div className="ps-2 fs-13">Total Weight</div>
                                                            </td>
                                                            <td>
                                                                <span className={`fs-13 px-2 py-1 rounded ${totalWeight === 100 ? 'text-success bg-success-subtle' : 'text-danger bg-danger-subtle'}`}>
                                                                    {totalWeight}%
                                                                </span>
                                                            </td>
                                                        </tr>
                                                    </tbody>
                                                </table>
                                            </div>

                                            <div className="mt-3">
                                                <div className="progress rounded-pill mb-2 config-progress">
                                                    <div
                                                        className={`progress-bar progress-bar-striped progress-bar-animated ${getProgressBarColor()}`}
                                                        role="progressbar"
                                                        style={{ width: `${Math.min(totalWeight, 100)}%` }}
                                                        aria-valuenow={totalWeight}
                                                        aria-valuemin={0}
                                                        aria-valuemax={100}
                                                    ></div>
                                                </div>

                                                {totalWeight !== 100 ? (
                                                    <div className="text-danger small d-flex align-items-center gap-1">
                                                        <i className="ri-error-warning-line"></i>
                                                        <span>Weights must sum to exactly 100% (currently {totalWeight}%).</span>
                                                    </div>
                                                ) : (
                                                    <div className="text-success small d-flex align-items-center gap-1">
                                                        <i className="ri-checkbox-circle-line"></i>
                                                        <span>Weight distribution is valid (exactly 100%).</span>
                                                    </div>
                                                )}
                                                {errors.weights_sum && (
                                                    <div className="text-danger small mt-1">
                                                        <i className="ri-error-warning-line me-1"></i>{errors.weights_sum}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Metric subscores config tables section */}
                                    <div className="border-top pt-4 mt-5">
                                        <h5 className="fs-14 fw-semibold text-primary mb-4">
                                            <i className="ri-grid-fill me-2 align-middle"></i>
                                            Subscore Metric Tables
                                        </h5>
                                    </div>

                                    {/* 1. Core Credit Strength Section */}
                                    <div className="border rounded-3 p-4 mb-4 bg-white shadow-sm">
                                        <div className="d-flex align-items-center gap-2 mb-3 border-bottom pb-2">
                                            <span className="badge bg-primary-subtle text-primary fs-12 px-2.5 py-1.5 rounded-pill fw-semibold">1</span>
                                            <div>
                                                <h5 className="fs-14 fw-bold text-dark mb-0">Core Credit Strength</h5>
                                                <p className="text-muted fs-12 mb-0">Configure baseline qualifications for Personal FICO score ranges and Credit Utilization ratios.</p>
                                            </div>
                                        </div>
                                        <div className="row g-4">
                                            {/* FICO Range Subscores */}
                                            <div className="col-lg-6">
                                                <div className="card shadow-none border h-100 mb-0">
                                                    <div className="card-header bg-light-subtle py-2">
                                                        <h6 className="card-title mb-0 fs-13 fw-semibold">FICO Range Subscores</h6>
                                                    </div>
                                                    <div className="card-body p-3">
                                                        <div className="table-responsive">
                                                            <table className="table table-sm table-bordered mb-0 align-middle text-center">
                                                                <thead className="table-light text-uppercase fs-11">
                                                                    <tr>
                                                                        <th className="text-start ps-3">FICO Range</th>
                                                                        <th className="config-th">Subscore</th>
                                                                    </tr>
                                                                </thead>
                                                                <tbody className="fs-13">
                                                                    <tr>
                                                                        <td>
                                                                            <div className="d-flex align-items-center justify-content-start gap-1 ps-3">
                                                                                <input type="number" min="300" max="850" className="form-control form-control-sm text-center px-1 config-input config-input-lg" name="fico_rule_t1" value={formData.fico_rule_t1} onChange={handleInputChange} disabled={loading} />
                                                                                <span className="text-muted fs-11 ms-1">or more</span>
                                                                            </div>
                                                                        </td>
                                                                        <td>
                                                                            <input type="number" min="0" max="100" className="form-control" name="fico_subscore_780_plus" value={formData.fico_subscore_780_plus} onChange={handleInputChange} disabled={loading} />
                                                                        </td>
                                                                    </tr>
                                                                    <tr>
                                                                        <td>
                                                                            <div className="d-flex align-items-center justify-content-start gap-1 ps-3">
                                                                                <input type="number" min="300" max="850" className="form-control form-control-sm text-center px-1 config-input config-input-lg" name="fico_rule_t2" value={formData.fico_rule_t2} onChange={handleInputChange} disabled={loading} />
                                                                                <span className="text-muted fs-11">to</span>
                                                                                <input type="number" className="form-control form-control-sm text-center px-1 config-input config-input-lg" value={(Number(formData.fico_rule_t1) - 1) || 779} disabled />
                                                                            </div>
                                                                        </td>
                                                                        <td>
                                                                            <input type="number" min="0" max="100" className="form-control" name="fico_subscore_760_779" value={formData.fico_subscore_760_779} onChange={handleInputChange} disabled={loading} />
                                                                        </td>
                                                                    </tr>
                                                                    <tr>
                                                                        <td>
                                                                            <div className="d-flex align-items-center justify-content-start gap-1 ps-3">
                                                                                <input type="number" min="300" max="850" className="form-control form-control-sm text-center px-1 config-input config-input-lg" name="fico_rule_t3" value={formData.fico_rule_t3} onChange={handleInputChange} disabled={loading} />
                                                                                <span className="text-muted fs-11">to</span>
                                                                                <input type="number" className="form-control form-control-sm text-center px-1 config-input config-input-lg" value={(Number(formData.fico_rule_t2) - 1) || 759} disabled />
                                                                            </div>
                                                                        </td>
                                                                        <td>
                                                                            <input type="number" min="0" max="100" className="form-control" name="fico_subscore_740_759" value={formData.fico_subscore_740_759} onChange={handleInputChange} disabled={loading} />
                                                                        </td>
                                                                    </tr>
                                                                    <tr>
                                                                        <td>
                                                                            <div className="d-flex align-items-center justify-content-start gap-1 ps-3">
                                                                                <input type="number" min="300" max="850" className="form-control form-control-sm text-center px-1 config-input config-input-lg" name="fico_rule_t4" value={formData.fico_rule_t4} onChange={handleInputChange} disabled={loading} />
                                                                                <span className="text-muted fs-11">to</span>
                                                                                <input type="number" className="form-control form-control-sm text-center px-1 config-input config-input-lg" value={(Number(formData.fico_rule_t3) - 1) || 739} disabled />
                                                                            </div>
                                                                        </td>
                                                                        <td>
                                                                            <input type="number" min="0" max="100" className="form-control" name="fico_subscore_720_739" value={formData.fico_subscore_720_739} onChange={handleInputChange} disabled={loading} />
                                                                        </td>
                                                                    </tr>
                                                                    <tr>
                                                                        <td>
                                                                            <div className="d-flex align-items-center justify-content-start gap-1 ps-3">
                                                                                <input type="number" min="300" max="850" className="form-control form-control-sm text-center px-1 config-input config-input-lg" name="fico_rule_t5" value={formData.fico_rule_t5} onChange={handleInputChange} disabled={loading} />
                                                                                <span className="text-muted fs-11">to</span>
                                                                                <input type="number" className="form-control form-control-sm text-center px-1 config-input config-input-lg" value={(Number(formData.fico_rule_t4) - 1) || 719} disabled />
                                                                            </div>
                                                                        </td>
                                                                        <td>
                                                                            <input type="number" min="0" max="100" className="form-control" name="fico_subscore_700_719" value={formData.fico_subscore_700_719} onChange={handleInputChange} disabled={loading} />
                                                                        </td>
                                                                    </tr>
                                                                    <tr>
                                                                        <td>
                                                                            <div className="d-flex align-items-center justify-content-start gap-1 ps-3">
                                                                                <input type="number" min="300" max="850" className="form-control form-control-sm text-center px-1 config-input config-input-lg" name="fico_rule_t6" value={formData.fico_rule_t6} onChange={handleInputChange} disabled={loading} />
                                                                                <span className="text-muted fs-11">to</span>
                                                                                <input type="number" className="form-control form-control-sm text-center px-1 config-input config-input-lg" value={(Number(formData.fico_rule_t5) - 1) || 699} disabled />
                                                                            </div>
                                                                        </td>
                                                                        <td>
                                                                            <input type="number" min="0" max="100" className="form-control" name="fico_subscore_680_699" value={formData.fico_subscore_680_699} onChange={handleInputChange} disabled={loading} />
                                                                        </td>
                                                                    </tr>
                                                                    <tr>
                                                                        <td>
                                                                            <div className="d-flex align-items-center justify-content-start gap-1 ps-3">
                                                                                <input type="number" min="300" max="850" className="form-control form-control-sm text-center px-1 config-input config-input-lg" name="fico_rule_t7" value={formData.fico_rule_t7} onChange={handleInputChange} disabled={loading} />
                                                                                <span className="text-muted fs-11">to</span>
                                                                                <input type="number" className="form-control form-control-sm text-center px-1 config-input config-input-lg" value={(Number(formData.fico_rule_t6) - 1) || 679} disabled />
                                                                            </div>
                                                                        </td>
                                                                        <td>
                                                                            <input type="number" min="0" max="100" className="form-control" name="fico_subscore_660_679" value={formData.fico_subscore_660_679} onChange={handleInputChange} disabled={loading} />
                                                                        </td>
                                                                    </tr>
                                                                    <tr>
                                                                        <td>
                                                                            <div className="d-flex align-items-center justify-content-start gap-1 ps-3">
                                                                                <input type="number" className="form-control form-control-sm text-center px-1 config-input config-input-lg" value={formData.fico_rule_t7 ? (Number(formData.fico_rule_t7) - 1).toString() : ''} disabled />
                                                                                <span className="text-muted fs-11 ms-1">or less</span>
                                                                            </div>
                                                                        </td>
                                                                        <td>
                                                                            <input type="number" min="0" max="100" className="form-control" name="fico_subscore_below_660" value={formData.fico_subscore_below_660} onChange={handleInputChange} disabled={loading} />
                                                                        </td>
                                                                    </tr>
                                                                </tbody>
                                                            </table>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Utilization Subscores */}
                                            <div className="col-lg-6">
                                                <div className="card shadow-none border h-100 mb-0">
                                                    <div className="card-header bg-light-subtle py-2">
                                                        <h6 className="card-title mb-0 fs-13 fw-semibold">Utilization Subscores</h6>
                                                    </div>
                                                    <div className="card-body p-3">
                                                        <div className="table-responsive">
                                                            <table className="table table-sm table-bordered mb-0 align-middle text-center">
                                                                <thead className="table-light text-uppercase fs-11">
                                                                    <tr>
                                                                        <th className="text-start ps-3">Credit Utilization</th>
                                                                        <th className="config-th">Subscore</th>
                                                                    </tr>
                                                                </thead>
                                                                <tbody className="fs-13">
                                                                    <tr>
                                                                        <td>
                                                                            <div className="d-flex align-items-center justify-content-start gap-1 ps-3">
                                                                                <input type="number" className="form-control form-control-sm text-center px-1 config-input config-input-md" value="0" disabled />
                                                                                <span className="text-muted fs-11">% to</span>
                                                                                <input type="number" min="0" max="100" className="form-control form-control-sm text-center px-1 config-input config-input-md" name="util_rule_t1" value={formData.util_rule_t1} onChange={handleInputChange} disabled={loading} />
                                                                                <span className="text-muted fs-11">%</span>
                                                                            </div>
                                                                        </td>
                                                                        <td>
                                                                            <input type="number" min="0" max="100" className="form-control" name="util_subscore_0_5" value={formData.util_subscore_0_5} onChange={handleInputChange} disabled={loading} />
                                                                        </td>
                                                                    </tr>
                                                                    <tr>
                                                                        <td>
                                                                            <div className="d-flex align-items-center justify-content-start gap-1 ps-3">
                                                                                <input type="number" className="form-control form-control-sm text-center px-1 config-input config-input-md" value={formData.util_rule_t1 ? (Number(formData.util_rule_t1) + 0.01).toFixed(2) : ''} disabled />
                                                                                <span className="text-muted fs-11">% to</span>
                                                                                <input type="number" min="0" max="100" className="form-control form-control-sm text-center px-1 config-input config-input-md" name="util_rule_t2" value={formData.util_rule_t2} onChange={handleInputChange} disabled={loading} />
                                                                                <span className="text-muted fs-11">%</span>
                                                                            </div>
                                                                        </td>
                                                                        <td>
                                                                            <input type="number" min="0" max="100" className="form-control" name="util_subscore_5_10" value={formData.util_subscore_5_10} onChange={handleInputChange} disabled={loading} />
                                                                        </td>
                                                                    </tr>
                                                                    <tr>
                                                                        <td>
                                                                            <div className="d-flex align-items-center justify-content-start gap-1 ps-3">
                                                                                <input type="number" className="form-control form-control-sm text-center px-1 config-input config-input-md" value={formData.util_rule_t2 ? (Number(formData.util_rule_t2) + 0.01).toFixed(2) : ''} disabled />
                                                                                <span className="text-muted fs-11">% to</span>
                                                                                <input type="number" min="0" max="100" className="form-control form-control-sm text-center px-1 config-input config-input-md" name="util_rule_t3" value={formData.util_rule_t3} onChange={handleInputChange} disabled={loading} />
                                                                                <span className="text-muted fs-11">%</span>
                                                                            </div>
                                                                        </td>
                                                                        <td>
                                                                            <input type="number" min="0" max="100" className="form-control" name="util_subscore_10_20" value={formData.util_subscore_10_20} onChange={handleInputChange} disabled={loading} />
                                                                        </td>
                                                                    </tr>
                                                                    <tr>
                                                                        <td>
                                                                            <div className="d-flex align-items-center justify-content-start gap-1 ps-3">
                                                                                <input type="number" className="form-control form-control-sm text-center px-1 config-input config-input-md" value={formData.util_rule_t3 ? (Number(formData.util_rule_t3) + 0.01).toFixed(2) : ''} disabled />
                                                                                <span className="text-muted fs-11">% to</span>
                                                                                <input type="number" min="0" max="100" className="form-control form-control-sm text-center px-1 config-input config-input-md" name="util_rule_t4" value={formData.util_rule_t4} onChange={handleInputChange} disabled={loading} />
                                                                                <span className="text-muted fs-11">%</span>
                                                                            </div>
                                                                        </td>
                                                                        <td>
                                                                            <input type="number" min="0" max="100" className="form-control" name="util_subscore_20_30" value={formData.util_subscore_20_30} onChange={handleInputChange} disabled={loading} />
                                                                        </td>
                                                                    </tr>
                                                                    <tr>
                                                                        <td>
                                                                            <div className="d-flex align-items-center justify-content-start gap-1 ps-3">
                                                                                <input type="number" className="form-control form-control-sm text-center px-1 config-input config-input-md" value={formData.util_rule_t4 ? (Number(formData.util_rule_t4) + 0.01).toFixed(2) : ''} disabled />
                                                                                <span className="text-muted fs-11">% to</span>
                                                                                <input type="number" min="0" max="100" className="form-control form-control-sm text-center px-1 config-input config-input-md" name="util_rule_t5" value={formData.util_rule_t5} onChange={handleInputChange} disabled={loading} />
                                                                                <span className="text-muted fs-11">%</span>
                                                                            </div>
                                                                        </td>
                                                                        <td>
                                                                            <input type="number" min="0" max="100" className="form-control" name="util_subscore_30_40" value={formData.util_subscore_30_40} onChange={handleInputChange} disabled={loading} />
                                                                        </td>
                                                                    </tr>
                                                                    <tr>
                                                                        <td>
                                                                            <div className="d-flex align-items-center justify-content-start gap-1 ps-3">
                                                                                <input type="number" className="form-control form-control-sm text-center px-1 config-input config-input-md" value={formData.util_rule_t5 ? (Number(formData.util_rule_t5) + 0.01).toFixed(2) : ''} disabled />
                                                                                <span className="text-muted fs-11">% to</span>
                                                                                <input type="number" className="form-control form-control-sm text-center px-1 config-input config-input-md" value="100" disabled />
                                                                                <span className="text-muted fs-11">%</span>
                                                                            </div>
                                                                        </td>
                                                                        <td>
                                                                            <input type="number" min="0" max="100" className="form-control" name="util_subscore_above_40" value={formData.util_subscore_above_40} onChange={handleInputChange} disabled={loading} />
                                                                        </td>
                                                                    </tr>
                                                                </tbody>
                                                            </table>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* 2. Financial Capacity Section */}
                                    <div className="border rounded-3 p-4 mb-4 bg-white shadow-sm">
                                        <div className="d-flex align-items-center justify-content-between mb-3 border-bottom pb-2 flex-wrap gap-2">
                                            <div className="d-flex align-items-center gap-2">
                                                <span className="badge bg-primary-subtle text-primary fs-12 px-2.5 py-1.5 rounded-pill fw-semibold">2</span>
                                                <div>
                                                    <h5 className="fs-14 fw-bold text-dark mb-0">Financial Capacity</h5>
                                                    <p className="text-muted fs-12 mb-0">Configure rules and subscores for Revenue / Income Strength.</p>
                                                </div>
                                            </div>

                                        </div>
                                        <div className="row g-4">
                                            <div className="col-12">
                                                <div className="table-responsive border rounded-3">
                                                    <table className="table table-sm table-bordered mb-0 align-middle text-center">
                                                        <thead className="table-light text-uppercase fs-11">
                                                            <tr>
                                                                <th className="text-start ps-3 config-th-quarter">Revenue Category</th>
                                                                <th className="text-start ps-3 config-th-half">Suggested Rule</th>
                                                                <th className="config-th-subscore">Subscore</th>
                                                            </tr>
                                                        </thead>
                                                        <tbody className="fs-13">
                                                            <tr>
                                                                <td className="text-start ps-3">
                                                                    <span className="fw-semibold text-body">Strong</span>
                                                                    <small className="text-muted d-block fs-11">Annual Revenue ≥ $500,000</small>
                                                                </td>
                                                                <td className="text-start ps-3 fw-medium">
                                                                    <span>Annual Revenue ≥ $</span>
                                                                    <input type="number" min="0" className="form-control form-control-xs text-center d-inline-block px-1 config-input config-input-xxl" name="rev_rule_t1" value={formData.rev_rule_t1} onChange={handleInputChange} disabled={loading} />
                                                                </td>
                                                                <td>
                                                                    <input type="number" min="0" max="100" className="form-control form-control-xs text-center mx-auto config-input config-input-xl" name="rev_subscore_strong" value={formData.rev_subscore_strong} onChange={handleInputChange} disabled={loading} />
                                                                </td>
                                                            </tr>
                                                            <tr>
                                                                <td className="text-start ps-3">
                                                                    <span className="fw-semibold text-body">Moderate</span>
                                                                    <small className="text-muted d-block fs-11">Annual Revenue $150,000–$499,999</small>
                                                                </td>
                                                                <td className="text-start ps-3 fw-medium">
                                                                    <span>$</span>
                                                                    <input type="number" min="0" className="form-control form-control-xs text-center d-inline-block px-1 config-input config-input-xxl" name="rev_rule_t2" value={formData.rev_rule_t2} onChange={handleInputChange} disabled={loading} />
                                                                    <span> – $</span>
                                                                    <input type="number" className="form-control form-control-xs text-center d-inline-block px-1 config-input config-input-xxl" value={(Number(formData.rev_rule_t1) - 1) || 499999} disabled />
                                                                    <span> / year</span>
                                                                </td>
                                                                <td>
                                                                    <input type="number" min="0" max="100" className="form-control form-control-xs text-center mx-auto config-input config-input-xl" name="rev_subscore_moderate" value={formData.rev_subscore_moderate} onChange={handleInputChange} disabled={loading} />
                                                                </td>
                                                            </tr>
                                                            <tr>
                                                                <td className="text-start ps-3">
                                                                    <span className="fw-semibold text-body">Limited</span>
                                                                    <small className="text-muted d-block fs-11">Annual Revenue $50,000–$149,999</small>
                                                                </td>
                                                                <td className="text-start ps-3 fw-medium">
                                                                    <span>$</span>
                                                                    <input type="number" min="0" className="form-control form-control-sm text-center d-inline-block px-1 config-input config-input-xxl" name="rev_rule_t3" value={formData.rev_rule_t3} onChange={handleInputChange} disabled={loading} />
                                                                    <span> – $</span>
                                                                    <input type="number" className="form-control form-control-sm text-center d-inline-block px-1 config-input config-input-xxl" value={(Number(formData.rev_rule_t2) - 1) || 149999} disabled />
                                                                    <span> / year</span>
                                                                </td>
                                                                <td>
                                                                    <input type="number" min="0" max="100" className="form-control form-control-sm text-center mx-auto config-input config-input-xl" name="rev_subscore_limited" value={formData.rev_subscore_limited} onChange={handleInputChange} disabled={loading} />
                                                                </td>
                                                            </tr>
                                                            <tr>
                                                                <td className="text-start ps-3">
                                                                    <span className="fw-semibold text-body">Weak</span>
                                                                    <small className="text-muted d-block fs-11">Annual Revenue below $50,000</small>
                                                                </td>
                                                                <td className="text-start ps-3 fw-medium">
                                                                    <span>Annual Revenue below $</span>
                                                                    <input type="number" className="form-control form-control-sm text-center d-inline-block px-1 config-input config-input-xxl" value={(Number(formData.rev_rule_t3) - 1) || 49999} disabled />
                                                                </td>
                                                                <td>
                                                                    <input type="number" min="0" max="100" className="form-control form-control-sm text-center mx-auto config-input config-input-xl" name="rev_subscore_weak" value={formData.rev_subscore_weak} onChange={handleInputChange} disabled={loading} />
                                                                </td>
                                                            </tr>
                                                        </tbody>
                                                    </table>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* 3. Business Maturity & Banking Section */}
                                    <div className="border rounded-3 p-4 mb-4 bg-white shadow-sm">
                                        <div className="d-flex align-items-center gap-2 mb-3 border-bottom pb-2">
                                            <span className="badge bg-primary-subtle text-primary fs-12 px-2.5 py-1.5 rounded-pill fw-semibold">3</span>
                                            <div>
                                                <h5 className="fs-14 fw-bold text-dark mb-0">Business Maturity & Banking</h5>
                                                <p className="text-muted fs-12 mb-0">Configure weights and subscores for Business age and Bank account longevity.</p>
                                            </div>
                                        </div>
                                        <div className="row g-4">
                                            {/* Time in Business Subscores */}
                                            <div className="col-12">
                                                <div className="card shadow-none border mb-0">
                                                    <div className="card-header bg-light-subtle py-2">
                                                        <h6 className="card-title mb-0 fs-13 fw-semibold">Time in Business Subscores</h6>
                                                    </div>
                                                    <div className="card-body p-3">
                                                        <div className="table-responsive">
                                                            <table className="table table-sm table-bordered mb-0 align-middle text-center">
                                                                <thead className="table-light text-uppercase fs-11">
                                                                    <tr>
                                                                        <th className="text-start ps-3">Time in Business</th>
                                                                        <th className="config-th">Subscore</th>
                                                                    </tr>
                                                                </thead>
                                                                <tbody className="fs-13">
                                                                    <tr>
                                                                        <td>
                                                                            <div className="d-flex align-items-center justify-content-start gap-1 ps-3">
                                                                                <input type="number" min="0" className="form-control form-control-sm text-center px-1 config-input config-input-md" name="time_rule_t1" value={formData.time_rule_t1} onChange={handleInputChange} disabled={loading} />
                                                                                <span className="text-muted fs-11 ms-1">or more Months</span>
                                                                                <span className="text-muted fs-11 ms-1">({formData.time_rule_t1 ? Math.round(Number(formData.time_rule_t1) / 12) : 0}+ Years)</span>
                                                                            </div>
                                                                        </td>
                                                                        <td>
                                                                            <input type="number" min="0" max="100" className="form-control" name="time_subscore_36_plus" value={formData.time_subscore_36_plus} onChange={handleInputChange} disabled={loading} />
                                                                        </td>
                                                                    </tr>
                                                                    <tr>
                                                                        <td>
                                                                            <div className="d-flex align-items-center justify-content-start gap-1 ps-3">
                                                                                <input type="number" min="0" className="form-control form-control-sm text-center px-1 config-input config-input-md" name="time_rule_t2" value={formData.time_rule_t2} onChange={handleInputChange} disabled={loading} />
                                                                                <span className="text-muted fs-11">to</span>
                                                                                <span className="fw-semibold text-muted">{(Number(formData.time_rule_t1) - 1) || 35}</span>
                                                                                <span className="text-muted fs-11">Months</span>
                                                                            </div>
                                                                        </td>
                                                                        <td>
                                                                            <input type="number" min="0" max="100" className="form-control" name="time_subscore_24_35" value={formData.time_subscore_24_35} onChange={handleInputChange} disabled={loading} />
                                                                        </td>
                                                                    </tr>
                                                                    <tr>
                                                                        <td>
                                                                            <div className="d-flex align-items-center justify-content-start gap-1 ps-3">
                                                                                <input type="number" min="0" className="form-control form-control-sm text-center px-1 config-input config-input-md" name="time_rule_t3" value={formData.time_rule_t3} onChange={handleInputChange} disabled={loading} />
                                                                                <span className="text-muted fs-11">to</span>
                                                                                <span className="fw-semibold text-muted">{(Number(formData.time_rule_t2) - 1) || 23}</span>
                                                                                <span className="text-muted fs-11">Months</span>
                                                                            </div>
                                                                        </td>
                                                                        <td>
                                                                            <input type="number" min="0" max="100" className="form-control" name="time_subscore_12_23" value={formData.time_subscore_12_23} onChange={handleInputChange} disabled={loading} />
                                                                        </td>
                                                                    </tr>
                                                                    <tr>
                                                                        <td>
                                                                            <div className="d-flex align-items-center justify-content-start gap-1 ps-3">
                                                                                <input type="number" min="0" className="form-control form-control-sm text-center px-1 config-input config-input-md" name="time_rule_t4" value={formData.time_rule_t4} onChange={handleInputChange} disabled={loading} />
                                                                                <span className="text-muted fs-11">to</span>
                                                                                <span className="fw-semibold text-muted">{(Number(formData.time_rule_t3) - 1) || 11}</span>
                                                                                <span className="text-muted fs-11">Months</span>
                                                                            </div>
                                                                        </td>
                                                                        <td>
                                                                            <input type="number" min="0" max="100" className="form-control" name="time_subscore_6_11" value={formData.time_subscore_6_11} onChange={handleInputChange} disabled={loading} />
                                                                        </td>
                                                                    </tr>
                                                                    <tr>
                                                                        <td>
                                                                            <div className="d-flex align-items-center justify-content-start gap-1 ps-3">
                                                                                <span className="fw-semibold text-muted">{(Number(formData.time_rule_t4) - 1) || 5}</span>
                                                                                <span className="text-muted fs-11 ms-1">or less Months</span>
                                                                            </div>
                                                                        </td>
                                                                        <td>
                                                                            <input type="number" min="0" max="100" className="form-control" name="time_subscore_below_6" value={formData.time_subscore_below_6} onChange={handleInputChange} disabled={loading} />
                                                                        </td>
                                                                    </tr>
                                                                </tbody>
                                                            </table>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>

                                             {/* Banking Relationships Subscores */}
                                            <div className="col-12">
                                                <div className="card shadow-none border mb-0">
                                                    <div className="card-header bg-light-subtle py-2">
                                                        <h6 className="card-title mb-0 fs-13 fw-semibold">Banking Relationships Subscores</h6>
                                                    </div>
                                                    <div className="card-body p-3">
                                                        <div className="table-responsive">
                                                            <table className="table table-sm table-bordered mb-0 align-middle text-center">
                                                                <thead className="table-light text-uppercase fs-11">
                                                                    <tr>
                                                                        <th className="text-start ps-3">Relationship Category</th>
                                                                        <th className="config-th-subscore">Subscore</th>
                                                                    </tr>
                                                                </thead>
                                                                 <tbody className="fs-13">
                                                                     <tr>
                                                                         <td className="text-start ps-3 fw-medium text-muted py-2">
                                                                              <div className="d-flex align-items-center flex-wrap gap-1">
                                                                                  <span className="fw-semibold text-primary">≥</span>
                                                                                  <input type="number" className="form-control form-control-sm text-center d-inline-block px-1 config-input config-input-xs" name="bank_rule_strong_years" value={formData.bank_rule_strong_years} onChange={handleInputChange} disabled={loading} />
                                                                                  <span>active business banking relationships, each &gt;</span>
                                                                                  <input type="number" className="form-control form-control-sm text-center d-inline-block px-1 config-input config-input-sm" name="bank_rule_established_months" value={formData.bank_rule_established_months} onChange={handleInputChange} disabled={loading} />
                                                                                  <span>months</span>
                                                                              </div>
                                                                         </td>
                                                                         <td>
                                                                             <input type="number" min="0" max="100" className="form-control form-control-sm text-center mx-auto config-input config-input-xl" name="bank_subscore_strong" value={formData.bank_subscore_strong} onChange={handleInputChange} disabled={loading} />
                                                                         </td>
                                                                     </tr>
                                                                     <tr>
                                                                         <td className="text-start ps-3 fw-medium text-muted py-2">
                                                                             <div className="d-flex align-items-center flex-wrap gap-1">
                                                                                 <span className="fw-semibold text-primary">≥</span>
                                                                                 <input type="number" className="form-control form-control-sm text-center d-inline-block px-1 config-input config-input-xs" name="bank_rule_strong_years" value={formData.bank_rule_strong_years} onChange={handleInputChange} disabled={loading} />
                                                                                 <span>active business banking relationship &gt;</span>
                                                                                 <input type="number" className="form-control form-control-sm text-center d-inline-block px-1 config-input config-input-sm" name="bank_rule_established_months" value={formData.bank_rule_established_months} onChange={handleInputChange} disabled={loading} />
                                                                                 <span>months</span>
                                                                             </div>
                                                                         </td>
                                                                         <td>
                                                                             <input type="number" min="0" max="100" className="form-control form-control-sm text-center mx-auto config-input config-input-xl" name="bank_subscore_established" value={formData.bank_subscore_established} onChange={handleInputChange} disabled={loading} />
                                                                         </td>
                                                                     </tr>
                                                                     <tr>
                                                                         <td className="text-start ps-3 fw-medium text-muted py-2">
                                                                             <div className="d-flex align-items-center flex-wrap gap-1">
                                                                                 <span className="fw-semibold text-primary">≥</span>
                                                                                 <input type="number" className="form-control form-control-sm text-center d-inline-block px-1 config-input config-input-xs" name="bank_rule_strong_years" value={formData.bank_rule_strong_years} onChange={handleInputChange} disabled={loading} />
                                                                                 <span>banking relationship only</span>
                                                                             </div>
                                                                         </td>
                                                                         <td>
                                                                             <input type="number" min="0" max="100" className="form-control form-control-sm text-center mx-auto config-input config-input-xl" name="bank_subscore_basic" value={formData.bank_subscore_basic} onChange={handleInputChange} disabled={loading} />
                                                                         </td>
                                                                     </tr>
                                                                     <tr>
                                                                         <td className="text-start ps-3 fw-medium text-muted py-2">
                                                                             <div className="d-flex align-items-center flex-wrap gap-1">
                                                                                 <span className="fw-semibold text-primary">=</span>
                                                                                 <input type="number" className="form-control form-control-sm text-center d-inline-block px-1 config-input config-input-xs" name="bank_rule_strong_years" value={formData.bank_rule_strong_years} onChange={handleInputChange} disabled={loading} />
                                                                                 <span>No meaningful banking relationship</span>
                                                                             </div>
                                                                         </td>
                                                                         <td>
                                                                             <input type="number" min="0" max="100" className="form-control form-control-sm text-center mx-auto config-input config-input-xl" name="bank_subscore_weak" value={formData.bank_subscore_weak} onChange={handleInputChange} disabled={loading} />
                                                                         </td>
                                                                     </tr>
                                                                 </tbody>
                                                            </table>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* 4. Bureau Depth Section */}
                                    <div className="border rounded-3 p-4 mb-4 bg-white shadow-sm">
                                        <div className="d-flex align-items-center gap-2 mb-3 border-bottom pb-2">
                                            <span className="badge bg-primary-subtle text-primary fs-12 px-2.5 py-1.5 rounded-pill fw-semibold">4</span>
                                            <div>
                                                <h5 className="fs-14 fw-bold text-dark mb-0">Bureau Depth</h5>
                                                <p className="text-muted fs-12 mb-0">Configure criteria for credit history depth, high credit limits, and account counts.</p>
                                            </div>
                                        </div>
                                        <div className="row g-4">
                                            <div className="col-12">
                                                <div className="card shadow-none border mb-0">
                                                    <div className="card-header bg-light-subtle py-2">
                                                        <h6 className="card-title mb-0 fs-13 fw-semibold">Tradeline Depth Subscores</h6>
                                                    </div>
                                                    <div className="card-body p-3">
                                                        <div className="table-responsive">
                                                            <table className="table table-sm table-bordered mb-0 align-middle text-center">
                                                                <thead className="table-light text-uppercase fs-11">
                                                                    <tr>
                                                                        <th className="text-start">Category & Rule</th>
                                                                        <th className="config-th">Subscore</th>
                                                                    </tr>
                                                                </thead>
                                                                <tbody className="fs-13">
                                                                    <tr>
                                                                        <td className="text-start fw-medium">
                                                                            <span className="fw-semibold d-block">Multiple High-Limit & Installment Depth</span>
                                                                            <small className="text-muted d-flex align-items-center flex-wrap gap-1 mt-1">
                                                                                <span className="fw-semibold text-primary">≥</span>
                                                                                <input type="number" className="form-control form-control-sm text-center d-inline-block px-1 config-input config-input-sm" name="trade_rule_multi_accounts" value={formData.trade_rule_multi_accounts} onChange={handleInputChange} disabled={loading} />
                                                                                <span>open accounts</span>
                                                                                <span className="fw-semibold text-primary mx-1">AND</span>
                                                                                <span className="fw-semibold text-primary">≥</span>
                                                                                <input type="number" className="form-control form-control-sm text-center d-inline-block px-1 config-input config-input-sm" name="trade_rule_multi_high_limit_count" value={formData.trade_rule_multi_high_limit_count} onChange={handleInputChange} disabled={loading} />
                                                                                <span>accounts with</span>
                                                                                <span className="fw-semibold text-primary">≥</span>
                                                                                <span>$</span>
                                                                                <input type="number" className="form-control form-control-sm text-center d-inline-block px-1 config-input config-input-lg" name="trade_rule_multi_high_limit_amount" value={formData.trade_rule_multi_high_limit_amount} onChange={handleInputChange} disabled={loading} />
                                                                                <span>limits</span>
                                                                            </small>
                                                                        </td>
                                                                        <td>
                                                                            <input type="number" min="0" max="100" className="form-control" name="trade_subscore_multiple_high" value={formData.trade_subscore_multiple_high} onChange={handleInputChange} disabled={loading} />
                                                                        </td>
                                                                    </tr>
                                                                    <tr>
                                                                        <td className="text-start fw-medium">
                                                                            <span className="fw-semibold d-block">Good Depth with High-Limit account</span>
                                                                            <small className="text-muted d-flex align-items-center flex-wrap gap-1 mt-1">
                                                                                <span className="fw-semibold text-primary">≥</span>
                                                                                <input type="number" className="form-control form-control-sm text-center d-inline-block px-1 config-input config-input-sm" name="trade_rule_good_accounts" value={formData.trade_rule_good_accounts} onChange={handleInputChange} disabled={loading} />
                                                                                <span>open accounts</span>
                                                                                <span className="fw-semibold text-primary mx-1">AND</span>
                                                                                <span className="fw-semibold text-primary">≥</span>
                                                                                <input type="number" className="form-control form-control-sm text-center d-inline-block px-1 config-input config-input-sm" name="trade_rule_good_high_limit_count" value={formData.trade_rule_good_high_limit_count} onChange={handleInputChange} disabled={loading} />
                                                                                <span>account with</span>
                                                                                <span className="fw-semibold text-primary">≥</span>
                                                                                <span>$</span>
                                                                                <input type="number" className="form-control form-control-sm text-center d-inline-block px-1 config-input config-input-lg" name="trade_rule_good_high_limit_amount" value={formData.trade_rule_good_high_limit_amount} onChange={handleInputChange} disabled={loading} />
                                                                                <span>limit</span>
                                                                            </small>
                                                                        </td>
                                                                        <td>
                                                                            <input type="number" min="0" max="100" className="form-control" name="trade_subscore_good_depth" value={formData.trade_subscore_good_depth} onChange={handleInputChange} disabled={loading} />
                                                                        </td>
                                                                    </tr>
                                                                     <tr>
                                                                         <td className="text-start fw-medium">
                                                                             <span className="fw-semibold d-block">Moderate Depth</span>
                                                                             <small className="text-muted d-flex align-items-center flex-wrap gap-1 mt-1">
                                                                                 <span className="fw-semibold text-primary">≥</span>
                                                                                 <input type="number" className="form-control form-control-sm text-center d-inline-block px-1 config-input config-input-xs" name="trade_rule_mod_accounts_min" value={formData.trade_rule_mod_accounts_min} onChange={handleInputChange} disabled={loading} />
                                                                                 <span>open accounts</span>
                                                                             </small>
                                                                         </td>
                                                                         <td>
                                                                             <input type="number" min="0" max="100" className="form-control" name="trade_subscore_moderate" value={formData.trade_subscore_moderate} onChange={handleInputChange} disabled={loading} />
                                                                         </td>
                                                                     </tr>
                                                                     <tr>
                                                                         <td className="text-start fw-medium">
                                                                             <span className="fw-semibold d-block">Thin File</span>
                                                                             <small className="text-muted d-flex align-items-center flex-wrap gap-1 mt-1">
                                                                                 <span>0 - {(Number(formData.trade_rule_mod_accounts_min) - 1) || 1} open accounts </span>
                                                                             </small>
                                                                         </td>
                                                                         <td>
                                                                             <input type="number" min="0" max="100" className="form-control" name="trade_subscore_thin" value={formData.trade_subscore_thin} onChange={handleInputChange} disabled={loading} />
                                                                         </td>
                                                                     </tr>
                                                                </tbody>
                                                            </table>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* 5. Funding Strategy Eligibility Section */}
                                    <div className="border rounded-3 p-4 mb-4 bg-white shadow-sm">
                                        <div className="d-flex align-items-center gap-2 mb-3 border-bottom pb-2">
                                            <span className="badge bg-primary-subtle text-primary fs-12 px-2.5 py-1.5 rounded-pill fw-semibold">5</span>
                                            <div>
                                                <h5 className="fs-14 fw-bold text-dark mb-0">Funding Strategy Eligibility</h5>
                                                <p className="text-muted fs-12 mb-0">Configure minimum FICO score requirements for credit plays and reference readiness score bands.</p>
                                            </div>
                                        </div>
                                        <div className="row g-4">
                                            {/* Play Eligibility FICO Thresholds */}
                                            <div className="col-lg-6">
                                                <div className="card shadow-none border h-100 mb-0">
                                                    <div className="card-header bg-light-subtle py-2">
                                                        <h6 className="card-title mb-0 fs-13 fw-semibold">Play Eligibility FICO Thresholds</h6>
                                                    </div>
                                                    <div className="card-body p-3">
                                                        <div className="table-responsive">
                                                            <table className="table table-sm table-bordered mb-0 align-middle text-center">
                                                                <thead className="table-light text-uppercase fs-11">
                                                                    <tr>
                                                                        <th className="text-start">Credit Play Strategy</th>
                                                                        <th className="config-th">Min FICO</th>
                                                                    </tr>
                                                                </thead>
                                                                <tbody className="fs-13">
                                                                    <tr>
                                                                        <td className="text-start fw-medium">Recovery & Rebuild Play</td>
                                                                        <td>
                                                                            <input type="number" min="300" max="850" className="form-control" name="play_min_fico_recovery" value={formData.play_min_fico_recovery} onChange={handleInputChange} disabled={loading} />
                                                                        </td>
                                                                    </tr>
                                                                    <tr>
                                                                        <td className="text-start fw-medium">Foundation 100 Play</td>
                                                                        <td>
                                                                            <input type="number" min="300" max="850" className="form-control" name="play_min_fico_foundation" value={formData.play_min_fico_foundation} onChange={handleInputChange} disabled={loading} />
                                                                        </td>
                                                                    </tr>
                                                                    <tr>
                                                                        <td className="text-start fw-medium">Startup Launch Play</td>
                                                                        <td>
                                                                            <input type="number" min="300" max="850" className="form-control" name="play_min_fico_startup" value={formData.play_min_fico_startup} onChange={handleInputChange} disabled={loading} />
                                                                        </td>
                                                                    </tr>
                                                                    <tr>
                                                                        <td className="text-start fw-medium">Zero-Cost Capital Play</td>
                                                                        <td>
                                                                            <input type="number" min="300" max="850" className="form-control" name="play_min_fico_zerocost" value={formData.play_min_fico_zerocost} onChange={handleInputChange} disabled={loading} />
                                                                        </td>
                                                                    </tr>
                                                                    <tr>
                                                                        <td className="text-start fw-medium">Relationship Banking Play</td>
                                                                        <td>
                                                                            <input type="number" min="300" max="850" className="form-control" name="play_min_fico_relationship" value={formData.play_min_fico_relationship} onChange={handleInputChange} disabled={loading} />
                                                                        </td>
                                                                    </tr>
                                                                    <tr>
                                                                        <td className="text-start fw-medium">Investor Liquidity Play</td>
                                                                        <td>
                                                                            <input type="number" min="300" max="850" className="form-control" name="play_min_fico_investor" value={formData.play_min_fico_investor} onChange={handleInputChange} disabled={loading} />
                                                                        </td>
                                                                    </tr>
                                                                    <tr>
                                                                        <td className="text-start fw-medium">Executive 250 Play</td>
                                                                        <td>
                                                                            <input type="number" min="300" max="850" className="form-control" name="play_min_fico_executive" value={formData.play_min_fico_executive} onChange={handleInputChange} disabled={loading} />
                                                                        </td>
                                                                    </tr>
                                                                    <tr>
                                                                        <td className="text-start fw-medium">Business Acquisition Play</td>
                                                                        <td>
                                                                            <input type="number" min="300" max="850" className="form-control" name="play_min_fico_acquisition" value={formData.play_min_fico_acquisition} onChange={handleInputChange} disabled={loading} />
                                                                        </td>
                                                                    </tr>
                                                                    <tr>
                                                                        <td className="text-start fw-medium">Elite 500 Play</td>
                                                                        <td>
                                                                            <input type="number" min="300" max="850" className="form-control" name="play_min_fico_elite" value={formData.play_min_fico_elite} onChange={handleInputChange} disabled={loading} />
                                                                        </td>
                                                                    </tr>
                                                                </tbody>
                                                            </table>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Funding Readiness Score Bands (Reference Only) */}
                                            <div className="col-lg-6">
                                                <div className="card shadow-none border h-100 mb-0">
                                                    <div className="card-header bg-light-subtle py-2">
                                                        <h6 className="card-title mb-0 fs-13 fw-semibold">Funding Readiness Score Bands</h6>
                                                    </div>
                                                    <div className="card-body p-3">
                                                        <div className="table-responsive">
                                                            <table className="table table-sm table-bordered mb-0 align-middle fs-13">
                                                                <thead className="table-light text-uppercase fs-11">
                                                                    <tr>
                                                                        <th className="text-start">Ready Score Range</th>
                                                                        <th>Readiness Level Rating</th>
                                                                    </tr>
                                                                </thead>
                                                                <tbody>
                                                                    <tr className="table-success-subtle text-success fw-semibold">
                                                                        <td className="text-start">
                                                                            <div className="d-flex align-items-center gap-1">
                                                                                <input
                                                                                    type="number"
                                                                                    min="0"
                                                                                    max="100"
                                                                                    className="form-control form-control-sm text-center px-1 config-input config-input-lg"
                                                                                    name="readiness_band_t1"
                                                                                    value={formData.readiness_band_t1}
                                                                                    onChange={handleInputChange}
                                                                                    disabled={loading}
                                                                                />
                                                                                <span className="text-muted fs-11">- 100</span>
                                                                            </div>
                                                                        </td>
                                                                        <td>Elite Ready</td>
                                                                    </tr>
                                                                    <tr className="table-success-subtle text-success fw-semibold">
                                                                        <td className="text-start">
                                                                            <div className="d-flex align-items-center gap-1">
                                                                                <input
                                                                                    type="number"
                                                                                    min="0"
                                                                                    max="100"
                                                                                    className="form-control form-control-sm text-center px-1 config-input config-input-lg"
                                                                                    name="readiness_band_t2"
                                                                                    value={formData.readiness_band_t2}
                                                                                    onChange={handleInputChange}
                                                                                    disabled={loading}
                                                                                />
                                                                                <span className="text-muted fs-11">-</span>
                                                                                <input
                                                                                    type="number"
                                                                                    className="form-control form-control-sm text-center px-1 config-input config-input-lg"
                                                                                    value={(Number(formData.readiness_band_t1) - 1) || 89}
                                                                                    disabled
                                                                                />
                                                                            </div>
                                                                        </td>
                                                                        <td>Executive Ready</td>
                                                                    </tr>
                                                                    <tr className="table-info-subtle text-info fw-semibold">
                                                                        <td className="text-start">
                                                                            <div className="d-flex align-items-center gap-1">
                                                                                <input
                                                                                    type="number"
                                                                                    min="0"
                                                                                    max="100"
                                                                                    className="form-control form-control-sm text-center px-1 config-input config-input-lg"
                                                                                    name="readiness_band_t3"
                                                                                    value={formData.readiness_band_t3}
                                                                                    onChange={handleInputChange}
                                                                                    disabled={loading}
                                                                                />
                                                                                <span className="text-muted fs-11">-</span>
                                                                                <input
                                                                                    type="number"
                                                                                    className="form-control form-control-sm text-center px-1 config-input config-input-lg"
                                                                                    value={(Number(formData.readiness_band_t2) - 1) || 79}
                                                                                    disabled
                                                                                />
                                                                            </div>
                                                                        </td>
                                                                        <td>Foundation Ready</td>
                                                                    </tr>
                                                                    <tr className="table-warning-subtle text-warning fw-semibold">
                                                                        <td className="text-start">
                                                                            <div className="d-flex align-items-center gap-1">
                                                                                <input
                                                                                    type="number"
                                                                                    min="0"
                                                                                    max="100"
                                                                                    className="form-control form-control-sm text-center px-1 config-input config-input-lg"
                                                                                    name="readiness_band_t4"
                                                                                    value={formData.readiness_band_t4}
                                                                                    onChange={handleInputChange}
                                                                                    disabled={loading}
                                                                                />
                                                                                <span className="text-muted fs-11">-</span>
                                                                                <input
                                                                                    type="number"
                                                                                    className="form-control form-control-sm text-center px-1 config-input config-input-lg"
                                                                                    value={(Number(formData.readiness_band_t3) - 1) || 69}
                                                                                    disabled
                                                                                />
                                                                            </div>
                                                                        </td>
                                                                        <td>Conditional</td>
                                                                    </tr>
                                                                    <tr className="table-danger-subtle text-danger fw-semibold">
                                                                        <td className="text-start">
                                                                            <div className="d-flex align-items-center gap-1">
                                                                                <input
                                                                                    type="number"
                                                                                    className="form-control form-control-sm text-center px-1 config-input config-input-lg"
                                                                                    value={formData.readiness_band_t4 ? (Number(formData.readiness_band_t4) - 1).toString() : ''}
                                                                                    disabled
                                                                                />
                                                                                <span className="text-muted fs-11 ms-1">or less</span>
                                                                            </div>
                                                                        </td>
                                                                        <td>Not Ready</td>
                                                                    </tr>
                                                                </tbody>
                                                            </table>
                                                        </div>
                                                        <small className="text-muted d-block mt-3 fs-11">
                                                            * Calculations apply weighting rules configured above to determine strategy prioritization and approval probability.
                                                        </small>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* 6. Card Approval Odds Section */}
                                    <div className="border rounded-3 p-4 mb-4 bg-white shadow-sm">
                                        <div className="d-flex align-items-center gap-2 mb-3 border-bottom pb-2">
                                            <span className="badge bg-primary-subtle text-primary fs-12 px-2.5 py-1.5 rounded-pill fw-semibold">6</span>
                                            <div>
                                                <h5 className="fs-14 fw-bold text-dark mb-0">How To Calculate Card Approval Odds</h5>
                                                <p className="text-muted fs-12 mb-0">Use a card scoring model.</p>
                                            </div>
                                        </div>

                                        <div className="row g-4">
                                            <div className="col-lg-6">
                                                <div className="card shadow-none border h-100 mb-0">
                                                    <div className="card-header bg-light-subtle py-2">
                                                        <h6 className="card-title mb-0 fs-13 fw-semibold">Card Score Inputs</h6>
                                                    </div>
                                                    <div className="card-body p-3">
                                                        <div className="table-responsive">
                                                            <table className="table table-sm table-bordered mb-0 align-middle text-center">
                                                                <thead className="table-light text-uppercase fs-11">
                                                                    <tr>
                                                                        <th className="text-start ps-3">Factor</th>
                                                                        <th className="config-th">Weight</th>
                                                                    </tr>
                                                                </thead>
                                                                <tbody className="fs-13">
                                                                    <tr>
                                                                        <td className="text-start ps-3 fw-medium">FICO</td>
                                                                        <td>
                                                                            <div className="input-group input-group-sm">
                                                                                <input
                                                                                    type="number"
                                                                                    min="0"
                                                                                    max="100"
                                                                                    className="form-control"
                                                                                    name="weight_fico_card"
                                                                                    value={formData.weight_fico_card}
                                                                                    onChange={handleInputChange}
                                                                                    disabled={loading}
                                                                                />
                                                                                <span className="input-group-text">%</span>
                                                                            </div>
                                                                        </td>
                                                                    </tr>
                                                                    <tr>
                                                                        <td className="text-start ps-3 fw-medium">Utilization</td>
                                                                        <td>
                                                                            <div className="input-group input-group-sm">
                                                                                <input
                                                                                    type="number"
                                                                                    min="0"
                                                                                    max="100"
                                                                                    className="form-control"
                                                                                    name="weight_utilization_card"
                                                                                    value={formData.weight_utilization_card}
                                                                                    onChange={handleInputChange}
                                                                                    disabled={loading}
                                                                                />
                                                                                <span className="input-group-text">%</span>
                                                                            </div>
                                                                        </td>
                                                                    </tr>
                                                                    <tr>
                                                                        <td className="text-start ps-3 fw-medium">Recent Inquiries</td>
                                                                        <td>
                                                                            <div className="input-group input-group-sm">
                                                                                <input
                                                                                    type="number"
                                                                                    min="0"
                                                                                    max="100"
                                                                                    className="form-control"
                                                                                    name="weight_inquiries_card"
                                                                                    value={formData.weight_inquiries_card}
                                                                                    onChange={handleInputChange}
                                                                                    disabled={loading}
                                                                                />
                                                                                <span className="input-group-text">%</span>
                                                                            </div>
                                                                        </td>
                                                                    </tr>
                                                                    <tr>
                                                                        <td className="text-start ps-3 fw-medium">TIB</td>
                                                                        <td>
                                                                            <div className="input-group input-group-sm">
                                                                                <input
                                                                                    type="number"
                                                                                    min="0"
                                                                                    max="100"
                                                                                    className="form-control"
                                                                                    name="weight_tib_card"
                                                                                    value={formData.weight_tib_card}
                                                                                    onChange={handleInputChange}
                                                                                    disabled={loading}
                                                                                />
                                                                                <span className="input-group-text">%</span>
                                                                            </div>
                                                                        </td>
                                                                    </tr>
                                                                    <tr>
                                                                        <td className="text-start ps-3 fw-medium">Revenue</td>
                                                                        <td>
                                                                            <div className="input-group input-group-sm">
                                                                                <input
                                                                                    type="number"
                                                                                    min="0"
                                                                                    max="100"
                                                                                    className="form-control"
                                                                                    name="weight_revenue_card"
                                                                                    value={formData.weight_revenue_card}
                                                                                    onChange={handleInputChange}
                                                                                    disabled={loading}
                                                                                />
                                                                                <span className="input-group-text">%</span>
                                                                            </div>
                                                                        </td>
                                                                    </tr>
                                                                    <tr className="table-light fw-bold">
                                                                        <td className="text-start ps-3">
                                                                            <span className={cardTotalWeight === 100 ? 'text-success' : 'text-danger'}>
                                                                                Weights sum to 100%
                                                                            </span>
                                                                        </td>
                                                                        <td>
                                                                            <span className={`fs-13 px-2 py-1 rounded ${cardTotalWeight === 100 ? 'text-success bg-success-subtle' : 'text-danger bg-danger-subtle'}`}>
                                                                                {cardTotalWeight}%
                                                                            </span>
                                                                        </td>
                                                                    </tr>
                                                                </tbody>
                                                            </table>
                                                        </div>
                                                        {cardTotalWeight !== 100 && (
                                                            <div className="text-danger small d-flex align-items-center gap-1 mt-2">
                                                                <i className="ri-error-warning-line"></i>
                                                                <span>Weights must sum to exactly 100% (currently {cardTotalWeight}%).</span>
                                                            </div>
                                                        )}
                                                        {errors.card_weights_sum && (
                                                            <div className="text-danger small mt-1">
                                                                <i className="ri-error-warning-line me-1"></i>{errors.card_weights_sum}
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Score → Approval Odds mapping */}
                                            <div className="col-lg-6">
                                                <div className="card shadow-none border h-100 mb-0">
                                                    <div className="card-header bg-light-subtle py-2">
                                                        <h6 className="card-title mb-0 fs-13 fw-semibold">Score → Approval Odds mapping</h6>
                                                    </div>
                                                    <div className="card-body p-3">
                                                        <div className="table-responsive">
                                                            <table className="table table-sm table-bordered mb-0 align-middle text-center">
                                                                <thead className="table-light text-uppercase fs-11">
                                                                    <tr>
                                                                        <th className="text-start ps-3">Score Range</th>
                                                                        <th className="config-th">Odds</th>
                                                                    </tr>
                                                                </thead>
                                                                <tbody className="fs-13">
                                                                    <tr className="table-success-subtle text-success fw-semibold">
                                                                        <td>
                                                                            <div className="d-flex align-items-center justify-content-start gap-1 ps-3">
                                                                                <input
                                                                                    type="number"
                                                                                    min="0"
                                                                                    max="100"
                                                                                    className="form-control form-control-sm text-center px-1 config-input config-input-lg"
                                                                                    name="odds_band_t1"
                                                                                    value={formData.odds_band_t1}
                                                                                    onChange={handleInputChange}
                                                                                    disabled={loading}
                                                                                />
                                                                                <span className="text-muted fs-11 ms-1">or more</span>
                                                                            </div>
                                                                        </td>
                                                                        <td>
                                                                            <div className="input-group input-group-sm">
                                                                                <input
                                                                                    type="number"
                                                                                    min="0"
                                                                                    max="100"
                                                                                    className="form-control"
                                                                                    name="odds_90_plus"
                                                                                    value={formData.odds_90_plus}
                                                                                    onChange={handleInputChange}
                                                                                    disabled={loading}
                                                                                />
                                                                                <span className="input-group-text">%</span>
                                                                            </div>
                                                                        </td>
                                                                    </tr>
                                                                    <tr className="table-success-subtle text-success fw-semibold">
                                                                        <td>
                                                                            <div className="d-flex align-items-center justify-content-start gap-1 ps-3">
                                                                                <input
                                                                                    type="number"
                                                                                    min="0"
                                                                                    max="100"
                                                                                    className="form-control form-control-sm text-center px-1 config-input config-input-lg"
                                                                                    name="odds_band_t2"
                                                                                    value={formData.odds_band_t2}
                                                                                    onChange={handleInputChange}
                                                                                    disabled={loading}
                                                                                />
                                                                                <span className="text-muted fs-11">to</span>
                                                                                <input
                                                                                    type="number"
                                                                                    className="form-control form-control-sm text-center px-1 config-input config-input-lg"
                                                                                    value={(Number(formData.odds_band_t1) - 1) || 89}
                                                                                    disabled
                                                                                />
                                                                            </div>
                                                                        </td>
                                                                        <td>
                                                                            <div className="input-group input-group-sm">
                                                                                <input
                                                                                    type="number"
                                                                                    min="0"
                                                                                    max="100"
                                                                                    className="form-control"
                                                                                    name="odds_80_89"
                                                                                    value={formData.odds_80_89}
                                                                                    onChange={handleInputChange}
                                                                                    disabled={loading}
                                                                                />
                                                                                <span className="input-group-text">%</span>
                                                                            </div>
                                                                        </td>
                                                                    </tr>
                                                                    <tr className="table-info-subtle text-info fw-semibold">
                                                                        <td>
                                                                            <div className="d-flex align-items-center justify-content-start gap-1 ps-3">
                                                                                <input
                                                                                    type="number"
                                                                                    min="0"
                                                                                    max="100"
                                                                                    className="form-control form-control-sm text-center px-1 config-input config-input-lg"
                                                                                    name="odds_band_t3"
                                                                                    value={formData.odds_band_t3}
                                                                                    onChange={handleInputChange}
                                                                                    disabled={loading}
                                                                                />
                                                                                <span className="text-muted fs-11">to</span>
                                                                                <input
                                                                                    type="number"
                                                                                    className="form-control form-control-sm text-center px-1 config-input config-input-lg"
                                                                                    value={(Number(formData.odds_band_t2) - 1) || 79}
                                                                                    disabled
                                                                                />
                                                                            </div>
                                                                        </td>
                                                                        <td>
                                                                            <div className="input-group input-group-sm">
                                                                                <input
                                                                                    type="number"
                                                                                    min="0"
                                                                                    max="100"
                                                                                    className="form-control"
                                                                                    name="odds_70_79"
                                                                                    value={formData.odds_70_79}
                                                                                    onChange={handleInputChange}
                                                                                    disabled={loading}
                                                                                />
                                                                                <span className="input-group-text">%</span>
                                                                            </div>
                                                                        </td>
                                                                    </tr>
                                                                    <tr className="table-warning-subtle text-warning fw-semibold">
                                                                        <td>
                                                                            <div className="d-flex align-items-center justify-content-start gap-1 ps-3">
                                                                                <input
                                                                                    type="number"
                                                                                    min="0"
                                                                                    max="100"
                                                                                    className="form-control form-control-sm text-center px-1 config-input config-input-lg"
                                                                                    name="odds_band_t4"
                                                                                    value={formData.odds_band_t4}
                                                                                    onChange={handleInputChange}
                                                                                    disabled={loading}
                                                                                />
                                                                                <span className="text-muted fs-11">to</span>
                                                                                <input
                                                                                    type="number"
                                                                                    className="form-control form-control-sm text-center px-1 config-input config-input-lg"
                                                                                    value={(Number(formData.odds_band_t3) - 1) || 69}
                                                                                    disabled
                                                                                />
                                                                            </div>
                                                                        </td>
                                                                        <td>
                                                                            <div className="input-group input-group-sm">
                                                                                <input
                                                                                    type="number"
                                                                                    min="0"
                                                                                    max="100"
                                                                                    className="form-control"
                                                                                    name="odds_60_69"
                                                                                    value={formData.odds_60_69}
                                                                                    onChange={handleInputChange}
                                                                                    disabled={loading}
                                                                                />
                                                                                <span className="input-group-text">%</span>
                                                                            </div>
                                                                        </td>
                                                                    </tr>
                                                                    <tr className="table-warning-subtle text-warning fw-semibold">
                                                                        <td>
                                                                            <div className="d-flex align-items-center justify-content-start gap-1 ps-3">
                                                                                <input
                                                                                    type="number"
                                                                                    min="0"
                                                                                    max="100"
                                                                                    className="form-control form-control-sm text-center px-1 config-input config-input-lg"
                                                                                    name="odds_band_t5"
                                                                                    value={formData.odds_band_t5}
                                                                                    onChange={handleInputChange}
                                                                                    disabled={loading}
                                                                                />
                                                                                <span className="text-muted fs-11">to</span>
                                                                                <input
                                                                                    type="number"
                                                                                    className="form-control form-control-sm text-center px-1 config-input config-input-lg"
                                                                                    value={(Number(formData.odds_band_t4) - 1) || 59}
                                                                                    disabled
                                                                                />
                                                                            </div>
                                                                        </td>
                                                                        <td>
                                                                            <div className="input-group input-group-sm">
                                                                                <input
                                                                                    type="number"
                                                                                    min="0"
                                                                                    max="100"
                                                                                    className="form-control"
                                                                                    name="odds_50_59"
                                                                                    value={formData.odds_50_59}
                                                                                    onChange={handleInputChange}
                                                                                    disabled={loading}
                                                                                />
                                                                                <span className="input-group-text">%</span>
                                                                            </div>
                                                                        </td>
                                                                    </tr>
                                                                    <tr className="table-danger-subtle text-danger fw-semibold">
                                                                        <td>
                                                                            <div className="d-flex align-items-center justify-content-start gap-1 ps-3">
                                                                                <input
                                                                                    type="number"
                                                                                    className="form-control form-control-sm text-center px-1 config-input config-input-lg"
                                                                                    value={formData.odds_band_t5 ? (Number(formData.odds_band_t5) - 1).toString() : ''}
                                                                                    disabled
                                                                                />
                                                                                <span className="text-muted fs-11 ms-1">or less</span>
                                                                            </div>
                                                                        </td>
                                                                        <td>
                                                                            <div className="input-group input-group-sm">
                                                                                <input
                                                                                    type="number"
                                                                                    min="0"
                                                                                    max="100"
                                                                                    className="form-control"
                                                                                    name="odds_under_50"
                                                                                    value={formData.odds_under_50}
                                                                                    onChange={handleInputChange}
                                                                                    disabled={loading}
                                                                                />
                                                                                <span className="input-group-text">%</span>
                                                                            </div>
                                                                        </td>
                                                                    </tr>
                                                                </tbody>
                                                            </table>
                                                        </div>
                                                        <small className="text-muted d-block mt-3 fs-11">
                                                            * Compute a weighted score using the configured factors and weights, then map the score to approval odds.
                                                        </small>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
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

            <DynamicActionModal
                show={showModal}
                title="Confirm Parsing Mode Change"
                description={
                    <>
                        You are about to switch the parsing mode to <strong>{pendingMode === 'openai' ? 'OpenAI Data Parsing' : 'Manual Data Parsing'}</strong>.
                    </>
                }
                warningText={pendingMode === 'openai'
                    ? 'OpenAI parsing will send credit report text content to the OpenAI API for processing. This requires a valid API key and will incur usage costs based on your OpenAI billing plan. Ensure your API key is correct before proceeding.'
                    : 'Manual parsing uses built-in regex rules to extract data. It does not require an API key but may be less accurate for non-standard credit report formats.'
                }
                warningBgClass={pendingMode === 'openai'
                    ? 'bg-warning-subtle border-start border-3 border-warning'
                    : 'bg-info-subtle border-start border-3 border-info'
                }
                confirmText={`Yes, Change to ${pendingMode === 'openai' ? 'OpenAI Parsing' : 'Manual Parsing'}`}
                confirmBtnClass="btn-primary"
                onClose={cancelModeChange}
                onConfirm={confirmModeChange}
            />
        </>
    );
};

export default CreditProfileConfigForm;