import React, { useMemo, useState } from 'react';
import { Dropdown } from 'primereact/dropdown';
import { MultiSelect } from 'primereact/multiselect';
import { TIB_OPTIONS, INDUSTRIES_OPTIONS } from '../../../config/funding';
import { locationData } from '../../../modules/location';
import { optionsWithout } from '../../../modules/funding/visibilityRules';
import { filterRows, isRuleBlank, type UnderwritingRule } from '../../../modules/lender/underwritingLogic';
import DeleteConfirmationModal from '../../../components/Common/Modals/DeleteConfirmationModal';

/**
 * Edit Lender > Underwriting Logic (moved here from Funding Sequence).
 *
 * Two sections:
 *  1. A full-width filter bar: "Funding Types" picks which rows show (all when
 *     none is picked; two chips, then "+N more"). It only filters - taking a
 *     funding type out of it never removes that funding type's rule.
 *  2. The grid: one row per funding type of the lender, configured or not.
 *
 * A row's delete asks first, then removes that rule at once (soft delete).
 * Every funding sequence of a funding type uses this lender's row for it.
 * Saved with the lender by Update.
 */
interface Props {
    /** The lender's funding types, as picked on Lender Details. */
    fundingTypes: { label: string; value: number }[];
    /** One row per funding type of the lender. */
    rules: UnderwritingRule[];
    onChange: (rules: UnderwritingRule[]) => void;
    errors: Record<string, any>;
    /** Funding types shown: those with logic, plus any picked to add theirs. */
    filter: number[];
    onFilterChange: (filter: number[]) => void;
    /** Removes a row's rule (after the confirmation); rejects when it could not. */
    onDeleteRule: (row: number) => Promise<void>;
}

/** Chips shown in the filter before "+N more". */
const CHIPS_SHOWN = 2;

// locationData is filled from the API after import: read it only when rendering.
const stateOptions = () =>
    Object.values(locationData.USA?.states ?? {}).map((state: any) => ({ label: state.name, value: state.name }));

type Field = { field: keyof UnderwritingRule; label: string; required?: boolean; prefix?: string; suffix?: string; placeholder: string; step?: string; width: number };

const SCORE_FIELDS: Field[] = [
    { field: 'min_fico', label: 'Min FICO', required: true, placeholder: '640', width: 120 },
    { field: 'min_business_credit_score', label: 'Min Business Credit', placeholder: '80', width: 150 },
];
const MONEY_FIELDS: Field[] = [
    { field: 'min_monthly_revenue', label: 'Min Monthly Revenue', required: true, prefix: '$', placeholder: '12,000', width: 180 },
    { field: 'min_monthly_deposits', label: 'Min Monthly Deposits', required: true, prefix: '$', placeholder: '12,000', width: 180 },
    { field: 'min_deposit_count', label: 'Min Deposit Count', placeholder: '100', width: 140 },
    { field: 'min_average_daily_balance', label: 'Min Avg Daily Balance', prefix: '$', placeholder: '4,000', width: 180 },
    { field: 'max_nsf_count', label: 'Max NSF', placeholder: '4', width: 110 },
    { field: 'max_negative_days', label: 'Max Negative Days', placeholder: '4', width: 140 },
    { field: 'min_dscr', label: 'Min DSCR', placeholder: '1.25', step: '0.01', width: 110 },
];
const LIST_FIELDS: { field: 'allowed_states' | 'restricted_states' | 'allowed_industries' | 'restricted_industries'; label: string }[] = [
    { field: 'allowed_states', label: 'Allowed States' },
    { field: 'restricted_states', label: 'Restricted States' },
    { field: 'allowed_industries', label: 'Allow Only Listed Industries' },
    { field: 'restricted_industries', label: 'Restricted Industries' },
];

// Sticky first and last columns: a solid background, so scrolled columns never show through.
// Above Bootstrap's input-group layers (z-index up to 5 when focused), so a
// scrolled input never draws over the pinned Funding Type or Action column.
const stickyCell: React.CSSProperties = { position: 'sticky', zIndex: 6 };
const stickyHead: React.CSSProperties = { ...stickyCell, zIndex: 7, backgroundColor: '#f3f6f9' };
const stickyBody = (_error: boolean): React.CSSProperties => stickyCell;

export default function LenderUnderwritingLogic({ fundingTypes, rules, onChange, errors, filter, onFilterChange, onDeleteRule }: Props) {
    const states = useMemo(stateOptions, [locationData.USA]);
    const [confirmRow, setConfirmRow] = useState<number | null>(null);
    const [deleting, setDeleting] = useState(false);

    const error = (row: number, field: string) => errors[`underwriting_logic.${row}.${field}`];
    const renderError = (row: number, field: string) =>
        error(row, field) ? <div className="text-danger mt-1 fs-12 text-wrap" style={{ maxWidth: 220 }}>{error(row, field)}</div> : null;
    const rowHasError = (row: number) => Object.keys(errors).some((key) => key.startsWith(`underwriting_logic.${row}.`) && errors[key]);

    const setField = (row: number, field: keyof UnderwritingRule, value: any) =>
        onChange(rules.map((rule, i) => (i === row ? { ...rule, [field]: value } : rule)));

    const nameOf = (id: number) => fundingTypes.find((t) => t.value === Number(id))?.label ?? `Funding type #${id}`;

    const shown = filterRows(rules, filter);

    const confirmDelete = async () => {
        if (confirmRow === null) return;
        setDeleting(true);
        try {
            await onDeleteRule(confirmRow);
            setConfirmRow(null);
        } catch {
            // The page says why; the modal stays open to try again or cancel.
        } finally {
            setDeleting(false);
        }
    };

    // Filter: two chips, then "+N more" (all names in its tooltip). A chip's ×
    // only takes the funding type out of the filter.
    const filterChip = (value?: number) => {
        if (value === undefined) return <span className="text-muted">Select funding types</span>;
        const index = filter.indexOf(value);
        if (index === CHIPS_SHOWN) {
            const rest = filter.slice(CHIPS_SHOWN).map(nameOf);
            return (
                <span className="underwriting-filter__more badge rounded-pill bg-primary-subtle text-primary fw-semibold" title={rest.join(', ')} data-testid="underwriting-filter-more">
                    +{rest.length} more
                </span>
            );
        }
        if (index > CHIPS_SHOWN) return null;
        return (
            <span className="p-multiselect-token me-1">
                <span className="p-multiselect-token-label">{nameOf(value)}</span>
                <i
                    className="ri-close-line p-multiselect-token-icon"
                    role="button"
                    aria-label={`Stop filtering by ${nameOf(value)}`}
                    onClick={(e) => { e.stopPropagation(); onFilterChange(filter.filter((v) => v !== value)); }}
                />
            </span>
        );
    };

    const numberCell = (row: number, rule: UnderwritingRule, { field, prefix, placeholder, step, width }: Field) => {
        const input = (
            <input
                type="number"
                step={step}
                min={0}
                aria-label={`${nameOf(rule.lender_product_category_id)} ${String(field)}`}
                className={`form-control form-control-sm shadow-none ${error(row, field) ? 'is-invalid' : ''}`}
                placeholder={placeholder}
                value={(rule[field] as any) ?? ''}
                onChange={(e) => setField(row, field, e.target.value)}
            />
        );
        return (
            <td key={String(field)} style={{ minWidth: width }}>
                {prefix ? (
                    <div className="input-group input-group-sm flex-nowrap">
                        <span className={`input-group-text bg-light ${error(row, field) ? 'text-danger border-danger' : 'text-muted'}`}>{prefix}</span>
                        {input}
                    </div>
                ) : input}
                {renderError(row, field)}
            </td>
        );
    };

    const listCell = (row: number, rule: UnderwritingRule, field: (typeof LIST_FIELDS)[number]['field']) => {
        const isState = field.endsWith('_states');
        const other = { allowed_states: 'restricted_states', restricted_states: 'allowed_states', allowed_industries: 'restricted_industries', restricted_industries: 'allowed_industries' }[field] as keyof UnderwritingRule;
        return (
            <td key={field} style={{ minWidth: 210 }}>
                <MultiSelect
                    value={rule[field]}
                    // A state or industry cannot be both allowed and restricted (R2 BUG-010).
                    options={optionsWithout(isState ? states : INDUSTRIES_OPTIONS, rule[other] as string[])}
                    onChange={(e) => setField(row, field, e.value)}
                    optionLabel="label"
                    optionValue="value"
                    placeholder={field.startsWith('allowed') ? (isState ? 'All states' : 'All industries') : 'None'}
                    filter
                    maxSelectedLabels={1}
                    selectedItemsLabel={isState ? '{0} states' : '{0} industries'}
                    panelStyle={{ maxWidth: '350px' }}
                    className={`w-100 slim-multiselect rounded-2 shadow-none ${error(row, field) ? 'p-invalid border-danger' : ''}`}
                />
                {renderError(row, field)}
            </td>
        );
    };

    if (fundingTypes.length === 0) {
        return (
            <div className="text-center py-5 border border-dashed underwriting-section bg-light" data-testid="underwriting-no-funding-types">
                <i className="ri-shield-check-line fs-1 text-muted d-block mb-2"></i>
                <h6 className="fw-semibold text-dark mb-1">No funding types yet</h6>
                <p className="text-muted fs-13 mb-0">Pick this lender's Funding Type on Lender Details first - each one can then have its underwriting logic here.</p>
            </div>
        );
    }

    return (
        <div className="lender-underwriting">
            {/* ── Section 1: filter ───────────────────────────────────────── */}
            <div className="border underwriting-section bg-light-subtle px-3 py-3 mb-3" data-testid="underwriting-filter-bar">
                <div className="d-flex flex-wrap align-items-center gap-3">
                    <label htmlFor="underwriting_funding_types" className="form-label text-dark fw-semibold mb-0 text-nowrap">
                        <i className="ri-filter-3-line me-1 text-primary"></i> Funding Types
                    </label>
                    <div className="flex-grow-1 taxonomy-field underwriting-filter" style={{ minWidth: 260 }}>
                        <MultiSelect
                            inputId="underwriting_funding_types"
                            value={filter}
                            options={fundingTypes}
                            onChange={(e) => onFilterChange(e.value || [])}
                            optionLabel="label"
                            optionValue="value"
                            placeholder="Select funding types"
                            selectedItemTemplate={filterChip}
                            className="w-100 rounded-3 bg-white"
                            panelClassName="taxonomy-field-panel"
                            filter
                            filterPlaceholder="Search funding types"
                            showSelectAll={fundingTypes.length > 1}
                            emptyFilterMessage="No matching funding type"
                        />
                    </div>
                    <div className="d-flex align-items-center gap-2 text-nowrap">
                        {filter.length < fundingTypes.length && (
                            <button type="button" className="btn btn-link btn-sm text-decoration-none p-0 ms-1" onClick={() => onFilterChange(fundingTypes.map((t) => t.value))}>
                                Show all
                            </button>
                        )}
                    </div>
                </div>
                <div className="text-muted fs-12 mt-2">
                    Every funding type of this lender is shown - its logic is used by every funding sequence of that funding type. An empty row has no logic yet. Taking a type out here only hides it; the row's delete removes the funding type from the lender, with its logic.
                </div>
            </div>

            {/* ── Section 2: grid ─────────────────────────────────────────── */}
            {shown.length === 0 ? (
                <div className="text-center py-5 border border-dashed underwriting-section" data-testid="underwriting-empty">
                    <i className="ri-shield-check-line fs-1 text-muted d-block mb-2"></i>
                    <h6 className="fw-semibold text-dark mb-1">No underwriting logic shown</h6>
                    <p className="text-muted fs-13 mb-0">Select a funding type above to add or edit its underwriting logic.</p>
                </div>
            ) : (
                <div className="border underwriting-section table-responsive custom-scrollbar-wrapper">
                    <table className="table align-middle mb-0 underwriting-grid" style={{ minWidth: 'max-content' }}>
                        <thead className="table-light text-muted fs-12 text-uppercase" style={{ letterSpacing: '0.03em' }}>
                            <tr>
                                <th className="ps-3" style={{ ...stickyHead, left: 0, minWidth: 220, boxShadow: '1px 0 0 #e9ebec' }}>Funding Type</th>
                                {SCORE_FIELDS.map((f) => <th key={String(f.field)}>{f.label} {f.required && <span className="text-danger">*</span>}</th>)}
                                <th style={{ minWidth: 160 }}>Min Time In Business <span className="text-danger">*</span></th>
                                {MONEY_FIELDS.map((f) => <th key={String(f.field)}>{f.label} {f.required && <span className="text-danger">*</span>}</th>)}
                                {LIST_FIELDS.map((f) => <th key={f.field}>{f.label}</th>)}
                                <th className="text-center" style={{ ...stickyHead, right: 0, minWidth: 80, boxShadow: '-1px 0 0 #e9ebec' }}>Action</th>
                            </tr>
                        </thead>
                        <tbody className="fs-13">
                            {shown.map(({ row: rule, index: row }) => {
                                const blank = isRuleBlank(rule);
                                const name = nameOf(rule.lender_product_category_id);
                                return (
                                    <tr
                                        key={rule.lender_product_category_id}
                                        className={rowHasError(row) ? 'table-danger' : ''}
                                        data-testid={`underwriting-row-${rule.lender_product_category_id}`}
                                    >
                                        <td className="ps-3" style={{ ...stickyBody(rowHasError(row)), left: 0, boxShadow: '1px 0 0 #e9ebec' }}>
                                            <div className="fw-semibold text-dark">{name}</div>
                                            {blank ? (
                                                <span className="badge bg-secondary-subtle text-secondary fs-11 mt-1">Not set</span>
                                            ) : (
                                                <span className="badge bg-success-subtle text-success fs-11 mt-1">
                                                    <i className="ri-checkbox-circle-line me-1"></i>{rule.id ? 'Configured' : 'Unsaved'}
                                                </span>
                                            )}
                                            {renderError(row, 'lender_product_category_id')}
                                        </td>
                                        {SCORE_FIELDS.map((f) => numberCell(row, rule, f))}
                                        <td style={{ minWidth: 160 }}>
                                            <Dropdown
                                                value={rule.min_tib_months === '' || rule.min_tib_months === null ? null : Number(rule.min_tib_months)}
                                                options={TIB_OPTIONS}
                                                onChange={(e) => setField(row, 'min_tib_months', e.value)}
                                                optionLabel="label"
                                                optionValue="value"
                                                placeholder="Select"
                                                className={`w-100 slim-dropdown rounded-2 shadow-none ${error(row, 'min_tib_months') ? 'p-invalid border-danger' : ''}`}
                                            />
                                            {renderError(row, 'min_tib_months')}
                                        </td>
                                        {MONEY_FIELDS.map((f) => numberCell(row, rule, f))}
                                        {LIST_FIELDS.map((f) => listCell(row, rule, f.field))}
                                        <td className="text-center" style={{ ...stickyBody(rowHasError(row)), right: 0, boxShadow: '-1px 0 0 #e9ebec' }}>
                                            <button
                                                type="button"
                                                className="btn btn-sm btn-soft-danger rounded-circle d-inline-flex align-items-center justify-content-center p-0"
                                                style={{ width: 32, height: 32 }}
                                                onClick={() => setConfirmRow(row)}
                                                title={`Delete ${name} underwriting logic`}
                                                aria-label={`Remove ${name}`}
                                            >
                                                <i className="ri-delete-bin-line fs-14"></i>
                                            </button>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            )}

            <DeleteConfirmationModal
                show={confirmRow !== null}
                loading={deleting}
                title="Remove this funding type?"
                text={confirmRow === null || !rules[confirmRow]
                    ? ''
                    : `"${nameOf(rules[confirmRow].lender_product_category_id)}" will be removed from this lender's Funding Types now, with its underwriting logic. Funding sequences of this funding type will no longer show this lender.`}
                onConfirm={confirmDelete}
                onClose={() => setConfirmRow(null)}
            />
        </div>
    );
}
