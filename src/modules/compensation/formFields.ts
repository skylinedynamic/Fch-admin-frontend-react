import {
    PAID_BY_HOURLY, PAID_BY_SALARY, PAID_BY_PER_DEAL,
    APPLICABLE_SERVICE_ALL,
    PAYOUT_TYPE_COMMISSION,
    toServiceFieldKey,
} from '../../config';

import type { CompensationRow } from './types';

type CompensationForm = Record<string, any>;

/**
 * The Commissions tab keeps one flat field per input (see CommissionsSection);
 * the API stores compensation as rows — one for Hourly/Salary, one per
 * applicable service for Per Deal, each with a single `amount`. These two
 * functions are inverses, converting between the two shapes.
 */
export const buildCompensationRows = (employee: CompensationForm): CompensationRow[] => {
    const paidBy = employee.paid_by || '';

    if (paidBy === PAID_BY_HOURLY) {
        return [{ amount: employee.hourly_rate ?? null }];
    }

    if (paidBy === PAID_BY_SALARY) {
        return [{ amount: employee.annual_salary ?? null }];
    }

    if (paidBy !== PAID_BY_PER_DEAL) {
        return [];
    }

    const services: string[] = employee.per_deal_applicable_services || [];

    if (services.includes(APPLICABLE_SERVICE_ALL)) {
        const payoutType = employee.per_deal_payout_type || null;

        return [{
            service: APPLICABLE_SERVICE_ALL,
            payout_type: payoutType,
            amount: (payoutType === PAYOUT_TYPE_COMMISSION ? employee.per_deal_percentage : employee.per_deal_flat_amount) ?? null,
        }];
    }

    // A service with nothing filled in yet still gets a row, so the selection
    // itself survives a save/reload rather than silently disappearing.
    return services.map((service) => {
        const key = toServiceFieldKey(service);
        const payoutType = employee[`per_deal_payout_type_${key}`] || null;
        const amount = payoutType === PAYOUT_TYPE_COMMISSION
            ? employee[`per_deal_percentage_${key}`]
            : employee[`per_deal_flat_amount_${key}`];

        return { service, payout_type: payoutType, amount: amount ?? null };
    });
};

export const compensationRowsToFields = (paidBy: string | null, rows: CompensationRow[] = []): CompensationForm => {
    const fields: CompensationForm = {
        paid_by: paidBy || '',
        hourly_rate: '',
        annual_salary: '',
        per_deal_applicable_services: [],
        per_deal_payout_type: '',
        per_deal_percentage: '',
        per_deal_flat_amount: '',
    };

    if (paidBy === PAID_BY_HOURLY) {
        fields.hourly_rate = rows[0]?.amount ?? '';
        return fields;
    }

    if (paidBy === PAID_BY_SALARY) {
        fields.annual_salary = rows[0]?.amount ?? '';
        return fields;
    }

    if (paidBy !== PAID_BY_PER_DEAL) {
        return fields;
    }

    fields.per_deal_applicable_services = rows.map((row) => row.service).filter(Boolean);

    rows.forEach((row) => {
        const isCommission = row.payout_type === PAYOUT_TYPE_COMMISSION;

        if (row.service === APPLICABLE_SERVICE_ALL) {
            fields.per_deal_payout_type = row.payout_type ?? '';
            fields[isCommission ? 'per_deal_percentage' : 'per_deal_flat_amount'] = row.amount ?? '';
            return;
        }

        const key = toServiceFieldKey(row.service || '');
        fields[`per_deal_payout_type_${key}`] = row.payout_type ?? '';
        fields[`per_deal_${isCommission ? 'percentage' : 'flat_amount'}_${key}`] = row.amount ?? '';
    });

    return fields;
};
