import React, { useEffect, useRef, useState } from 'react';
import { Modal, ModalBody } from 'reactstrap';
import { Dropdown } from 'primereact/dropdown';
import { formatCurrency } from '../../../utils/helper';
import { filterLenders } from './lenderFilter';
import { LENDER_PAGE_SIZES, paginate } from './lenderPagination';
import { lenderDisplayName } from '../../../modules/lender/displayName';
import '../../../../assets/css/funding-requests.css';

import type { MatchedLender } from '../../../modules/application/types';

export type { MatchedLender };

type Props = {
    lenders: MatchedLender[];
    assignedLenderIds: number[];
    /** What the lender is assigned to, for the confirm dialog: "funding request", "funding application". */
    subjectLabel: string;
    /** Assign the lender; resolve on success (the dialog closes), reject on failure (it stays open). */
    onAssign: (lender: MatchedLender) => Promise<unknown>;
    /** A save is in flight here or elsewhere on the page. */
    isBusy?: boolean;
    /** Assign is offered (default true); when false, `assignDisabledReason` says why. */
    canAssign?: boolean;
    assignDisabledReason?: string;
    /** Pulse the first row - the page is pointing the user at the table. */
    highlightFirstRow?: boolean;
    cardRef?: React.Ref<HTMLDivElement>;
    emptyText?: string;
    /** Show only the assigned lender - no others, no filters (the lender is fixed). */
    onlyAssigned?: boolean;
    /** Shown while Assign is open - e.g. when the lender stops being changeable. */
    notice?: string;
};

/**
 * Lender Information: the matched lenders, filterable, with Assign and its
 * confirm dialog. Shared by the funding request and funding application
 * details pages (host only - the pages decide whether to render it).
 */
export default function LenderInformationCard({
    lenders,
    assignedLenderIds,
    subjectLabel,
    onAssign,
    isBusy = false,
    canAssign = true,
    assignDisabledReason,
    highlightFirstRow = false,
    cardRef,
    emptyText = 'No matched lenders found for this funding type.',
    onlyAssigned = false,
    notice,
}: Props) {
    if (onlyAssigned) {
        lenders = lenders.filter((l) => assignedLenderIds.includes(l.id));
    }
    // Applied as they change - typing, or picking a category or lender.
    const [lenderSearch, setLenderSearch] = useState('');
    const [lenderCategoryFilter, setLenderCategoryFilter] = useState('');
    const [lenderNameFilter, setLenderNameFilter] = useState('');

    const [showAssignModal, setShowAssignModal] = useState(false);
    const [lenderToAssign, setLenderToAssign] = useState<MatchedLender | null>(null);
    const [isAssigning, setIsAssigning] = useState(false);
    const busy = isBusy || isAssigning;

    const byLabel = (a: { label: string }, b: { label: string }) => a.label.localeCompare(b.label);
    // From the lenders matched: one funding type for a funding request, the
    // Preferred + Additional ones for a loan application.
    const uniqueCategories = Array.from(new Set(lenders.map((l) => l.product_category).filter(Boolean))).map(cat => ({ label: cat, value: cat })).sort(byLabel);
    // The lender list follows the chosen category.
    const uniqueLenderNames = Array.from(new Set(
        lenders.filter((l) => !lenderCategoryFilter || l.product_category === lenderCategoryFilter).map((l) => lenderDisplayName(l)).filter(Boolean)
    )).map(name => ({ label: name, value: name })).sort(byLabel);

    const filteredLenders = filterLenders(lenders, {
        search: lenderSearch,
        category: lenderCategoryFilter,
        lenderName: lenderNameFilter,
    });

    // The table shows one page of the filtered lenders.
    const [page, setPage] = useState(1);
    const [perPage, setPerPage] = useState(LENDER_PAGE_SIZES[0]);
    const shown = paginate(filteredLenders, page, perPage);
    const pageNumbers = Array.from({ length: shown.pageCount }, (_, i) => i + 1);

    // Page 2 can hold far fewer rows than page 1, so the table shrinks under
    // the reader; after they change page or page size, bring the whole card -
    // title, rows and pager - back into view.
    const cardElement = useRef<HTMLDivElement | null>(null);
    const setCardRef = (el: HTMLDivElement | null) => {
        cardElement.current = el;
        if (typeof cardRef === 'function') cardRef(el);
        else if (cardRef) (cardRef as React.MutableRefObject<HTMLDivElement | null>).current = el;
    };
    const [pagerMoves, setPagerMoves] = useState(0);
    useEffect(() => {
        if (pagerMoves > 0) cardElement.current?.scrollIntoView?.({ block: 'nearest' });
    }, [pagerMoves]);
    const goToPage = (n: number) => {
        setPage(n);
        setPagerMoves((m) => m + 1);
    };

    // A new search or filter starts again from page 1.
    const filterChanged = <T,>(set: (value: T) => void) => (value: T) => {
        set(value);
        setPage(1);
    };
    const changeSearch = filterChanged(setLenderSearch);
    const changeCategory = filterChanged(setLenderCategoryFilter);
    const changeLenderName = filterChanged(setLenderNameFilter);

    const clearFilters = () => {
        setLenderSearch('');
        setLenderCategoryFilter('');
        setLenderNameFilter('');
        setPage(1);
    };

    // The dialog keeps its button while it fades out after an assignment, when
    // there is no lender any more - the button passes one only while there is.
    const confirmAssign = async (lender: MatchedLender) => {
        setIsAssigning(true);
        try {
            await onAssign(lender);
            setShowAssignModal(false);
            setLenderToAssign(null);
        } catch (_) {
            // The page has said what went wrong; the dialog stays open to retry.
        } finally {
            setIsAssigning(false);
        }
    };

    // The lender is fixed: one card for it - no table, no search, no filters.
    const assigned = onlyAssigned ? lenders[0] : undefined;
    if (assigned) {
        const radius = 22;
        const circumference = 2 * Math.PI * radius;
        const offset = circumference - (assigned.score / 100) * circumference;
        const r = assigned.requirements;
        const requirements = [
            { label: 'FICO Score', ok: assigned.checks.fico, value: r.min_fico ? `${r.min_fico}+` : 'N/A', icon: 'ri-shield-user-line' },
            { label: 'Min Revenue', ok: assigned.checks.revenue, value: r.min_revenue ? `${formatCurrency(r.min_revenue, '$', 1, 0)}+` : 'N/A', icon: 'ri-line-chart-line' },
            { label: 'Min Time in Business', ok: assigned.checks.tib, value: r.min_tib ? `${r.min_tib} mo` : 'N/A', icon: 'ri-time-line' },
            { label: 'Min Deposit', ok: assigned.checks.deposit, value: r.min_deposit ? `${formatCurrency(r.min_deposit, '$', 1, 0)}+` : 'N/A', icon: 'ri-bank-line' },
        ];

        return (
            <div ref={cardRef} className="card shadow-sm border-0 mb-4 rounded-3 overflow-hidden">
                <div className="card-header bg-white border-bottom d-flex align-items-center justify-content-between py-3">
                    <h5 className="card-title mb-0 fs-16 fw-bold text-dark">Lender Information</h5>
                    <span className="badge bg-success-subtle text-success fs-12 px-2 py-1">
                        <i className="ri-checkbox-circle-fill me-1"></i> Assigned Lender
                    </span>
                </div>
                <div className="card-body p-4">
                    {/* Lender */}
                    <div className="d-flex flex-wrap align-items-center gap-3">
                        <span className="avatar-md flex-shrink-0">
                            <span className="avatar-title rounded-3 bg-dark text-white fs-24">
                                <i className="ri-bank-line"></i>
                            </span>
                        </span>
                        <div className="flex-grow-1 min-w-0">
                            <h5 className="fs-17 fw-bold mb-1 text-dark">{lenderDisplayName(assigned)}</h5>
                            <div className="d-flex flex-wrap align-items-center gap-3 text-muted fs-13">
                                <span className="badge bg-primary-subtle text-primary fs-12 fw-medium">{assigned.product_category}</span>
                                {/* Made Inactive after the lender was fixed: still the lender the deal went to (S434-BUG-05). */}
                                {assigned.is_active === false && (
                                    <span className="badge bg-secondary-subtle text-secondary fs-12 fw-medium">Inactive</span>
                                )}
                                {assigned.phone && <span><i className="ri-phone-line me-1"></i>{assigned.phone}</span>}
                                {assigned.email && <span><i className="ri-mail-line me-1"></i>{assigned.email}</span>}
                            </div>
                        </div>
                        <div className="d-flex align-items-center gap-2 flex-shrink-0">
                            <div className="position-relative d-inline-flex align-items-center justify-content-center" style={{ width: 56, height: 56 }}>
                                <svg width="56" height="56" viewBox="0 0 56 56">
                                    <circle cx="28" cy="28" r={radius} stroke="#e2e8f0" strokeWidth="4" fill="none" />
                                    <circle cx="28" cy="28" r={radius} stroke={assigned.score_hex} strokeWidth="4" fill="none" strokeDasharray={circumference} strokeDashoffset={offset} strokeLinecap="round" transform="rotate(-90 28 28)" />
                                </svg>
                                <span className="position-absolute fw-bold fs-13" style={{ color: assigned.score_hex }}>{assigned.score}%</span>
                            </div>
                            <div>
                                <div className="fw-bold fs-15" style={{ color: assigned.score_hex }}>{assigned.matches_fraction}</div>
                                <div className="fs-12 fw-medium" style={{ color: assigned.score_hex }}>{assigned.score_text}</div>
                            </div>
                        </div>
                    </div>

                    {/* Requirements against the borrower */}
                    <div className="row g-3 mt-2">
                        {requirements.map((req) => (
                            <div className="col-6 col-md-3" key={req.label}>
                                <div
                                    className="h-100 rounded-3 p-3 border"
                                    style={{ background: req.ok ? '#f0fdf4' : '#fef2f2', borderColor: req.ok ? '#bbf7d0' : '#fecaca' }}
                                >
                                    <div className="d-flex align-items-center justify-content-between mb-2">
                                        <span className="fs-12 text-muted fw-medium"><i className={`${req.icon} me-1`}></i>{req.label}</span>
                                        <i className={req.ok ? 'ri-checkbox-circle-fill text-success fs-16' : 'ri-close-circle-fill text-danger fs-16'}></i>
                                    </div>
                                    <div className="fs-16 fw-bold text-dark">{req.value}</div>
                                    <div className={`fs-11 ${req.ok ? 'text-success' : 'text-danger'}`}>{req.ok ? 'Meets requirement' : 'Below requirement'}</div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
                {assignDisabledReason && (
                    <div className="card-footer bg-light border-top-0 d-flex align-items-center gap-2 text-muted fs-13 py-2">
                        <i className="ri-lock-line"></i>
                        <span>{assignDisabledReason}</span>
                    </div>
                )}
            </div>
        );
    }

    return (
        <>
            <div ref={setCardRef} className="card shadow-sm border-0 mb-4 rounded-3">
                <div className="card-header bg-white border-bottom-0 pt-4 pb-0 px-2 d-block">
                    <div className="d-flex align-items-center justify-content-between mb-3 border-bottom">
                        <h5 className="card-title mb-0 fs-16 fw-bold text-dark">Lender Information</h5>
                    </div>
                    {!canAssign && assignDisabledReason && (
                        <div className="d-flex align-items-center gap-2 mb-3 px-2 py-2 rounded-2 bg-light text-muted fs-13">
                            <i className="ri-lock-line"></i>
                            <span>{assignDisabledReason}</span>
                        </div>
                    )}
                    {canAssign && notice && (
                        <div className="d-flex align-items-start gap-2 mb-3 px-3 py-2 rounded-2 bg-info-subtle text-info fs-13">
                            <i className="ri-information-line fs-15"></i>
                            <span>{notice}</span>
                        </div>
                    )}
                    {!onlyAssigned && (
                    <form onSubmit={(e) => e.preventDefault()}>
                        <div className="row g-3 mb-3 align-items-end">
                            <div className="col-md-3">
                                <div className="search-box">
                                    <input type="text" className="form-control search bg-light border-light" placeholder="Search lenders..." value={lenderSearch} onChange={(e) => changeSearch(e.target.value)} />
                                    <i className="ri-search-line search-icon"></i>
                                </div>
                            </div>
                            <div className="col-md-3">
                                <Dropdown value={lenderCategoryFilter} options={[{ label: 'All Categories', value: '' }, ...uniqueCategories]} optionLabel="label" optionValue="value" onChange={(e) => {
                                    changeCategory(e.value);
                                    // A lender not in the new category would show nothing.
                                    if (e.value && lenderNameFilter && !lenders.some((l) => lenderDisplayName(l) === lenderNameFilter && l.product_category === e.value)) {
                                        setLenderNameFilter('');
                                    }
                                }} placeholder="All Categories" className="w-100" />
                            </div>
                            <div className="col-md-3">
                                <Dropdown value={lenderNameFilter} options={[{ label: 'All Lenders', value: '' }, ...uniqueLenderNames]} optionLabel="label" optionValue="value" onChange={(e) => changeLenderName(e.value)} placeholder="All Lenders" className="w-100" />
                            </div>
                            <div className="col-md-3">
                                <div className="d-flex gap-2">
                                    <button type="submit" className="btn btn-warning flex-grow-1"><i className="ri-equalizer-fill me-1 align-bottom"></i> Filters</button>
                                    <button type="button" className="btn btn-default flex-grow-1" onClick={clearFilters}>
                                        <i className="ri-close-line me-1 align-bottom"></i> Clear
                                    </button>
                                </div>
                            </div>
                        </div>
                    </form>
                    )}
                </div>{/* end card-header */}
                <div className="card-body p-0">
                    <div className="fr-style-1d4669b6">
                        <table className="table align-middle mb-0 fr-style-310c95f3">
                            <thead>
                                <tr className="fr-style-c2cbac2">
                                    <th rowSpan={2} className="px-2 py-3 align-middle text-center fr-style-4ff6cdc1">
                                        <div className="text-dark fw-bold fr-style-3f3c752c">Lender Name</div>
                                        <div className="text-muted fr-style-3f58a42e">Contact Info</div>
                                    </th>
                                    <th rowSpan={2} className="px-2 py-3 text-center fw-bold align-middle fr-style-26842ef4">Category</th>
                                    <th className="px-3 py-2 text-center fw-bold fr-style-13ecc849">Match Analysis</th>
                                    <th colSpan={4} className="px-3 py-2 text-center fw-bold fr-style-13ecc849">Requirements Match</th>
                                    <th rowSpan={2} className="px-2 py-3 text-center fw-bold align-middle fr-style-1b4a0199">Match</th>
                                    <th rowSpan={2} className="px-2 py-3 text-center fw-bold align-middle fr-style-705890ee">Actions</th>
                                </tr>
                                <tr className="fr-style-123ff9de">
                                    <th className="px-1 py-2 text-center fr-style-6fe1846d">Matches</th>

                                    <th className="px-1 py-2 text-center fr-style-6ed6d344">FICO Score</th>
                                    <th className="px-1 py-2 text-center fr-style-45c66d77">Min Revenue</th>
                                    <th className="px-1 py-2 text-center fr-style-350c3165">Min TIB</th>
                                    <th className="px-1 py-2 text-center fr-style-45c66d77">Min Deposit</th>
                                </tr>
                            </thead>
                            <tbody>
                                {shown.rows.length > 0 ? (
                                    shown.rows.map((lender, idx) => {
                                        const radius = 16;
                                        const circumference = 2 * Math.PI * radius;
                                        const strokeDashoffset = circumference - (lender.score / 100) * circumference;

                                        const isAssigned = assignedLenderIds.includes(lender.id);
                                        // The list's first lender, not the first of each page.
                                        const pulses = highlightFirstRow && shown.page === 1 && idx === 0;

                                        return (
                                            <tr
                                                key={lender.id || idx}
                                                className={pulses ? 'row-pulse-animation' : ''}
                                                style={{ borderBottom: '1px solid #e2e8f0', background: isAssigned ? '#f1f5f9' : '#fff' }}
                                                onMouseEnter={e => !isAssigned && (e.currentTarget.style.background = pulses ? '' : '#f8fafc')}
                                                onMouseLeave={e => !isAssigned && (e.currentTarget.style.background = pulses ? '' : '#fff')}
                                            >

                                                {/* Lender Name */}
                                                <td className="px-2 py-3 text-center fr-style-73d7d324">
                                                    <div className="fw-bold text-dark fr-style-747e3e7d">{lenderDisplayName(lender) || 'Lender Name'}</div>
                                                    <div className="text-muted fr-style-3f58a42e">{lender.phone || lender.email || 'N/A'}</div>
                                                </td>
                                                {/* Category */}
                                                <td className="px-1 py-3 text-center fr-style-579eac21">
                                                    <span className="fr-style-1db6650e">
                                                        {lender.product_category || 'Category'}
                                                    </span>
                                                </td>
                                                {/* Matches */}
                                                <td className="px-2 py-3 text-center fr-style-73d7d324">
                                                    <div className="fw-bold fr-lender-score-fraction" style={{ color: lender.score_hex }}>{lender.matches_fraction}</div>
                                                    <div className="fr-lender-score-text" style={{ color: lender.score_hex }}>{lender.score_text}</div>
                                                </td>

                                                {/* FICO Score */}
                                                <td className="px-2 py-3 text-center fr-style-73d7d324">
                                                    <div className="d-flex align-items-center justify-content-center gap-1 fr-style-66f5a318">
                                                        {lender.checks.fico ? <i className="ri-checkbox-circle-fill fr-style-6005154d"></i> : <i className="ri-close-circle-fill fr-style-34f57f10"></i>}
                                                        <span className="fr-style-d7deedb">{lender.requirements.min_fico ? `${lender.requirements.min_fico}+` : 'N/A'}</span>
                                                    </div>
                                                </td>
                                                {/* Min Revenue */}
                                                <td className="px-2 py-3 text-center fr-style-73d7d324">
                                                    <div className="d-flex align-items-center justify-content-center gap-1 fr-style-66f5a318">
                                                        {lender.checks.revenue ? <i className="ri-checkbox-circle-fill fr-style-6005154d"></i> : <i className="ri-close-circle-fill fr-style-34f57f10"></i>}
                                                        <span className="fr-style-d7deedb">{lender.requirements.min_revenue ? `${formatCurrency(lender.requirements.min_revenue, '$', 1, 0)}+` : 'N/A'}</span>
                                                    </div>
                                                </td>
                                                {/* Min TIB */}
                                                <td className="px-2 py-3 text-center fr-style-73d7d324">
                                                    <div className="d-flex align-items-center justify-content-center gap-1 fr-style-66f5a318">
                                                        {lender.checks.tib ? <i className="ri-checkbox-circle-fill fr-style-6005154d"></i> : <i className="ri-close-circle-fill fr-style-34f57f10"></i>}
                                                        <span className="fr-style-d7deedb">{lender.requirements.min_tib ? `${lender.requirements.min_tib} mo` : 'N/A'}</span>
                                                    </div>
                                                </td>
                                                {/* Min Deposit */}
                                                <td className="px-2 py-3 text-center fr-style-73d7d324">
                                                    <div className="d-flex align-items-center justify-content-center gap-1 fr-style-66f5a318">
                                                        {lender.checks.deposit ? <i className="ri-checkbox-circle-fill fr-style-6005154d"></i> : <i className="ri-close-circle-fill fr-style-34f57f10"></i>}
                                                        <span className="fr-style-d7deedb">{lender.requirements.min_deposit ? `${formatCurrency(lender.requirements.min_deposit, '$', 1, 0)}+` : 'N/A'}</span>
                                                    </div>
                                                </td>
                                                {/* Overall Match */}
                                                <td className="px-2 py-3 text-center fr-style-73d7d324">
                                                    <div className="d-inline-flex align-items-center justify-content-center position-relative fr-style-210d4313">
                                                        <svg width="44" height="44" viewBox="0 0 44 44">
                                                            <circle cx="22" cy="22" r={radius} stroke="#e2e8f0" strokeWidth="3.5" fill="none" />
                                                            <circle cx="22" cy="22" r={radius} stroke={lender.score_hex} strokeWidth="3.5" fill="none" strokeDasharray={circumference} strokeDashoffset={strokeDashoffset} strokeLinecap="round" className="fr-style-c5a99bb" />
                                                        </svg>
                                                        <span className="position-absolute fw-bold funding-req-circle-text" style={{ color: lender.score_hex }}>{lender.score}%</span>
                                                    </div>
                                                </td>
                                                {/* Actions */}
                                                <td className="px-2 py-3 text-center fr-style-73d7d324">
                                                    {isAssigned ? (
                                                        <span className="badge bg-success-subtle text-success fs-12 px-2 py-1">
                                                            <i className="ri-check-line me-1"></i> Assigned
                                                        </span>
                                                    ) : (
                                                        <button
                                                            onClick={() => {
                                                                setLenderToAssign(lender);
                                                                setShowAssignModal(true);
                                                            }}
                                                            disabled={busy || !canAssign}
                                                            title={!canAssign ? assignDisabledReason : undefined}
                                                            className="btn btn-sm btn-light border text-muted fw-medium d-inline-flex align-items-center gap-1 fr-style-4f21c796"
                                                        >
                                                            <i className="ri-user-add-line fr-style-3f3c752c"></i> Assign
                                                        </button>
                                                    )}
                                                </td>
                                            </tr>
                                        );
                                    })
                                ) : (
                                    <tr>
                                        <td colSpan={9} className="text-center py-4 text-muted fs-14">
                                            <i className="ri-search-line fs-24 d-block mb-2"></i>
                                            {onlyAssigned ? 'The assigned lender is not among the lenders matched for this application.' : lenders.length > 0 ? 'No lenders match these filters.' : emptyText}
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
                {!onlyAssigned && (
                <div className="card-footer bg-white border-top p-3">
                    <div className="d-flex align-items-center justify-content-between">
                        <div className="text-muted fs-13">
                            Showing <span className="fw-semibold text-dark">{shown.from}</span> to <span className="fw-semibold text-dark">{shown.to}</span> of <span className="fw-semibold text-dark">{shown.total}</span> lenders
                        </div>
                        <div className="d-flex align-items-center gap-3">
                            <ul className="pagination pagination-sm mb-0">
                                {[
                                    { label: 'First page', icon: 'ri-arrow-left-double-line', to: 1, off: shown.page === 1 },
                                    { label: 'Previous page', icon: 'ri-arrow-left-s-line', to: shown.page - 1, off: shown.page === 1 },
                                ].map(({ label, icon, to, off }) => (
                                    <li key={label} className={`page-item${off ? ' disabled' : ''}`}>
                                        <button type="button" className={`page-link border-0 ${off ? 'text-muted' : 'text-dark'}`} aria-label={label} disabled={off} onClick={() => goToPage(to)}><i className={icon}></i></button>
                                    </li>
                                ))}
                                {pageNumbers.map((n) => (
                                    <li key={n} className={`page-item${n === shown.page ? ' active' : ''}`}>
                                        <button
                                            type="button"
                                            className={n === shown.page ? 'page-link rounded bg-dark border-dark text-white fw-medium' : 'page-link border-0 text-dark'}
                                            aria-label={`Page ${n}`}
                                            aria-current={n === shown.page ? 'page' : undefined}
                                            onClick={() => goToPage(n)}
                                        >
                                            {n}
                                        </button>
                                    </li>
                                ))}
                                {[
                                    { label: 'Next page', icon: 'ri-arrow-right-s-line', to: shown.page + 1, off: shown.page === shown.pageCount },
                                    { label: 'Last page', icon: 'ri-arrow-right-double-line', to: shown.pageCount, off: shown.page === shown.pageCount },
                                ].map(({ label, icon, to, off }) => (
                                    <li key={label} className={`page-item${off ? ' disabled' : ''}`}>
                                        <button type="button" className={`page-link border-0 ${off ? 'text-muted' : 'text-dark'}`} aria-label={label} disabled={off} onClick={() => goToPage(to)}><i className={icon}></i></button>
                                    </li>
                                ))}
                            </ul>
                            <select
                                className="form-select form-select-sm border-light bg-light fw-medium text-dark fr-style-5dc02308"
                                aria-label="Lenders per page"
                                value={perPage}
                                onChange={(e) => {
                                    setPerPage(Number(e.target.value));
                                    goToPage(1);
                                }}
                            >
                                {LENDER_PAGE_SIZES.map((size) => (
                                    <option key={size} value={size}>{size}</option>
                                ))}
                            </select>
                        </div>
                    </div>
                </div>
                )}
            </div>{/* end card */}

            <Modal isOpen={showAssignModal} toggle={() => !busy && setShowAssignModal(false)} centered size="md" contentClassName="border-0 shadow-lg" modalClassName="flip">
                <ModalBody className="p-0">
                    {/* Simple white header band */}
                    <div className="text-center pt-4 pb-3 px-2 rounded-top-3 bg-white">
                        <div className="avatar-md mx-auto mb-3">
                            <span className="avatar-title rounded-circle fs-22 text-white bg-dark">
                                <i className="ri-bank-line"></i>
                            </span>
                        </div>
                        <h5 className="fw-bold mb-1">Confirm Assign Lender</h5>
                        <p className="text-muted fs-13 mb-0">
                            Are you sure you want to assign <strong>{lenderDisplayName(lenderToAssign)}</strong> to this {subjectLabel}?
                        </p>
                    </div>
                    <div className="p-4">
                        {lenderToAssign && (
                            <div className="mb-4 text-start">
                                <p className="fs-12 text-uppercase fw-bold text-muted mb-2 fr-style-5385d7b4">
                                    <i className="ri-information-line me-1"></i> Lender Information
                                </p>
                                <div className="border rounded-3 p-3">
                                    <div className="d-flex justify-content-between align-items-center mb-2">
                                        <span className="fs-13 text-muted fw-medium">Lender Name</span>
                                        <span className="fs-13 fw-semibold text-dark">{lenderDisplayName(lenderToAssign)}</span>
                                    </div>
                                    <div className="d-flex justify-content-between align-items-center mb-2">
                                        <span className="fs-13 text-muted fw-medium">Funding Type</span>
                                        <span className="fs-13 fw-semibold text-dark">{lenderToAssign.product_category || '—'}</span>
                                    </div>
                                    <div className="d-flex justify-content-between align-items-center">
                                        <span className="fs-13 text-muted fw-medium">Match Analysis</span>
                                        <div className="d-flex align-items-center gap-2">
                                            <span className={`fs-13 fw-semibold ${lenderToAssign.score_text?.includes('Excellent') ? 'text-success' :
                                                lenderToAssign.score_text?.includes('Good') ? 'text-warning' :
                                                    lenderToAssign.score_text?.includes('Poor') ? 'text-danger' :
                                                        'text-primary'
                                                }`}>
                                                {lenderToAssign.matches_fraction || 'N/A'}
                                            </span>
                                            <i className="ri-arrow-right-line text-muted fs-12"></i>
                                            <span className={`badge fs-12 text-white ${lenderToAssign.score_text?.includes('Excellent') ? 'bg-success' :
                                                lenderToAssign.score_text?.includes('Good') ? 'bg-warning' :
                                                    lenderToAssign.score_text?.includes('Poor') ? 'bg-danger' :
                                                        'bg-primary'
                                                }`}>
                                                {lenderToAssign.score_text || 'Match'}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}
                        <div className="d-flex justify-content-center gap-3 mt-4">
                            <button
                                type="button"
                                className="btn btn-light fw-medium px-4"
                                onClick={() => setShowAssignModal(false)}
                                disabled={busy}
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                className="btn btn-dark fw-medium waves-effect waves-light px-4"
                                onClick={() => lenderToAssign && confirmAssign(lenderToAssign)}
                                disabled={busy}
                            >
                                {busy ? (
                                    <><span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span> Processing...</>
                                ) : (
                                    <><i className="ri-user-add-line align-bottom me-1"></i> Assign Lender</>
                                )}
                            </button>
                        </div>
                    </div>
                </ModalBody>
            </Modal>
        </>
    );
}
