import React, { useState, useEffect } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { Dropdown } from 'primereact/dropdown';
import { toast } from 'react-toastify';
import FormLoader from '../../../components/Loader/FormLoader';
import { CreditAccount } from '../../../modules/credit-accounts/services';
import {
    useCapitalAccount,
    useAllCreditAccountsForBuilder,
    useCreateCapitalAccount,
    useUpdateCapitalAccount
} from '../../../modules/capital-access/queries';
import { StoreCapitalAccessPayload } from '../../../modules/capital-access/services';
import EditStepDetailsModal, { EditDetailsForm } from './EditStepDetailsModal';
import { usePermissions } from '../../../lib/auth/usePermissions';
import { STATUS_OPTIONS, STATUS_ACTIVE } from '../../../config/creditBuilder';
import { buildStorageUrl } from '../../../utils/imageHelpers';

const PRE_FLIGHT_TASKS = [
    "Business Information",
    "EIN Verified",
    "Personal Credit Pulled",
    "Business Bank Account",
    "Identity Verified",
    "No Recent Derogatories"
];

export interface SelectedPlayCard extends CreditAccount {
    play_details?: {
        why_this_card: string;
        est_limit_min: string;
        est_limit_max: string;
        est_limit_for_show?: string;
        hard_pull: string;
        what_you_need: string[];
        access_time: string;
        access_day: string;
        access_day_time: string;
    }
}

export default function CapitalAccessForm() {
    const { hasPermission } = usePermissions();
    const navigate = useNavigate();
    const { id } = useParams<{ id: string }>();
    const isEditMode = !!id;

    const [loading, setLoading] = useState<boolean>(false);
    const [selectedAccounts, setSelectedAccounts] = useState<SelectedPlayCard[]>([]);
    const [searchTerm, setSearchTerm] = useState<string>('');
    const [dragOverList, setDragOverList] = useState<boolean>(false);
    const [draggingIndex, setDraggingIndex] = useState<number | null>(null);

    // Modal State
    const [isDetailsModalOpen, setIsDetailsModalOpen] = useState<boolean>(false);
    const [editingCardId, setEditingCardId] = useState<number | null>(null);
    const [pendingAddCard, setPendingAddCard] = useState<SelectedPlayCard | null>(null);
    const [modalValidationErrors, setModalValidationErrors] = useState<Record<string, string>>({});
    const [editDetailsForm, setEditDetailsForm] = useState<{
        why_this_card: string;
        est_limit_min: string;
        est_limit_max: string;
        hard_pull: string;
        what_you_need: string[];
        access_time: string;
        access_day: string;
        access_day_time: string;
    }>({
        why_this_card: '',
        est_limit_min: '',
        est_limit_max: '',
        hard_pull: 'Yes',
        what_you_need: [],
        access_time: 'Morning',
        access_day: '',
        access_day_time: '',
    });

    const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});

    const [formData, setFormData] = useState<{
        name: string;
        sub_title: string;
        status: string;
        target_exposure_min: string;
        target_exposure_max: string;
        est_timeline_min: string;
        est_timeline_max: string;
        what_you_will_get: string[];
        pre_flight_checklist: string[];
    }>({
        name: '',
        sub_title: '',
        status: STATUS_ACTIVE,
        target_exposure_min: '',
        target_exposure_max: '',

        est_timeline_min: '',
        est_timeline_max: '',
        what_you_will_get: [''],
        pre_flight_checklist: [],
    });

    const { data: programRes, isLoading: programLoading } = useCapitalAccount(id!);
    const { data: cardsRes } = useAllCreditAccountsForBuilder(searchTerm);

    const initialLoading = isEditMode && programLoading;
    const availableAccounts = cardsRes?.data || [];

    const createMutation = useCreateCapitalAccount();
    const updateMutation = useUpdateCapitalAccount();

    useEffect(() => {
        if (isEditMode && programRes?.data) {
            const programData = programRes.data;
            setFormData({
                name: programData.name || '',
                sub_title: programData.sub_title || '',
                status: programData.status || 'Active',
                target_exposure_min: programData.target_exposure_min ? String(programData.target_exposure_min).replace(/[^0-9.-]+/g, "") : '',
                target_exposure_max: programData.target_exposure_max ? String(programData.target_exposure_max).replace(/[^0-9.-]+/g, "") : '',

                est_timeline_min: programData.est_timeline_min !== undefined && programData.est_timeline_min !== null ? String(programData.est_timeline_min) : '',
                est_timeline_max: programData.est_timeline_max !== undefined && programData.est_timeline_max !== null ? String(programData.est_timeline_max) : '',
                what_you_will_get: programData.what_you_will_get?.length ? programData.what_you_will_get : [''],
                pre_flight_checklist: programData.pre_flight_checklist || [],
            });
            const loadedAccounts: SelectedPlayCard[] = (programData.credit_accounts || []).map((acc: any) => ({
                ...acc,
                play_details: acc.pivot ? {
                    why_this_card: acc.pivot.why_this_card || '',

                    est_limit_min: String(acc.pivot.est_limit_min ?? ''),
                    est_limit_max: String(acc.pivot.est_limit_max ?? ''),
                    est_limit_for_show: acc.pivot.est_limit_for_show || '',
                    hard_pull: acc.pivot.hard_pull || 'Yes',
                    what_you_need: typeof acc.pivot.what_you_need === 'string' ? JSON.parse(acc.pivot.what_you_need) : (acc.pivot.what_you_need || []),
                    access_time: acc.pivot.access_time || 'Morning',
                    access_day: acc.pivot.access_day ? String(acc.pivot.access_day) : '',
                    access_day_time: acc.pivot.access_day_time || '',
                } : {
                    why_this_card: '',

                    est_limit_min: '',
                    est_limit_max: '',
                    est_limit_for_show: '',
                    hard_pull: 'Yes',
                    what_you_need: [],
                    access_time: 'Morning',
                    access_day: '',
                    access_day_time: '',
                }
            }));
            setSelectedAccounts(loadedAccounts);
        }
    }, [programRes, isEditMode]);

    // Available cards filtered by search
    const filteredAvailable = availableAccounts.filter(acc => {
        // Do not display if already in the selected accounts
        return !selectedAccounts.some(sel => sel.id === acc.id);
    });

    // ----------------------------------------------------
    // HTML5 Drag and Drop Handlers
    // ----------------------------------------------------

    // Drag start for adding a card (from Left panel)
    const handleDragStartAvailable = (e: React.DragEvent<HTMLDivElement>, account: CreditAccount) => {
        e.dataTransfer.setData('application/json', JSON.stringify({ source: 'available', account }));
    };

    // Drag start for reordering cards (in Right panel)
    const handleDragStartSelected = (e: React.DragEvent<HTMLDivElement>, index: number) => {
        setDraggingIndex(index);
        e.dataTransfer.setData('application/json', JSON.stringify({ source: 'selected', index }));
    };

    const handleDragEndSelected = () => {
        setDraggingIndex(null);
    };

    const handleDragOverReorder = (e: React.DragEvent<HTMLDivElement>, index: number) => {
        e.preventDefault();
        if (draggingIndex === null || draggingIndex === index) return;
    };

    // Reorder cards when dropped inside the list
    const handleDropReorder = (e: React.DragEvent<HTMLDivElement>, targetIndex: number) => {
        e.preventDefault();
        try {
            const rawData = e.dataTransfer.getData('application/json');
            if (!rawData) return;
            const data = JSON.parse(rawData);

            if (data.source === 'selected') {
                const sourceIndex = data.index;
                if (sourceIndex === targetIndex) return;

                const updated = [...selectedAccounts];
                const [moved] = updated.splice(sourceIndex, 1);
                updated.splice(targetIndex, 0, moved);
                setSelectedAccounts(updated);
            }
        } catch (err) {
            console.error(err);
        }
    };

    // Handle drag over the Right dropping container
    const handleDragOverZone = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        setDragOverList(true);
    };

    const handleDragLeaveZone = () => {
        setDragOverList(false);
    };

    // Handle dropping inside Right container (adding cards)
    const handleDropOnZone = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        setDragOverList(false);
        try {
            const rawData = e.dataTransfer.getData('application/json');
            if (!rawData) return;
            const data = JSON.parse(rawData);

            if (data.source === 'available') {
                const account = data.account;
                if (selectedAccounts.some(acc => acc.id === account.id)) {
                    toast.warning('This account is already selected.');
                    return;
                }

                const newAcc: SelectedPlayCard = {
                    ...account,
                    play_details: {
                        why_this_card: '',
                        est_limit_min: '',
                        est_limit_max: '',
                        hard_pull: 'Yes',
                        what_you_need: [''],
                        access_time: 'Morning',
                        access_day: '',
                        access_day_time: '',
                    }
                };
                setPendingAddCard(newAcc);
                if (newAcc.play_details) setEditDetailsForm(newAcc.play_details);
                setModalValidationErrors({});
                setIsDetailsModalOpen(true);
            }
        } catch (err) {
            console.error(err);
        }
    };

    // ----------------------------------------------------
    // Simple Button Click Controls (Accessibility Fallback)
    // ----------------------------------------------------
    const addAccount = (account: CreditAccount) => {
        if (selectedAccounts.some(acc => acc.id === account.id)) {
            toast.warning('This account is already selected.');
            return;
        }

        const newAcc: SelectedPlayCard = {
            ...account,
            play_details: {
                why_this_card: '',
                        est_limit_min: '',
                        est_limit_max: '',
                        hard_pull: 'Yes',
                        what_you_need: [''],
                        access_time: 'Morning',
                        access_day: '',
                        access_day_time: '',
            }
        };
        setPendingAddCard(newAcc);
        if (newAcc.play_details) setEditDetailsForm(newAcc.play_details);
        setModalValidationErrors({});
        setIsDetailsModalOpen(true);
    };

    const removeAccount = (idToRemove?: number) => {
        if (idToRemove === undefined) return;
        setSelectedAccounts(prev => prev.filter(acc => acc.id !== idToRemove));
    };

    // ----------------------------------------------------
    // Modal Edit Details Handlers
    // ----------------------------------------------------
    const openEditModal = (account: SelectedPlayCard) => {
        if (!account.id) return;
        setEditingCardId(account.id);
        setEditDetailsForm({
            why_this_card: account.play_details?.why_this_card || '',

            est_limit_min: account.play_details?.est_limit_min || '',
            est_limit_max: account.play_details?.est_limit_max || '',
            hard_pull: account.play_details?.hard_pull || 'Yes',
            what_you_need: account.play_details?.what_you_need?.length ? [...account.play_details.what_you_need] : [],
            access_time: account.play_details?.access_time || 'Morning',
            access_day: account.play_details?.access_day ? String(account.play_details.access_day) : '',
            access_day_time: account.play_details?.access_day_time || '',
        });
        setModalValidationErrors({});
        setIsDetailsModalOpen(true);
    };

    const saveEditModal = () => {
        // Validation
        const errors: Record<string, string> = {};
        if (!editDetailsForm.why_this_card.trim()) errors.why_this_card = "Why This Card is required.";

        if (!editDetailsForm.est_limit_min) errors.est_limit_min = "Min Limit is required.";
        if (!editDetailsForm.est_limit_max) errors.est_limit_max = "Max Limit is required.";

        const cleanRequirements = editDetailsForm.what_you_need.filter(r => r.trim() !== '');
        if (cleanRequirements.length === 0) {
            errors.what_you_need = "Please add at least one requirement.";
        }

        if (Object.keys(errors).length > 0) {
            setModalValidationErrors(errors);
            return;
        }

        setModalValidationErrors({});

        const minNum = Number(editDetailsForm.est_limit_min);
        const maxNum = Number(editDetailsForm.est_limit_max);
        const est_limit_for_show = `$${isNaN(minNum) ? editDetailsForm.est_limit_min : minNum.toLocaleString()} - $${isNaN(maxNum) ? editDetailsForm.est_limit_max : maxNum.toLocaleString()}`;

        const newPlayDetails = {
            ...editDetailsForm,
            est_limit_for_show,
            what_you_need: cleanRequirements
        };

        if (pendingAddCard) {
            const accToAdd = { ...pendingAddCard, play_details: newPlayDetails };
            setSelectedAccounts(prev => [...prev, accToAdd]);
            setPendingAddCard(null);
        } else if (editingCardId) {
            setSelectedAccounts(prev => prev.map(acc => {
                if (acc.id === editingCardId) {
                    return {
                        ...acc,
                        play_details: newPlayDetails
                    };
                }
                return acc;
            }));
            setEditingCardId(null);
        }
        setIsDetailsModalOpen(false);
    };

    // ----------------------------------------------------
    // Repeater Handlers
    // ----------------------------------------------------
    const handleAddRepeaterItem = (field: 'what_you_will_get' | 'pre_flight_checklist') => {
        setFormData(prev => ({
            ...prev,
            [field]: [...prev[field], '']
        }));
    };

    const handleRemoveRepeaterItem = (field: 'what_you_will_get' | 'pre_flight_checklist', index: number) => {
        setFormData(prev => {
            const newArray = [...prev[field]];
            newArray.splice(index, 1);
            return { ...prev, [field]: newArray };
        });
    };

    const handleRepeaterChange = (field: 'what_you_will_get' | 'pre_flight_checklist', index: number, value: string) => {
        setFormData(prev => {
            const newArray = [...prev[field]];
            newArray[index] = value;
            return { ...prev, [field]: newArray };
        });
    };

    // Form Submission
    const handleSubmit = async (e?: React.FormEvent) => {
        if (e) e.preventDefault();

        setValidationErrors({}); // Clear previous errors



        setLoading(true);
        try {
            const payload: StoreCapitalAccessPayload = {
                name: formData.name,
                sub_title: formData.sub_title,
                target_exposure_min: formData.target_exposure_min === '' ? '' : Number(formData.target_exposure_min),
                target_exposure_max: formData.target_exposure_max === '' ? '' : Number(formData.target_exposure_max),

                est_timeline_min: formData.est_timeline_min === '' ? '' : Number(formData.est_timeline_min),
                est_timeline_max: formData.est_timeline_max === '' ? '' : Number(formData.est_timeline_max),
                what_you_will_get: formData.what_you_will_get.filter(item => item.trim() !== ''),
                pre_flight_checklist: formData.pre_flight_checklist,
                status: formData.status,
                credit_accounts: selectedAccounts
                    .filter(acc => acc.id !== undefined)
                    .map(acc => ({
                        id: acc.id as number,
                        why_this_card: acc.play_details?.why_this_card || '',

                        est_limit_min: acc.play_details?.est_limit_min || '',
                        est_limit_max: acc.play_details?.est_limit_max || '',
                        hard_pull: acc.play_details?.hard_pull || 'Yes',
                        what_you_need: acc.play_details?.what_you_need || [],
                        access_time: acc.play_details?.access_time || 'Morning',
                        access_day: acc.play_details?.access_time === 'Day' && acc.play_details?.access_day
                            ? Number(acc.play_details.access_day)
                            : undefined,
                        access_day_time: acc.play_details?.access_time === 'Day' ? (acc.play_details?.access_day_time || 'Morning') : undefined,
                    })),
            };

            if (isEditMode && id) {
                await updateMutation.mutateAsync({ id, payload });
                toast.success('Capital Program updated successfully');
            } else {
                await createMutation.mutateAsync(payload);
                toast.success('Capital Program created successfully');
            }
            navigate('/capital-access');
        } catch (err: any) {
            console.error(err);
            if (err.response?.status === 422) {
                const errors = err.response.data.errors;
                const formattedErrors: Record<string, string> = {};
                for (const key in errors) {
                    // The API returns the first error message as a string directly, not an array of strings
                    formattedErrors[key] = typeof errors[key] === 'string' ? errors[key] : errors[key][0];
                }
                setValidationErrors(formattedErrors);
            } else {
                toast.error('Failed to save capital program');
            }
        } finally {
            setLoading(false);
        }
    };


    return (
        <div className="page-content">
            <div className="container-fluid">
                {/* Page Header */}
                <div className="row page-subheader-sticky bg-body">
                    <div className="col-12">
                        <div className="d-flex align-items-lg-center flex-lg-row flex-column py-2">
                            <div className="flex-grow-1">
                                <h4 className="fs-18 fw-semibold mb-1">{isEditMode ? 'Edit Capital Program' : 'Create Capital Program'}</h4>
                                <nav aria-label="breadcrumb">
                                    <ol className="breadcrumb m-0">
                                        <li className="breadcrumb-item"><Link to="/" className="text-muted">Dashboard</Link></li>
                                        <li className="breadcrumb-item"><Link to="/capital-access" className="text-muted">Capital Access</Link></li>
                                        <li className="breadcrumb-item active" aria-current="page">{isEditMode ? 'Edit Builder' : 'Create Builder'}</li>
                                    </ol>
                                </nav>
                            </div>
                            <div className="page-actions d-flex align-items-center gap-2 mt-3 mt-lg-0">
                                <Link to="/capital-access" className="btn btn-outline-secondary w-lg waves-effect">
                                    <i className="ri-arrow-left-line align-middle me-1"></i> Back
                                </Link>
                                {((isEditMode && hasPermission('update credit accounts')) || (!isEditMode && hasPermission('create credit accounts'))) && (
                                    <button
                                        type="submit"
                                        form="capital-account-form"
                                        className="btn btn-primary waves-effect w-lg"
                                        disabled={loading || initialLoading}
                                    >
                                        {loading ? (
                                            <>
                                                <span className="spinner-border spinner-border-sm me-1" role="status" aria-hidden="true"></span>
                                                {isEditMode ? 'Updating...' : 'Saving...'}
                                            </>
                                        ) : (
                                            <>
                                                <i className="ri-save-line align-middle me-1"></i> {isEditMode ? 'Save Changes' : 'Save Program'}
                                            </>
                                        )}
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                {initialLoading ? (
                    <div className="row">
                        <div className="col-12"><FormLoader count={8} /></div>
                    </div>
                ) : (
                    <form id="capital-account-form" onSubmit={handleSubmit}>
                        <div className="row credit-account-section mb-4">
                            {/* Basic Details & Play Metrics */}
                            <div className="col-lg-12">
                                <div className="card shadow-sm mb-0">
                                    <div className="card-header border-bottom-dashed">
                                        <h5 className="card-title mb-0"><i className="ri-information-line align-middle text-muted me-1 fs-18"></i> Basic Information & Metrics</h5>
                                    </div>
                                    <div className="card-body">
                                        <div className="row g-4 mb-4">
                                            <div className="col-lg-6">
                                                <div>
                                                    <label className="form-label" htmlFor="programName">Program Name <span className="text-danger">*</span></label>
                                                    <input type="text" id="programName" className={`form-control ${validationErrors.name ? 'is-invalid' : ''}`} placeholder="e.g. Foundation 100 Play" value={formData.name} onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))} />
                                                    {validationErrors.name && <div className="invalid-feedback">{validationErrors.name}</div>}
                                                </div>
                                            </div>
                                            <div className="col-lg-6">
                                                <div>
                                                    <label className="form-label" htmlFor="programSubTitle">Sub Title <span className="text-danger">*</span></label>
                                                    <input type="text" id="programSubTitle" className={`form-control ${validationErrors.sub_title ? 'is-invalid' : ''}`} placeholder="e.g. Build your foundation with these cards" value={formData.sub_title} onChange={(e) => setFormData(prev => ({ ...prev, sub_title: e.target.value }))} />
                                                    {validationErrors.sub_title && <div className="invalid-feedback">{validationErrors.sub_title}</div>}
                                                </div>
                                            </div>

                                            <div className="col-lg-6">
                                                <div>
                                                    <label className="form-label">Target Exposure <span className="text-danger">*</span></label>
                                                    <div className="input-group">
                                                        <span className="input-group-text bg-light text-muted"><i className="ri-money-dollar-circle-line"></i></span>
                                                        <input type="number" className={`form-control ${validationErrors.target_exposure_min ? 'is-invalid' : ''}`} placeholder="Min (e.g. 75000)" value={formData.target_exposure_min} onChange={(e) => setFormData(prev => ({ ...prev, target_exposure_min: e.target.value }))} />
                                                        <span className="input-group-text">to</span>
                                                        <input type="number" className={`form-control ${validationErrors.target_exposure_max ? 'is-invalid' : ''}`} placeholder="Max (e.g. 150000)" value={formData.target_exposure_max} onChange={(e) => setFormData(prev => ({ ...prev, target_exposure_max: e.target.value }))} />
                                                    </div>
                                                    {(validationErrors.target_exposure_min || validationErrors.target_exposure_max) && <div className="text-danger small mt-1">{validationErrors.target_exposure_min || validationErrors.target_exposure_max}</div>}
                                                </div>
                                            </div>

                                            <div className="col-lg-6">
                                                <div>
                                                    <label className="form-label">Est. Timeline (Days) <span className="text-danger">*</span></label>
                                                    <div className="input-group">
                                                        <span className="input-group-text bg-light text-muted"><i className="ri-calendar-event-line"></i></span>
                                                        <input type="number" min="0" className={`form-control ${validationErrors.est_timeline_min ? 'is-invalid' : ''}`} placeholder="Min (e.g. 5)" value={formData.est_timeline_min} onChange={(e) => setFormData(prev => ({ ...prev, est_timeline_min: e.target.value }))} />
                                                        <span className="input-group-text">to</span>
                                                        <input type="number" min="0" className={`form-control ${validationErrors.est_timeline_max ? 'is-invalid' : ''}`} placeholder="Max (e.g. 10)" value={formData.est_timeline_max} onChange={(e) => setFormData(prev => ({ ...prev, est_timeline_max: e.target.value }))} />
                                                    </div>
                                                    {(validationErrors.est_timeline_min || validationErrors.est_timeline_max) && <div className="text-danger small mt-1">{validationErrors.est_timeline_min || validationErrors.est_timeline_max}</div>}
                                                </div>
                                            </div>

                                            <div className="col-lg-6">
                                                <div>
                                                    <label className="form-label" htmlFor="programStatus">Status</label>
                                                    <Dropdown id="programStatus" value={formData.status} options={STATUS_OPTIONS} onChange={(e: any) => setFormData(prev => ({ ...prev, status: e.value }))} optionLabel="label" optionValue="value" className="w-100" appendTo="self" />
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Separate Section for Checklists */}
                        <div className="row mb-4">
                            {/* What You'll Get */}
                            <div className="col-lg-6">
                                <div className="card shadow-sm h-100 mb-0">
                                    <div className="card-header border-bottom-dashed">
                                        <h5 className="card-title mb-0"><i className="ri-list-check-2 align-middle text-muted me-1 fs-18"></i> What You'll Get <span className="text-danger">*</span></h5>
                                    </div>
                                    <div className="card-body">
                                        <div className="d-flex flex-column gap-2 mb-3">
                                            {formData.what_you_will_get.map((item, index) => (
                                                <div key={index} className="d-flex align-items-center gap-2">
                                                    <input type="text" className="form-control" placeholder="e.g. Step-by-step sequence" value={item} onChange={(e) => handleRepeaterChange('what_you_will_get', index, e.target.value)} />
                                                    <button type="button" className="btn btn-danger btn-icon" onClick={() => handleRemoveRepeaterItem('what_you_will_get', index)} disabled={formData.what_you_will_get.length === 1 && !item}>
                                                        <i className="ri-delete-bin-line"></i>
                                                    </button>
                                                </div>
                                            ))}
                                            {validationErrors.what_you_will_get && <div className="text-danger small mt-1">{validationErrors.what_you_will_get}</div>}
                                        </div>
                                        <button type="button" className="btn btn-sm btn-soft-primary" onClick={() => handleAddRepeaterItem('what_you_will_get')}>
                                            <i className="ri-add-line"></i> Add Item
                                        </button>
                                    </div>
                                </div>
                            </div>

                            {/* Pre-Flight Checklist */}
                            <div className="col-lg-6">
                                <div className="card shadow-sm h-100 mb-0">
                                    <div className="card-header border-bottom-dashed">
                                        <h5 className="card-title mb-0"><i className="ri-checkbox-multiple-line align-middle text-muted me-1 fs-18"></i> Pre-Flight Checklist <span className="text-danger">*</span></h5>
                                    </div>
                                    <div className="card-body">
                                        <div className="mb-3">
                                            <Dropdown
                                                options={PRE_FLIGHT_TASKS.filter(t => !formData.pre_flight_checklist.includes(t)).map(t => ({ label: t, value: t }))}
                                                onChange={(e) => {
                                                    if (e.value) {
                                                        setFormData(prev => ({
                                                            ...prev,
                                                            pre_flight_checklist: [...prev.pre_flight_checklist, e.value]
                                                        }));
                                                    }
                                                }}
                                                placeholder="Select Requirement to Add"
                                                className="w-100"
                                                value={null}
                                                emptyMessage="All requirements added"
                                            />
                                            {validationErrors.pre_flight_checklist && <div className="text-danger small mt-1">{validationErrors.pre_flight_checklist}</div>}
                                        </div>
                                        <div className="d-flex flex-column gap-2 mb-3">
                                            {formData.pre_flight_checklist.map((item, index) => (
                                                <div key={index} className="d-flex align-items-center justify-content-between p-2 border border-light-subtle rounded bg-white shadow-sm transition">
                                                    <div className="d-flex align-items-center gap-2">
                                                        <i className="ri-checkbox-circle-line text-primary fs-18"></i>
                                                        <span className="fw-medium text-dark fs-13">{item}</span>
                                                    </div>
                                                    <div className="d-flex align-items-center gap-2">
                                                        <button type="button" className="btn btn-sm btn-ghost-danger p-1 lh-1 rounded" onClick={() => handleRemoveRepeaterItem('pre_flight_checklist', index)}>
                                                            <i className="ri-close-line fs-16"></i>
                                                        </button>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Builder Drag-and-Drop Columns */}
                        <div className="row g-4 mb-4">

                            {/* Left Panel: Selected Builder Drop-zone */}
                            <div className="col-lg-6">
                                <div className="card shadow-sm border border-light-subtle h-100" style={{ minHeight: '500px' }}>
                                    <div className="card-header border-bottom border-light-subtle bg-light bg-opacity-25 d-flex align-items-center justify-content-between py-3">
                                        <h5 className="card-title mb-0 fs-15"><i className="ri-hand-coin-line align-middle text-muted me-1 fs-18"></i> Selected Cards</h5>
                                        <span className="badge bg-success-subtle text-success rounded-pill font-size-12">{selectedAccounts.length} Cards Selected</span>
                                    </div>
                                    <div className="card-body p-3 d-flex flex-column">
                                        <div
                                            onDragOver={handleDragOverZone}
                                            onDragLeave={handleDragLeaveZone}
                                            onDrop={handleDropOnZone}
                                            className={`flex-grow-1 rounded border-2 border-dashed d-flex flex-column p-2 transition ${dragOverList ? 'border-primary bg-primary bg-opacity-10' : (validationErrors.credit_accounts ? 'border-danger bg-danger bg-opacity-10' : 'border-light-subtle')}`}
                                            style={{ minHeight: '380px' }}
                                        >
                                            {selectedAccounts.length === 0 ? (
                                                <div className={`d-flex flex-column align-items-center justify-content-center flex-grow-1 text-center py-5 ${validationErrors.credit_accounts ? 'text-danger' : 'text-muted'}`}>
                                                    <i className={`ri-drag-drop-line fs-32 mb-2 opacity-50 ${validationErrors.credit_accounts ? 'text-danger' : 'text-muted'}`}></i>
                                                    <h6 className={`fs-14 fw-medium ${validationErrors.credit_accounts ? 'text-danger' : 'text-muted'}`}>Drag Cards Here</h6>
                                                    <p className={`mb-0 small max-w-sm px-4 ${validationErrors.credit_accounts ? 'text-danger' : 'text-muted'}`}>Or click the plus button on available cards to add them to this program.</p>
                                                </div>
                                            ) : (
                                                <div className="d-flex flex-column gap-2 w-100">
                                                    {selectedAccounts.map((acc, index) => {
                                                        const img = acc.full_image_url || acc.image_url;
                                                        return (
                                                            <div
                                                                key={acc.id}
                                                                draggable="true"
                                                                onDragStart={(e) => handleDragStartSelected(e, index)}
                                                                onDragEnd={handleDragEndSelected}
                                                                onDragOver={(e) => handleDragOverReorder(e, index)}
                                                                onDrop={(e) => handleDropReorder(e, index)}
                                                                className={`card border mb-0 cursor-grab px-3 py-3 shadow-sm transition ${draggingIndex === index ? 'opacity-50 border-primary bg-light' : 'border-light-subtle bg-white'}`}
                                                            >
                                                                <div className="d-flex align-items-center justify-content-between">
                                                                    <div className="d-flex align-items-center gap-3">
                                                                        {/* Drag Handle Indicator */}
                                                                        <div className="text-muted cursor-grab d-none d-sm-block">
                                                                            <i className="ri-drag-move-2-line fs-16 opacity-50"></i>
                                                                        </div>

                                                                        <div className="d-flex align-items-center justify-content-center" style={{ width: '65px', height: '40px', overflow: 'hidden' }}>
                                                                            {img ? (
                                                                                <img src={buildStorageUrl(img)} alt={acc.card_name} className="img-fluid rounded border bg-white" style={{ maxHeight: '100%', maxWidth: '100%', objectFit: 'contain' }} />
                                                                            ) : (
                                                                                <div className="bg-light rounded border d-flex align-items-center justify-content-center w-100 h-100">
                                                                                    <i className="ri-image-line text-muted" style={{ fontSize: '16px' }}></i>
                                                                                </div>
                                                                            )}
                                                                        </div>
                                                                        <div>
                                                                            <h6 className="mb-0 fs-13 fw-semibold text-dark d-flex align-items-center flex-wrap">
                                                                                <span className="badge bg-secondary-subtle text-secondary me-2 font-size-10">#{index + 1}</span>
                                                                                <span>{acc.card_name}</span>
                                                                                <span className="text-muted fw-normal ms-2 fs-12">({acc.issuer})</span>
                                                                            </h6>
                                                                            {acc.play_details && (
                                                                                <div className="d-flex flex-wrap gap-2 mt-2">
                                                                                    {acc.play_details.est_limit_for_show && (
                                                                                        <span className="badge bg-info-subtle text-info fs-9">
                                                                                            <i className="ri-money-dollar-circle-line align-bottom me-1"></i> Limit: {acc.play_details.est_limit_for_show}
                                                                                        </span>
                                                                                    )}
                                                                                    {acc.play_details.hard_pull && (
                                                                                        <span className={`badge ${acc.play_details.hard_pull === 'Yes' ? 'bg-danger-subtle text-danger' : 'bg-light text-muted'} fs-9`}>
                                                                                            <i className="ri-error-warning-line align-bottom me-1"></i> Hard Pull: {acc.play_details.hard_pull}
                                                                                        </span>
                                                                                    )}
                                                                                    {acc.play_details.access_time && (
                                                                                        <span className="badge bg-primary-subtle text-primary fs-9">
                                                                                            <i className="ri-time-line align-bottom me-1"></i> {acc.play_details.access_time}{acc.play_details.access_time === 'Day' && acc.play_details.access_day ? ` Day ${acc.play_details.access_day}` : ''}{acc.play_details.access_time === 'Day' && acc.play_details.access_day_time ? ` (${acc.play_details.access_day_time})` : ''}
                                                                                        </span>
                                                                                    )}
                                                                                </div>
                                                                            )}
                                                                        </div>
                                                                    </div>
                                                                    <div className="d-flex align-items-center gap-3">
                                                                        <button
                                                                            type="button"
                                                                            className="btn btn-link text-primary p-0 border-0 fw-semibold fs-13 text-decoration-none"
                                                                            onClick={() => openEditModal(acc)}
                                                                        >
                                                                            Edit
                                                                        </button>
                                                                        <button
                                                                            type="button"
                                                                            className="btn btn-link text-danger p-0 border-0 fw-semibold fs-13 text-decoration-none"
                                                                            onClick={() => removeAccount(acc.id)}
                                                                        >
                                                                            Remove
                                                                        </button>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            )}
                                        </div>
                                        {validationErrors.credit_accounts && (
                                            <div className="text-danger small mt-2 fw-medium">
                                                <i className="ri-error-warning-line me-1"></i> {validationErrors.credit_accounts}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Right Panel: Available Accounts */}
                            <div className="col-lg-6">
                                <div className="card shadow-sm border border-light-subtle h-100" style={{ minHeight: '500px' }}>
                                    <div className="card-header border-bottom border-light-subtle bg-light bg-opacity-25 d-flex align-items-center justify-content-between py-3">
                                        <h5 className="card-title mb-0 fs-15"><i className="ri-list-check align-middle text-muted me-1 fs-18"></i> Available Cards</h5>
                                        <span className="badge bg-primary-subtle text-primary rounded-pill font-size-12">{filteredAvailable.length} Cards</span>
                                    </div>
                                    <div className="card-body d-flex flex-column p-3">
                                        <div className="search-box mb-3">
                                            <input
                                                type="text"
                                                className="form-control search bg-light border-light-subtle"
                                                placeholder="Search by name or lender..."
                                                value={searchTerm}
                                                onChange={(e) => setSearchTerm(e.target.value)}
                                            />
                                            <i className="ri-search-line search-icon"></i>
                                        </div>

                                        <div className="flex-grow-1 overflow-auto pe-1" style={{ maxHeight: '420px' }}>
                                            {filteredAvailable.length === 0 ? (
                                                <div className="text-center py-5 text-muted">
                                                    <i className="ri-filter-off-line fs-24 mb-2 text-warning"></i>
                                                    <p className="mb-0 fs-13">No matching cards available</p>
                                                </div>
                                            ) : (
                                                <div className="d-flex flex-column gap-2">
                                                    {filteredAvailable.map((acc) => {
                                                        const img = acc.full_image_url || acc.image_url;
                                                        return (
                                                            <div
                                                                key={acc.id}
                                                                draggable="true"
                                                                onDragStart={(e) => handleDragStartAvailable(e, acc)}
                                                                className="card border border-light-subtle mb-0 cursor-grab px-3 py-3 bg-light-subtle hover-shadow transition"
                                                                style={{ userSelect: 'none' }}
                                                            >
                                                                <div className="d-flex align-items-center justify-content-between">
                                                                    <div className="d-flex align-items-center gap-3">
                                                                        <div className="d-flex align-items-center justify-content-center" style={{ width: '65px', height: '40px', overflow: 'hidden' }}>
                                                                            {img ? (
                                                                                <img src={buildStorageUrl(img)} alt={acc.card_name} className="img-fluid rounded border bg-white" style={{ maxHeight: '100%', maxWidth: '100%', objectFit: 'contain' }} />
                                                                            ) : (
                                                                                <div className="bg-light rounded border d-flex align-items-center justify-content-center w-100 h-100">
                                                                                    <i className="ri-image-line text-muted" style={{ fontSize: '16px' }}></i>
                                                                                </div>
                                                                            )}
                                                                        </div>
                                                                        <div>
                                                                            <h6 className="mb-0 fs-13 fw-semibold text-dark">{acc.card_name}</h6>
                                                                            <p className="mb-0 text-muted small">{acc.issuer}</p>
                                                                        </div>
                                                                    </div>
                                                                    <div className="d-flex align-items-center gap-2">
                                                                        <button
                                                                            type="button"
                                                                            className="btn btn-sm btn-subtle-primary p-1 lh-1 rounded-circle"
                                                                            onClick={() => addAccount(acc)}
                                                                            title="Add program"
                                                                        >
                                                                            <i className="ri-add-line fs-14"></i>
                                                                        </button>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>


                        </div>
                    </form>
                )}
            </div>

            {/* Play Card Details Modal */}
            <EditStepDetailsModal
                isOpen={isDetailsModalOpen}
                onClose={() => { setIsDetailsModalOpen(false); setEditingCardId(null); setPendingAddCard(null); setModalValidationErrors({}); }}
                onSave={saveEditModal}
                editDetailsForm={editDetailsForm}
                setEditDetailsForm={setEditDetailsForm}
                modalValidationErrors={modalValidationErrors}
            />
        </div>
    );
}
