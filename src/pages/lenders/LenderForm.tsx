import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { toast } from 'react-toastify';
import { getLender, createLender, updateLender, getLenderProductCategories, checkLenderDuplicates, deleteLenderUnderwritingRule } from '../../modules/lender/services';
import { Lender, LenderDuplicates } from '../../modules/lender/types';
import { lenderOptionLabel } from '../../modules/lender/displayName';
import { cityOptions, countryOptions, stateOptions, type NameOption } from '../../modules/location/options';
import PageHeader from '../common/PageHeader';
import FormLoader from '../../components/Loader/FormLoader';
import { formatPhoneNumber, parseDate } from '../../utils/formatters';
import { Dropdown } from 'primereact/dropdown';
import { Calendar } from 'primereact/calendar';
import { MultiSelect } from 'primereact/multiselect';
import { LENDER_STATUS } from '../../config/statusOptions';
import { SUBMISSION_METHODS } from '../../config/lender';
import { useSummernote } from '../../hooks/useSummernote';
import LenderProductCategoryModal from './components/LenderProductCategoryModal';
import LenderUnderwritingLogic from './components/LenderUnderwritingLogic';
import { locationData } from '../../modules/location';
import {
    fundingTypeOptions,
    blankRule,
    configuredRows,
    remapUnderwritingErrors,
    rowsForFundingTypes,
    lenderSaveMessage,
    ruleFromApi,
    underwritingErrorIndexes,
    underwritingPayload,
    type UnderwritingRule,
} from '../../modules/lender/underwritingLogic';
import '../../../assets/css/lenders.css';

/**
 * The lender's own fields as sent: empty text as null, without the system-made
 * Lender Code or the Underwriting Logic (sent apart).
 */
const lenderDetailsPayload = (form: Record<string, any>) => {
    const payload: Record<string, any> = { ...form };
    delete payload.lender_code;
    delete payload.underwriting_logic;
    Object.keys(payload).forEach((key) => {
        if (payload[key] === '') payload[key] = null;
    });
    return payload;
};

// Rules store a state by code or name; the selects use names.
const stateName = (state: string) => locationData.USA?.states?.[state]?.name ?? state;

export default function LenderForm() {
    const navigate = useNavigate();
    const { id } = useParams();
    const [searchParams] = useSearchParams();
    const isEditMode = !!id;

    const [loading, setLoading] = useState(false);
    const [initialLoading, setInitialLoading] = useState(isEditMode);
    
    const [categoriesList, setCategoriesList] = useState<any[]>([]);
    // Only categories the API returned are offered. A hardcoded list used to
    // stand in until they loaded, but its values are names where the API
    // requires ids, so picking one early made the save fail.
    const [categoriesLoading, setCategoriesLoading] = useState(true);
    const [showCategoryModal, setShowCategoryModal] = useState(false);

    const initialFormState: any = {
        name: '',
        legal_name: '',
        status: 'Active',
        iso_status: '',
        product_categories: [],
        contact_name: '',
        contact_title: '',
        contact_email: '',
        contact_phone: '',
        website: '',
        submission_method: '',
        submission_email: '',
        submission_portal_link: '',
        internal_notes: '',
        last_verified_date: '',
        // Location, all optional.
        country: '',
        state: '',
        city: '',
        address: ''
    };

    const [formData, setFormData] = useState<Lender>(initialFormState);
    const [errors, setErrors] = useState<any>({});

    // The lender and rules as loaded (Edit), to tell what an Update changed.
    const saved = useRef<{ details: string; rules: Record<string, unknown>[] }>({ details: '', rules: [] });
    // Which row each rule sent with Update is (only rows filled in are sent).
    const sentRowIndexes = useRef<number[]>([]);

    // Edit Lender only: Lender Details | Underwriting Logic (one rule per funding type).
    const [activeTab, setActiveTab] = useState<'details' | 'underwriting'>('details');
    // One row per funding type of the lender, configured or not.
    const [rules, setRules] = useState<UnderwritingRule[]>([]);
    // Underwriting Logic's Funding Types: the rows shown -
    // start with every funding type of the lender. Hiding never deletes.
    const [underwritingFilter, setUnderwritingFilter] = useState<number[]>([]);

    // The rows follow the lender's Funding Types: a new one gets an empty row
    // and is shown at once; one taken off loses its row (its rule is removed
    // on Update). Every funding type is shown by default.
    const shownTypesFor = useRef<number[]>([]);
    useEffect(() => {
        const ids = (formData.product_categories || []).map(Number);
        const before = new Set(shownTypesFor.current);
        shownTypesFor.current = ids;
        setRules((prev) => rowsForFundingTypes(prev, formData.product_categories));
        setUnderwritingFilter((prev) => {
            const current = new Set(ids);
            const kept = prev.filter((id) => current.has(id));
            const added = ids.filter((id) => !before.has(id) && !kept.includes(id));
            return kept.length === prev.length && added.length === 0 ? prev : [...kept, ...added];
        });
    }, [formData.product_categories]);

    // Lenders that already have the name / legal name typed: a warning, not an
    // error - names may repeat; the Lender Code tells lenders apart.
    const [duplicates, setDuplicates] = useState<LenderDuplicates>({ name: [], legal_name: [] });

    const handleChange = (e: any) => {
        const { name, value } = e.target;
        setFormData((prev: any) => ({ ...prev, [name]: value }));
        if (errors[name]) {
            setErrors((prev: any) => ({ ...prev, [name]: null }));
        }
        // The warning was about the old value; it is checked again on leaving the field.
        if (name === 'name' || name === 'legal_name') {
            setDuplicates((prev) => ({ ...prev, [name]: [] }));
        }
    };

    const checkDuplicates = async (field: 'name' | 'legal_name') => {
        const value = String(formData[field] ?? '').trim();
        if (!value) {
            setDuplicates((prev) => ({ ...prev, [field]: [] }));
            return;
        }
        try {
            const found = await checkLenderDuplicates({ [field]: value, ...(isEditMode ? { ignore_id: Number(id) } : {}) });
            setDuplicates((prev) => ({ ...prev, [field]: found[field] }));
        } catch {
            // Only a warning: saving does not depend on it.
        }
    };

    const { editorRef: internalNotesRef } = useSummernote('internal_notes', formData.internal_notes, handleChange);

    /** Loads the lender and its Underwriting Logic (one row per funding type). */
    const loadLender = async () => {
        try {
            const res = await getLender(id!);
            const { underwriting_logic: loadedRules, ...lender } = res.data || {};
            const loadedForm = { ...initialFormState, ...lender };
            const loadedRows = rowsForFundingTypes(
                (loadedRules || []).map((rule: any) => ruleFromApi(rule, stateName)),
                loadedForm.product_categories
            );
            setFormData(loadedForm);
            setRules(loadedRows);
            setUnderwritingFilter((loadedForm.product_categories || []).map(Number));
            // What was loaded, so the toast after Update can say what changed.
            saved.current = { details: JSON.stringify(lenderDetailsPayload(loadedForm)), rules: underwritingPayload(configuredRows(loadedRows).rows) };
        } catch (error) {
            toast.error('Failed to load lender details');
            navigate('/lenders');
        } finally {
            setInitialLoading(false);
        }
    };

    useEffect(() => {
        fetchCategories();
        if (isEditMode) {
            // From Add Lender's Save the same form stays mounted with the new id:
            // show the loader and the tab asked for (?tab=underwriting).
            setInitialLoading(true);
            setErrors({});
            setUnderwritingFilter([]);
            setActiveTab(searchParams.get('tab') === 'underwriting' ? 'underwriting' : 'details');
            loadLender();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [id, isEditMode, navigate]);

    /**
     * A row's delete, after its confirmation: a saved rule is soft-deleted at
     * once (DELETE .../underwriting-logic/{fundingType}); the row stays, empty.
     */
    const deleteUnderwritingRow = async (row: number) => {
        const rule = rules[row];
        if (!rule) return;
        const typeId = rule.lender_product_category_id;
        const name = categoriesList.find((c) => Number(c.id) === Number(typeId))?.name ?? 'this funding type';
        // Saved at once: the rule is soft-deleted and the funding type taken
        // off the lender (DELETE .../underwriting-logic/{fundingType}).
        let savedTypes: number[] | null = null;
        try {
            const res = await deleteLenderUnderwritingRule(id!, typeId);
            savedTypes = (res?.data?.product_categories ?? []).map(Number);
        } catch (error: any) {
            // 404: picked on Lender Details but not saved yet - only taken off the form.
            if (error?.response?.status !== 404) {
                toast.error(error?.response?.data?.message || 'Failed to remove the funding type');
                throw error;
            }
        }

        // The form follows: the funding type leaves Lender Details' Funding
        // Type (its row and Funding Types pick go with it); other unsaved
        // edits stay.
        setFormData((prev: any) => ({
            ...prev,
            product_categories: (prev.product_categories || []).filter((t: any) => Number(t) !== Number(typeId)),
        }));
        setRules((prev) => prev.map((r) => (Number(r.lender_product_category_id) === Number(typeId) ? blankRule(Number(typeId)) : r)));
        setUnderwritingFilter((prev) => prev.filter((t) => t !== Number(typeId)));
        // Rows move up once one goes: the old row numbers' errors no longer fit.
        setErrors((prev: any) => Object.fromEntries(Object.entries(prev).filter(([key]) => !key.startsWith('underwriting_logic.'))));

        // What is saved now, so the next Update's toast compares against it.
        if (savedTypes) {
            const details = saved.current.details ? JSON.parse(saved.current.details) : {};
            saved.current = {
                details: JSON.stringify({ ...details, product_categories: savedTypes }),
                rules: saved.current.rules.filter((r) => Number(r.lender_product_category_id) !== Number(typeId)),
            };
        }
        toast.success(`Funding type "${name}" and its underwriting logic removed successfully`);
    };

    const fetchCategories = async () => {
        try {
            const res = await getLenderProductCategories();
            setCategoriesList(res.data || []);
        } catch (error) {
            console.error('Failed to fetch categories', error);
        } finally {
            setCategoriesLoading(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        setLoading(true);
        try {
            const payload: any = lenderDetailsPayload(formData);
            // Underwriting Logic is saved with the lender: every row filled in
            // (whatever the filter shows); an empty row has none.
            sentRowIndexes.current = configuredRows(rules).indexes;
            const rulesSent = underwritingPayload(configuredRows(rules).rows);
            if (isEditMode) {
                payload.underwriting_logic = rulesSent;
            }

            let createdId: number | string | undefined;
            if (isEditMode) {
                await updateLender(id!, payload);
            } else {
                const created = await createLender(payload);
                createdId = created?.data?.id;
            }
            // Says what was saved: the lender, its Underwriting Logic, or both.
            toast.success(lenderSaveMessage({
                isEdit: isEditMode,
                detailsChanged: JSON.stringify(lenderDetailsPayload(formData)) !== saved.current.details,
                rulesBefore: saved.current.rules,
                rulesAfter: rulesSent,
                fromUnderwriting: activeTab === 'underwriting',
            }));
            if (!isEditMode) {
                // A new lender opens on its Underwriting Logic, to set its rules next.
                navigate(createdId ? `/lenders/${createdId}?tab=underwriting` : '/lenders');
            } else if (activeTab === 'underwriting') {
                // Saved from Underwriting Logic: stay; the reload shows every
                // funding type with logic. The rows stay on screen meanwhile.
                setErrors({});
                await loadLender();
            } else {
                navigate('/lenders');
            }
        } catch (error: any) {
            console.error(error);
            if (error.response?.status === 422) {
                const backendErrors = error.response.data.errors || {};
                const flatErrors: Record<string, string> = {};
                Object.keys(backendErrors).forEach(key => {
                    flatErrors[key] = Array.isArray(backendErrors[key])
                        ? backendErrors[key][0]
                        : backendErrors[key];
                });
                // underwriting_logic.N is the Nth rule sent: shown on its row.
                const mappedErrors = remapUnderwritingErrors(flatErrors, sentRowIndexes.current);
                setErrors(mappedErrors);
                // A refused row is never hidden by the filter.
                const refusedTypes = underwritingErrorIndexes(mappedErrors).map((row) => Number(rules[row]?.lender_product_category_id));
                if (refusedTypes.length > 0) {
                    setUnderwritingFilter((prev) => Array.from(new Set([...prev, ...refusedTypes])));
                }
                // Show the tab the refusal is on.
                const onUnderwriting = underwritingErrorIndexes(mappedErrors).length > 0;
                const onDetails = Object.keys(mappedErrors).some((key) => !key.startsWith('underwriting_logic'));
                if (onDetails) setActiveTab('details');
                else if (onUnderwriting) setActiveTab('underwriting');
            } else {
                toast.error(error.response?.data?.message || 'Failed to save lender');
            }
        } finally {
            setLoading(false);
        }
    };

    /**
     * "Name already used by LND-43012" - one short line naming the lender(s)
     * by Lender Code. A warning only: names may repeat, saving still works.
     */
    const duplicateWarning = (field: 'name' | 'legal_name') => {
        const found = duplicates[field];
        if (found.length === 0) return null;

        const codes = found.map((d) => d.lender_code || lenderOptionLabel(d));

        return (
            <div className="form-text text-warning d-flex align-items-center gap-1" role="status" data-testid={`duplicate-warning-${field}`}>
                <i className="ri-error-warning-line"></i>
                <span>
                    {field === 'name' ? 'Name' : 'Legal name'} already used by{' '}
                    {codes.map((code, i) => (
                        <React.Fragment key={code}>
                            {i > 0 && ', '}
                            <strong>{code}</strong>
                        </React.Fragment>
                    ))}
                </span>
            </div>
        );
    };

    // Country / State / City: a new country clears state and city, a new state clears city.
    const changeLocation = (field: 'country' | 'state' | 'city', value: string | null) => {
        const cleared = field === 'country' ? { state: '', city: '' } : field === 'state' ? { city: '' } : {};
        setFormData((prev: any) => ({ ...prev, [field]: value ?? '', ...cleared }));
        if (errors[field]) {
            setErrors((prev: any) => ({ ...prev, [field]: null }));
        }
    };

    // Two rows of two: Country | State, then City | Address. A state needs its
    // country, a city its state: until then the select looks like the others
    // (a disabled one drew half grey with a broken border) and says, in the
    // box and in its list, what to pick first.
    const renderLocationSelect = (field: 'country' | 'state' | 'city', label: string, placeholder: string, options: NameOption[], pickFirst?: string) => (
        <div className="mb-4 col-md-6">
            <label htmlFor={`lender_${field}`} className="form-label text-dark fw-medium mb-2">{label}</label>
            <Dropdown
                inputId={`lender_${field}`}
                value={formData[field] || null}
                options={options}
                optionLabel="label"
                optionValue="value"
                onChange={(e) => changeLocation(field, e.value)}
                placeholder={options.length === 0 && pickFirst ? pickFirst : placeholder}
                emptyMessage={pickFirst ?? 'No results found'}
                filter
                showClear
                className={`w-100 rounded-3 slim-dropdown ${errors[field] ? 'p-invalid' : ''}`}
                appendTo="self"
            />
            {errors[field] && <div className="invalid-feedback d-block">{errors[field]}</div>}
        </div>
    );

    // Lender Name and Legal Name: each is checked for possible duplicates on leaving it.
    const renderInput = (name: 'name' | 'legal_name', label: string, type = 'text', placeholder = '', col = 'col-md-6', required = false) => {
        return (
            <div className={`mb-4 ${col}`}>
                <label className="form-label text-dark fw-medium mb-2">
                    {label} {required && <span className="text-danger">*</span>}
                </label>
                <input
                    type={type}
                    name={name}
                    className={`form-control rounded-3 py-2 ${errors[name] ? 'is-invalid' : ''}`}
                    value={formData[name] as string || ''}
                    onChange={handleChange}
                    onBlur={() => checkDuplicates(name)}
                    placeholder={placeholder}
                />
                {errors[name] && <div className="invalid-feedback">{errors[name]}</div>}
                {duplicateWarning(name)}
            </div>
        );
    };

    const renderTextarea = (name: keyof Lender, label: string, col = 'col-12', rows = 3) => {
        return (
            <div className={`mb-4 ${col}`}>
                <label className="form-label text-dark fw-medium mb-2">{label}</label>
                <textarea
                    name={name}
                    rows={rows}
                    className={`form-control rounded-3 py-2 ${errors[name] ? 'is-invalid' : ''}`}
                    value={formData[name] as string || ''}
                    onChange={handleChange}
                ></textarea>
                {errors[name] && <div className="invalid-feedback">{errors[name]}</div>}
            </div>
        );
    };

    return (
        <div className="page-content">
            <div className="container-fluid">
                {/* Page Header */}
                <PageHeader 
                    title={isEditMode ? 'Edit Lender' : 'Add Lender'} 
                    breadcrumbs={[
                        { label: 'Lenders', path: '/lenders' },
                        { label: isEditMode ? 'Edit' : 'Add' }
                    ]} 
                >
                    <div className="page-actions d-flex align-items-center gap-2 mt-3 mt-lg-0">
                        <button type="button" className="btn btn-outline-secondary w-lg waves-effect" onClick={() => navigate('/lenders')} disabled={loading}>
                            <i className="ri-arrow-left-line align-middle me-1"></i> Back
                        </button>
                        <button type="button" className="btn btn-primary w-lg waves-effect" onClick={handleSubmit} disabled={loading || initialLoading}>
                            {loading ? (
                                <><span className="spinner-border spinner-border-sm me-1" role="status" aria-hidden="true"></span> {isEditMode ? 'Updating...' : 'Saving...'}</>
                            ) : (
                                <><i className="ri-save-3-line align-middle me-1"></i> {isEditMode ? 'Update' : 'Save'}</>
                            )}
                        </button>
                    </div>
                </PageHeader>

                <div className="row">
                    <div className="col-12 mx-auto">
                        <div className="card shadow-sm">
                            <div className="card-body p-4">
                                {initialLoading ? (
                                    <FormLoader count={6} />
                                ) : (
                                    <form onSubmit={handleSubmit}>
                                        {isEditMode && (
                                            <ul className="nav nav-tabs-custom mb-4 border-bottom" role="tablist">
                                                {([
                                                    ['details', 'Lender Details'],
                                                    ['underwriting', 'Underwriting Logic'],
                                                ] as const).map(([tab, label]) => {
                                                    const hasError = tab === 'underwriting'
                                                        ? underwritingErrorIndexes(errors).length > 0
                                                        : Object.keys(errors).some((key) => errors[key] && !key.startsWith('underwriting_logic'));
                                                    return (
                                                        <li className="nav-item" key={tab} role="presentation">
                                                            <button
                                                                type="button"
                                                                role="tab"
                                                                aria-selected={activeTab === tab}
                                                                className={`nav-link fw-semibold fs-15 pb-3 ${activeTab === tab ? 'active text-primary border-primary border-bottom border-3' : 'text-muted border-transparent'}`}
                                                                onClick={() => setActiveTab(tab)}
                                                                style={{ backgroundColor: 'transparent', borderTop: 'none', borderLeft: 'none', borderRight: 'none' }}
                                                            >
                                                                {label}
                                                                {hasError && <i className="ri-error-warning-fill text-danger ms-1" aria-label="has errors"></i>}
                                                            </button>
                                                        </li>
                                                    );
                                                })}
                                            </ul>
                                        )}

                                        {isEditMode && activeTab === 'underwriting' && (
                                            <div role="tabpanel" aria-label="Underwriting Logic">
                                                <LenderUnderwritingLogic
                                                    fundingTypes={fundingTypeOptions(formData.product_categories, categoriesList)}
                                                    rules={rules}
                                                    onChange={setRules}
                                                    errors={errors}
                                                    filter={underwritingFilter}
                                                    onFilterChange={setUnderwritingFilter}
                                                    onDeleteRule={deleteUnderwritingRow}
                                                />
                                            </div>
                                        )}

                                        {/* Kept mounted while Underwriting Logic shows, so the notes editor keeps its text. */}
                                        <div className={activeTab === 'details' ? '' : 'd-none'}>
                                        <h5 className="mb-3 border-bottom pb-2">Basic Information</h5>
                                        <div className="row">
                                            {renderInput('name', 'Lender Name', 'text', 'Enter lender name', 'col-md-6', true)}
                                            {renderInput('legal_name', 'Legal Name', 'text', 'Enter legal name', 'col-md-6', true)}

                                            <div className="mb-4 col-md-4 taxonomy-field lender-categories-field">
                                                <div className="d-flex justify-content-between align-items-center mb-2">
                                                    <label htmlFor="product_categories" className="form-label text-dark fw-medium mb-0">Funding Type <span className="text-danger">*</span></label>
                                                    <button type="button" className="btn btn-link p-0 text-decoration-none fs-13" onClick={() => setShowCategoryModal(true)}>Add New</button>
                                                </div>
                                                <MultiSelect
                                                    inputId="product_categories"
                                                    value={formData.product_categories || []}
                                                    // Newest first: a funding type just added with Add New is at the top.
                                                    options={[...categoriesList].sort((a, b) => Number(b.id) - Number(a.id)).map(cat => ({ label: cat.name, value: cat.id }))}
                                                    disabled={categoriesLoading}
                                                    onChange={(e) => handleChange({ target: { name: 'product_categories', value: e.value } } as any)}
                                                    optionLabel="label"
                                                    optionValue="value"
                                                    placeholder="Select funding types"
                                                    className={`w-100 rounded-3 ${errors.product_categories ? 'p-invalid' : ''}`}
                                                    panelClassName="taxonomy-field-panel"
                                                    appendTo="self"
                                                    filter
                                                    filterPlaceholder="Search funding types"
                                                    display="chip"
                                                    showSelectAll={false}
                                                    removeIcon="ri-close-line"
                                                    maxSelectedLabels={20}
                                                    emptyFilterMessage="No matching funding type - use Add New to create it"
                                                />
                                                {errors.product_categories
                                                    ? <div className="invalid-feedback d-block">{errors.product_categories}</div>
                                                    : <div className="taxonomy-field__hint">Pick one or more funding types, or create a new one with Add New.</div>}
                                            </div>

                                            <div className="mb-4 col-md-4">
                                                <label className="form-label text-dark fw-medium mb-2">ISO Status</label>
                                                <Dropdown
                                                    inputId="iso_status"
                                                    value={formData.iso_status}
                                                    options={LENDER_STATUS}
                                                    onChange={(e) => handleChange({ target: { name: 'iso_status', value: e.value } } as any)}
                                                    optionLabel="label"
                                                    optionValue="value"
                                                    placeholder="Select ISO Status"
                                                    className={`w-100 rounded-3 slim-dropdown ${errors.iso_status ? 'p-invalid' : ''}`}
                                                    appendTo="self"
                                                />
                                                {errors.iso_status && <div className="invalid-feedback d-block">{errors.iso_status}</div>}
                                            </div>

                                            <div className="mb-4 col-md-4">
                                                <label className="form-label text-dark fw-medium mb-2">Status <span className="text-danger">*</span></label>
                                                <Dropdown
                                                    inputId="status"
                                                    value={formData.status}
                                                    options={LENDER_STATUS}
                                                    onChange={(e) => handleChange({ target: { name: 'status', value: e.value } } as any)}
                                                    optionLabel="label"
                                                    optionValue="value"
                                                    placeholder="Select Status"
                                                    className={`w-100 rounded-3 slim-dropdown ${errors.status ? 'p-invalid' : ''}`}
                                                    appendTo="self"
                                                />
                                                {errors.status && <div className="invalid-feedback d-block">{errors.status}</div>}
                                            </div>
                                        </div>

                                        {/* All optional. Countries, states and cities come from the API
                                            (common/locations); each list follows the one picked before it. */}
                                        <h5 className="mb-3 mt-4 border-bottom pb-2">Location</h5>
                                        <div className="row">
                                            {renderLocationSelect('country', 'Country', 'Select country', countryOptions())}
                                            {renderLocationSelect('state', 'State', 'Select state', stateOptions(formData.country), 'Select a country first')}
                                            {renderLocationSelect('city', 'City', 'Select city', cityOptions(formData.country, formData.state), 'Select a state first')}
                                            <div className="mb-4 col-md-6">
                                                <label htmlFor="lender_address" className="form-label text-dark fw-medium mb-2">Address</label>
                                                <input
                                                    id="lender_address"
                                                    type="text"
                                                    name="address"
                                                    maxLength={500}
                                                    className={`form-control rounded-3 py-2 ${errors.address ? 'is-invalid' : ''}`}
                                                    value={formData.address || ''}
                                                    onChange={handleChange}
                                                    placeholder="Enter street address"
                                                />
                                                {errors.address && <div className="invalid-feedback">{errors.address}</div>}
                                            </div>
                                        </div>

                                        <h5 className="mb-3 mt-4 border-bottom pb-2">Contact Information</h5>
                                        <div className="row">
                                            <div className="mb-4 col-md-6">
                                                <label className="form-label text-dark fw-medium mb-2">Contact Name <span className="text-danger">*</span></label>
                                                <input
                                                    type="text"
                                                    name="contact_name"
                                                    className={`form-control rounded-3 py-2 ${errors.contact_name ? 'is-invalid' : ''}`}
                                                    value={formData.contact_name || ''}
                                                    onChange={handleChange}
                                                    placeholder="Enter contact name"
                                                />
                                                {errors.contact_name && <div className="invalid-feedback">{errors.contact_name}</div>}
                                            </div>
                                            <div className="mb-4 col-md-6">
                                                <label className="form-label text-dark fw-medium mb-2">Contact Title <span className="text-danger">*</span></label>
                                                <input
                                                    type="text"
                                                    name="contact_title"
                                                    className={`form-control rounded-3 py-2 ${errors.contact_title ? 'is-invalid' : ''}`}
                                                    value={formData.contact_title || ''}
                                                    onChange={handleChange}
                                                    placeholder="Enter contact title"
                                                />
                                                {errors.contact_title && <div className="invalid-feedback">{errors.contact_title}</div>}
                                            </div>

                                            <div className="mb-4 col-md-4">
                                                <label className="form-label text-dark fw-medium mb-2">Contact Phone <span className="text-danger">*</span></label>
                                                <div className="input-group">
                                                    <span className="input-group-text bg-light border">
                                                        <span className="text-muted">+1</span>
                                                    </span>
                                                    <input
                                                        type="text"
                                                        name="contact_phone"
                                                        className={`form-control rounded-3 py-2 ${errors.contact_phone ? 'is-invalid' : ''}`}
                                                        value={formData.contact_phone || ''}
                                                        onChange={(e) => {
                                                            const formatted = formatPhoneNumber(e.target.value);
                                                            handleChange({ target: { name: 'contact_phone', value: formatted } } as any);
                                                        }}
                                                        placeholder="(xxx) xxx-xxxx"
                                                    />
                                                    {errors.contact_phone && <div className="invalid-feedback">{errors.contact_phone}</div>}
                                                </div>
                                            </div>
                                            <div className="mb-4 col-md-4">
                                                <label className="form-label text-dark fw-medium mb-2">Contact Email <span className="text-danger">*</span></label>
                                                <input
                                                    type="email"
                                                    name="contact_email"
                                                    className={`form-control rounded-3 py-2 ${errors.contact_email ? 'is-invalid' : ''}`}
                                                    value={formData.contact_email || ''}
                                                    onChange={handleChange}
                                                    placeholder="Enter email address"
                                                />
                                                {errors.contact_email && <div className="invalid-feedback">{errors.contact_email}</div>}
                                            </div>
                                            <div className="mb-4 col-md-4">
                                                <label className="form-label text-dark fw-medium mb-2">Website</label>
                                                <input
                                                    type="text"
                                                    name="website"
                                                    className={`form-control rounded-3 py-2 ${errors.website ? 'is-invalid' : ''}`}
                                                    value={formData.website || ''}
                                                    onChange={handleChange}
                                                    placeholder="https://..."
                                                />
                                                {errors.website && <div className="invalid-feedback">{errors.website}</div>}
                                            </div>
                                        </div>

                                        <h5 className="mb-3 mt-4 border-bottom pb-2">Submission Details</h5>
                                        <div className="row">
                                            <div className="mb-4 col-md-6">
                                                <label className="form-label text-dark fw-medium mb-2">Submission Method</label>
                                                <Dropdown
                                                    inputId="submission_method"
                                                    value={formData.submission_method}
                                                    options={SUBMISSION_METHODS}
                                                    onChange={(e) => handleChange({ target: { name: 'submission_method', value: e.value } } as any)}
                                                    optionLabel="label"
                                                    optionValue="value"
                                                    placeholder="Select Method"
                                                    className={`w-100 ${errors.submission_method ? 'p-invalid' : ''}`}
                                                    appendTo="self"
                                                />
                                                {errors.submission_method && <small className="p-error">{errors.submission_method}</small>}
                                            </div>
                                            <div className="mb-4 col-md-6">
                                                <label className="form-label text-dark fw-medium mb-2">Submission Email</label>
                                                <input
                                                    type="email"
                                                    name="submission_email"
                                                    className={`form-control rounded-3 py-2 ${errors.submission_email ? 'is-invalid' : ''}`}
                                                    value={formData.submission_email || ''}
                                                    onChange={handleChange}
                                                    placeholder="Enter submission email"
                                                />
                                                {errors.submission_email && <div className="invalid-feedback">{errors.submission_email}</div>}
                                            </div>

                                            <div className="mb-4 col-md-6">
                                                <label className="form-label text-dark fw-medium mb-2">Submission Portal URL</label>
                                                <input
                                                    type="url"
                                                    name="submission_portal_link"
                                                    className={`form-control rounded-3 py-2 ${errors.submission_portal_link ? 'is-invalid' : ''}`}
                                                    value={formData.submission_portal_link || ''}
                                                    onChange={handleChange}
                                                    placeholder="https://..."
                                                />
                                                {errors.submission_portal_link && <div className="invalid-feedback">{errors.submission_portal_link}</div>}
                                            </div>

                                            <div className="mb-4 col-md-6">
                                                <label className="form-label text-dark fw-medium mb-2">Last Verified Date</label>
                                                <div className="custom-datepicker">
                                                    <Calendar
                                                        id="last_verified_date"
                                                        value={formData.last_verified_date ? parseDate(formData.last_verified_date) : null}
                                                        onChange={(e) => {
                                                            const date = e.value as Date;
                                                            const dateString = date
                                                                ? `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`
                                                                : "";
                                                            handleChange({ target: { name: 'last_verified_date', value: dateString } } as any);
                                                        }}
                                                        dateFormat="dd M, yy"
                                                        placeholder="Select date"
                                                        showIcon
                                                        className={`w-100 ${errors.last_verified_date ? 'p-invalid' : ''}`}
                                                        appendTo="self"
                                                        readOnlyInput
                                                        maxDate={new Date()}
                                                    />
                                                </div>
                                                {errors.last_verified_date && <div className="invalid-feedback d-block">{errors.last_verified_date}</div>}
                                            </div>

                                            <div className="mb-4 col-md-12">
                                                <label className="form-label text-dark fw-medium mb-2">Internal Notes</label>
                                                <div className={errors.internal_notes ? 'summernote-error-wrapper' : ''}>
                                                    <textarea ref={internalNotesRef}></textarea>
                                                </div>
                                                {errors.internal_notes && <div className="invalid-feedback d-block">{errors.internal_notes}</div>}
                                            </div>
                                        </div>
                                        </div>
                                    </form>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Product Category Modal */}
            <LenderProductCategoryModal
                visible={showCategoryModal}
                onHide={() => setShowCategoryModal(false)}
                onSuccess={() => fetchCategories()}
                categories={categoriesList}
            />
        </div>
    );
}
