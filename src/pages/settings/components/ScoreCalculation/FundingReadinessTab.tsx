import React from 'react';
import type { FormData, FormErrors } from '../ScoreCalculationConfigForm';

interface FundingReadinessTabProps {
    formData: FormData;
    errors: FormErrors;
    loading: boolean;
    handleInputChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => void;
    factorTierLabel: (slug: string, sortOrder: number) => string;
    totalWeight: number;
    getProgressBarColor: () => string;
}

const FundingReadinessTab: React.FC<FundingReadinessTabProps> = ({
    formData,
    errors,
    loading,
    handleInputChange,
    factorTierLabel,
    totalWeight,
    getProgressBarColor,
}) => {
    return (
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
                    <h6 className="mb-1 text-dark fw-semibold fs-14">Capital Access Readiness Scores Rules</h6>
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
                                                    <i className="ri-stack-line"></i>
                                                </div>
                                            </div>
                                            <div>
                                                <span className="fw-semibold text-body fs-13">Tradeline Depth</span>
                                                <small className="text-muted d-block fs-11">Measures the breadth and health of active credit tradelines.</small>
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
                                        <th className="text-start ps-3 config-th-half">Business Revenue</th>
                                        <th className="text-start ps-3 config-th-half">Personal Income</th>
                                        <th className="config-th-subscore">Subscore</th>
                                    </tr>
                                </thead>
                                <tbody className="fs-13">
                                    {/* Strong */}
                                    <tr>
                                        <td className="text-start ps-3">
                                            <span className="fw-semibold text-body">{factorTierLabel('revenue_strength', 1)}</span>
                                        </td>
                                        <td className="text-start ps-3 fw-medium text-nowrap">
                                            <span className="me-1">Business Revenue</span><span className="mx-1">≥</span><span className="mx-1">$</span>
                                            <input type="number" min="0" className="form-control form-control-xs text-center d-inline-block px-1 config-input config-input-xxl" name="rev_rule_t1" value={formData.rev_rule_t1} onChange={handleInputChange} disabled={loading} />
                                        </td>
                                        <td className="text-start ps-3 fw-medium text-nowrap">
                                            <span className="me-1">Personal Income</span><span className="mx-1">≥</span><span className="mx-1">$</span>
                                            <input type="number" min="0" className="form-control form-control-xs text-center d-inline-block px-1 config-input config-input-xxl" name="rev_rule_personal_t1" value={formData.rev_rule_personal_t1} onChange={handleInputChange} disabled={loading} />
                                        </td>
                                        <td>
                                            <input type="number" min="0" max="100" className="form-control form-control-xs text-center mx-auto" style={{ width: '80px' }} name="rev_subscore_strong" value={formData.rev_subscore_strong} onChange={handleInputChange} disabled={loading} />
                                        </td>
                                    </tr>
                                    {/* Moderate */}
                                    <tr>
                                        <td className="text-start ps-3">
                                            <span className="fw-semibold text-body">{factorTierLabel('revenue_strength', 2)}</span>
                                        </td>
                                        <td className="text-start ps-3 fw-medium text-nowrap">
                                            <span className="me-1">Business Revenue</span><span className="mx-1">$</span>
                                            <input type="number" min="0" className="form-control form-control-xs text-center d-inline-block px-1 config-input config-input-xxl" name="rev_rule_t2" value={formData.rev_rule_t2} onChange={handleInputChange} disabled={loading} />
                                            <span className="mx-1">–</span><span className="mx-1">$</span>
                                            <input type="number" className="form-control form-control-xs text-center d-inline-block px-1 config-input config-input-xxl" value={(Number(formData.rev_rule_t1) - 1) || 0} disabled />
                                        </td>
                                        <td className="text-start ps-3 fw-medium text-nowrap">
                                            <span className="me-1">Personal Income</span><span className="mx-1">$</span>
                                            <input type="number" min="0" className="form-control form-control-xs text-center d-inline-block px-1 config-input config-input-xxl" name="rev_rule_personal_t2" value={formData.rev_rule_personal_t2} onChange={handleInputChange} disabled={loading} />
                                            <span className="mx-1">–</span><span className="mx-1">$</span>
                                            <input type="number" className="form-control form-control-xs text-center d-inline-block px-1 config-input config-input-xxl" value={(Number(formData.rev_rule_personal_t1) - 1) || 0} disabled />
                                        </td>
                                        <td>
                                            <input type="number" min="0" max="100" className="form-control form-control-xs text-center mx-auto" style={{ width: '80px' }} name="rev_subscore_moderate" value={formData.rev_subscore_moderate} onChange={handleInputChange} disabled={loading} />
                                        </td>
                                    </tr>
                                    {/* Limited */}
                                    <tr>
                                        <td className="text-start ps-3">
                                            <span className="fw-semibold text-body">{factorTierLabel('revenue_strength', 3)}</span>
                                        </td>
                                        <td className="text-start ps-3 fw-medium text-nowrap">
                                            <span className="me-1">Business Revenue</span><span className="mx-1">$</span>
                                            <input type="number" min="0" className="form-control form-control-xs text-center d-inline-block px-1 config-input config-input-xxl" name="rev_rule_t3" value={formData.rev_rule_t3} onChange={handleInputChange} disabled={loading} />
                                            <span className="mx-1">–</span><span className="mx-1">$</span>
                                            <input type="number" className="form-control form-control-xs text-center d-inline-block px-1 config-input config-input-xxl" value={(Number(formData.rev_rule_t2) - 1) || 0} disabled />
                                        </td>
                                        <td className="text-start ps-3 fw-medium text-nowrap">
                                            <span className="me-1">Personal Income</span><span className="mx-1">$</span>
                                            <input type="number" min="0" className="form-control form-control-xs text-center d-inline-block px-1 config-input config-input-xxl" name="rev_rule_personal_t3" value={formData.rev_rule_personal_t3} onChange={handleInputChange} disabled={loading} />
                                            <span className="mx-1">–</span><span className="mx-1">$</span>
                                            <input type="number" className="form-control form-control-xs text-center d-inline-block px-1 config-input config-input-xxl" value={(Number(formData.rev_rule_personal_t2) - 1) || 0} disabled />
                                        </td>
                                        <td>
                                            <input type="number" min="0" max="100" className="form-control form-control-xs text-center mx-auto" style={{ width: '80px' }} name="rev_subscore_limited" value={formData.rev_subscore_limited} onChange={handleInputChange} disabled={loading} />
                                        </td>
                                    </tr>
                                    {/* Weak */}
                                    <tr>
                                        <td className="text-start ps-3">
                                            <span className="fw-semibold text-body">{factorTierLabel('revenue_strength', 4)}</span>
                                        </td>
                                        <td className="text-start ps-3 fw-medium text-nowrap">
                                            <span className="me-1">Below</span><span className="mx-1">$</span>
                                            <input type="number" className="form-control form-control-xs text-center d-inline-block px-1 config-input config-input-xxl" value={(Number(formData.rev_rule_t3) - 1) || 0} disabled />
                                        </td>
                                        <td className="text-start ps-3 fw-medium text-nowrap">
                                            <span className="me-1">Below</span><span className="mx-1">$</span>
                                            <input type="number" className="form-control form-control-xs text-center d-inline-block px-1 config-input config-input-xxl" value={(Number(formData.rev_rule_personal_t3) - 1) || 0} disabled />
                                        </td>
                                        <td>
                                            <input type="number" min="0" max="100" className="form-control form-control-xs text-center mx-auto" style={{ width: '80px' }} name="rev_subscore_weak" value={formData.rev_subscore_weak} onChange={handleInputChange} disabled={loading} />
                                        </td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>

                {/* Exception for startup — separate table */}
                <div className="row g-4 mt-1">
                    <div className="col-12">
                        <div className="table-responsive border border-warning rounded-3">
                            <table className="table table-sm table-bordered mb-0 align-middle text-center">
                                <thead className="table-warning text-uppercase fs-11">
                                    <tr>
                                        <th className="text-start ps-3 config-th-quarter">
                                            <i className="ri-error-warning-line me-1"></i>Exception for Startup
                                        </th>
                                        <th className="text-start ps-3 config-th-half">Business Revenue or Personal Income</th>
                                        <th className="text-start ps-3 config-th-half">Business Age (months)</th>
                                        <th className="config-th-subscore">Subscore</th>
                                    </tr>
                                </thead>
                                <tbody className="fs-13">
                                    <tr>
                                        <td className="text-start ps-3">
                                            <span className="fw-semibold text-warning-emphasis">Startup Exception</span>
                                        </td>
                                        <td className="text-start ps-3 fw-medium text-nowrap">
                                            <span className="mx-1">≤</span><span className="mx-1">$</span>
                                            <input
                                                type="number"
                                                min="0"
                                                className="form-control form-control-xs text-center d-inline-block px-1 config-input config-input-xxl"
                                                name="rev_startup_exception_revenue"
                                                value={formData.rev_startup_exception_revenue ?? ''}
                                                onChange={handleInputChange}
                                                disabled={loading}
                                            />
                                        </td>
                                        <td className="text-start ps-3 fw-medium text-nowrap">
                                            <span className="mx-1">≤</span>
                                            <input
                                                type="number"
                                                min="0"
                                                className="form-control form-control-xs text-center d-inline-block px-1 config-input"
                                                style={{ width: '70px' }}
                                                name="rev_startup_exception_months"
                                                value={formData.rev_startup_exception_months ?? ''}
                                                onChange={handleInputChange}
                                                disabled={loading}
                                            />
                                            <span className="mx-1">months</span>
                                        </td>
                                        <td>
                                            <input
                                                type="number"
                                                min="0"
                                                max="100"
                                                className="form-control form-control-xs text-center mx-auto"
                                                style={{ width: '80px' }}
                                                name="rev_subscore_startup_exception"
                                                value={formData.rev_subscore_startup_exception ?? ''}
                                                onChange={handleInputChange}
                                                disabled={loading}
                                            />
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
                                                <th className="config-th-status text-start ps-3">Status</th>
                                                <th className="text-start ps-3">Time in Business</th>
                                                <th className="config-th">Subscore</th>
                                            </tr>
                                        </thead>
                                        <tbody className="fs-13">
                                            <tr>
                                                <td className="text-start ps-3 fw-semibold text-body">
                                                    {factorTierLabel('time_in_business', 1)}
                                                </td>
                                                <td className="text-start ps-3 fw-medium text-muted py-2">
                                                    <div className="d-flex align-items-center justify-content-start gap-1">
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
                                                <td className="text-start ps-3 fw-semibold text-body">
                                                    {factorTierLabel('time_in_business', 2)}
                                                </td>
                                                <td className="text-start ps-3 fw-medium text-muted py-2">
                                                    <div className="d-flex align-items-center justify-content-start gap-1">
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
                                                <td className="text-start ps-3 fw-semibold text-body">
                                                    {factorTierLabel('time_in_business', 3)}
                                                </td>
                                                <td className="text-start ps-3 fw-medium text-muted py-2">
                                                    <div className="d-flex align-items-center justify-content-start gap-1">
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
                                                <td className="text-start ps-3 fw-semibold text-body">
                                                    {factorTierLabel('time_in_business', 4)}
                                                </td>
                                                <td className="text-start ps-3 fw-medium text-muted py-2">
                                                    <div className="d-flex align-items-center justify-content-start gap-1">
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
                                                <td className="text-start ps-3 fw-semibold text-body">
                                                    {factorTierLabel('time_in_business', 5)}
                                                </td>
                                                <td className="text-start ps-3 fw-medium text-muted py-2">
                                                    <div className="d-flex align-items-center justify-content-start gap-1">
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
                    <div className="col-12 mt-4">
                        <div className="card shadow-none border mb-0">
                            <div className="card-header bg-light-subtle py-2">
                                <h6 className="card-title mb-0 fs-13 fw-semibold">Banking Relationships Subscores</h6>
                            </div>
                            <div className="card-body p-3">
                                <div className="table-responsive">
                                    <table className="table table-sm table-bordered mb-0 align-middle text-center">
                                        <thead className="table-light text-uppercase fs-11">
                                            <tr>
                                                <th className="config-th-status text-start ps-3">Status</th>
                                                <th className="text-start ps-3">Relationship Category</th>
                                                <th className="config-th-subscore">Subscore</th>
                                            </tr>
                                        </thead>
                                        <tbody className="fs-13">
                                            <tr>
                                                <td className="text-start ps-3 fw-semibold text-body">
                                                    {factorTierLabel('banking_relationships', 1)}
                                                </td>
                                                <td className="text-start ps-3 fw-medium text-muted py-2">
                                                    <div className="d-flex align-items-center flex-wrap gap-1">
                                                        <span className="fw-semibold text-primary">≥</span>
                                                        <input type="number" className="form-control form-control-sm text-center d-inline-block px-1 config-input config-input-xs" name="bank_strong_accounts" value={formData.bank_strong_accounts} onChange={handleInputChange} disabled={loading} />
                                                        <span>active business banking relationships, each &gt;</span>
                                                        <input type="number" className="form-control form-control-sm text-center d-inline-block px-1 config-input config-input-sm" name="bank_strong_months" value={formData.bank_strong_months} onChange={handleInputChange} disabled={loading} />
                                                        <span>months</span>
                                                    </div>
                                                </td>
                                                <td>
                                                    <input type="number" min="0" max="100" className="form-control form-control-sm text-center mx-auto config-input config-input-xl" name="bank_subscore_strong" value={formData.bank_subscore_strong} onChange={handleInputChange} disabled={loading} />
                                                </td>
                                            </tr>
                                            <tr>
                                                <td className="text-start ps-3 fw-semibold text-body">
                                                    {factorTierLabel('banking_relationships', 2)}
                                                </td>
                                                <td className="text-start ps-3 fw-medium text-muted py-2">
                                                    <div className="d-flex align-items-center flex-wrap gap-1">
                                                        <span className="fw-semibold text-primary">≥</span>
                                                        <input type="number" className="form-control form-control-sm text-center d-inline-block px-1 config-input config-input-xs" name="bank_established_accounts" value={formData.bank_established_accounts} onChange={handleInputChange} disabled={loading} />
                                                        <span>active business banking relationship &gt;</span>
                                                        <input type="number" className="form-control form-control-sm text-center d-inline-block px-1 config-input config-input-sm" name="bank_established_months" value={formData.bank_established_months} onChange={handleInputChange} disabled={loading} />
                                                        <span>months</span>
                                                    </div>
                                                </td>
                                                <td>
                                                    <input type="number" min="0" max="100" className="form-control form-control-sm text-center mx-auto config-input config-input-xl" name="bank_subscore_established" value={formData.bank_subscore_established} onChange={handleInputChange} disabled={loading} />
                                                </td>
                                            </tr>
                                            <tr>
                                                <td className="text-start ps-3 fw-semibold text-body">
                                                    {factorTierLabel('banking_relationships', 3)}
                                                </td>
                                                <td className="text-start ps-3 fw-medium text-muted py-2">
                                                    <div className="d-flex align-items-center flex-wrap gap-1">
                                                        <span className="fw-semibold text-primary">≥</span>
                                                        <input type="number" className="form-control form-control-sm text-center d-inline-block px-1 config-input config-input-xs" name="bank_basic_accounts" value={formData.bank_basic_accounts} onChange={handleInputChange} disabled={loading} />
                                                        <span>banking relationship only</span>
                                                    </div>
                                                </td>
                                                <td>
                                                    <input type="number" min="0" max="100" className="form-control form-control-sm text-center mx-auto config-input config-input-xl" name="bank_subscore_basic" value={formData.bank_subscore_basic} onChange={handleInputChange} disabled={loading} />
                                                </td>
                                            </tr>
                                            <tr>
                                                <td className="text-start ps-3 fw-semibold text-body">
                                                    {factorTierLabel('banking_relationships', 4)}
                                                </td>
                                                <td className="text-start ps-3 fw-medium text-muted py-2">
                                                    <div className="d-flex align-items-center flex-wrap gap-1">
                                                        <span className="fw-semibold text-primary">=</span>
                                                        <input type="number" className="form-control form-control-sm text-center d-inline-block px-1 config-input config-input-xs" name="bank_weak_accounts" value={formData.bank_weak_accounts} onChange={handleInputChange} disabled={loading} />
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
                                                <th className="config-th-status text-start ps-3">Status</th>
                                                <th className="text-start ps-3">Rule</th>
                                                <th className="config-th">Subscore</th>
                                            </tr>
                                        </thead>
                                        <tbody className="fs-13">
                                            <tr>
                                                <td className="text-start ps-3 fw-semibold text-body">
                                                    {factorTierLabel('tradeline_depth', 1)}
                                                </td>
                                                <td className="text-start ps-3 fw-medium text-muted py-2">
                                                    <div className="d-flex align-items-center flex-wrap gap-1">
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
                                                    </div>
                                                </td>
                                                <td>
                                                    <input type="number" min="0" max="100" className="form-control" name="trade_subscore_multiple_high" value={formData.trade_subscore_multiple_high} onChange={handleInputChange} disabled={loading} />
                                                </td>
                                            </tr>
                                            <tr>
                                                <td className="text-start ps-3 fw-semibold text-body">
                                                    {factorTierLabel('tradeline_depth', 2)}
                                                </td>
                                                <td className="text-start ps-3 fw-medium text-muted py-2">
                                                    <div className="d-flex align-items-center flex-wrap gap-1">
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
                                                    </div>
                                                </td>
                                                <td>
                                                    <input type="number" min="0" max="100" className="form-control" name="trade_subscore_good_depth" value={formData.trade_subscore_good_depth} onChange={handleInputChange} disabled={loading} />
                                                </td>
                                            </tr>
                                            <tr>
                                                <td className="text-start ps-3 fw-semibold text-body">
                                                    {factorTierLabel('tradeline_depth', 3)}
                                                </td>
                                                <td className="text-start ps-3 fw-medium text-muted py-2">
                                                    <div className="d-flex align-items-center flex-wrap gap-1">
                                                        <span className="fw-semibold text-primary">≥</span>
                                                        <input type="number" className="form-control form-control-sm text-center d-inline-block px-1 config-input config-input-xs" name="trade_rule_mod_accounts_min" value={formData.trade_rule_mod_accounts_min} onChange={handleInputChange} disabled={loading} />
                                                        <span>open accounts</span>
                                                    </div>
                                                </td>
                                                <td>
                                                    <input type="number" min="0" max="100" className="form-control" name="trade_subscore_moderate" value={formData.trade_subscore_moderate} onChange={handleInputChange} disabled={loading} />
                                                </td>
                                            </tr>
                                            <tr>
                                                <td className="text-start ps-3 fw-semibold text-body">
                                                    {factorTierLabel('tradeline_depth', 4)}
                                                </td>
                                                <td className="text-start ps-3 fw-medium text-muted py-2">
                                                    <div className="d-flex align-items-center flex-wrap gap-1">
                                                        <span>0 - {(Number(formData.trade_rule_mod_accounts_min) - 1) || 1} open accounts</span>
                                                    </div>
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

            {/* 5. Funding Readiness Bands Section */}
            <div className="border rounded-3 p-4 mb-4 bg-white shadow-sm">
                <div className="d-flex align-items-center gap-2 mb-3 border-bottom pb-2">
                    <span className="badge bg-primary-subtle text-primary fs-12 px-2.5 py-1.5 rounded-pill fw-semibold">5</span>
                    <div>
                        <h5 className="fs-14 fw-bold text-dark mb-0">Funding Readiness Bands</h5>
                        <p className="text-muted fs-12 mb-0">Configure score ranges and readiness labels.</p>
                    </div>
                </div>
                <div className="row g-4">
                    <div className="col-12">
                        <div className="card shadow-none border mb-0">
                            <div className="card-header bg-light-subtle py-2">
                                <h6 className="card-title mb-0 fs-13 fw-semibold">Readiness Score Ranges</h6>
                            </div>
                            <div className="card-body p-3">
                                <div className="table-responsive">
                                    <table className="table table-sm table-bordered mb-0 align-middle text-center">
                                        <thead className="table-light text-uppercase fs-11">
                                            <tr>
                                                <th className="text-start ps-3">Score Range</th>
                                                <th className="config-th-label">Label</th>
                                                <th className="config-th">Color</th>
                                            </tr>
                                        </thead>
                                        <tbody className="fs-13">
                                            {['a', 'b', 'c', 'd', 'e'].map((bucket, i) => {
                                                const prevMin = i > 0 ? Number(formData[`fund_readiness_bucket_${['a', 'b', 'c', 'd', 'e'][i - 1]}_min_score` as keyof FormData]) : null;
                                                const computedMax = prevMin ? prevMin - 1 : 0;
                                                const isFirst = i === 0;
                                                const isLast = i === 4;
                                                return (
                                                    <tr key={bucket}>
                                                        <td>
                                                            {isFirst ? (
                                                                <div className="d-flex align-items-center justify-content-start gap-1 ps-3">
                                                                    <input type="number" min="0" max="850" className="form-control form-control-sm text-center px-1 config-input config-input-lg" name={`fund_readiness_bucket_${bucket}_min_score`} value={formData[`fund_readiness_bucket_${bucket}_min_score` as keyof FormData] || ''} onChange={handleInputChange} disabled={loading} />
                                                                    <span className="text-muted fs-11 ms-1">or more</span>
                                                                </div>
                                                            ) : isLast ? (
                                                                <div className="d-flex align-items-center justify-content-start gap-1 ps-3">
                                                                    <input type="number" className="form-control form-control-sm text-center px-1 config-input config-input-lg" value={computedMax || 0} disabled />
                                                                    <span className="text-muted fs-11 ms-1">or less</span>
                                                                </div>
                                                            ) : (
                                                                <div className="d-flex align-items-center justify-content-start gap-1 ps-3">
                                                                    <input type="number" min="0" max="850" className="form-control form-control-sm text-center px-1 config-input config-input-lg" name={`fund_readiness_bucket_${bucket}_min_score`} value={formData[`fund_readiness_bucket_${bucket}_min_score` as keyof FormData] || ''} onChange={handleInputChange} disabled={loading} />
                                                                    <span className="text-muted fs-11">to</span>
                                                                    <input type="number" className="form-control form-control-sm text-center px-1 config-input config-input-lg" value={computedMax || 0} disabled />
                                                                </div>
                                                            )}
                                                        </td>
                                                        <td>
                                                            <input type="text" className="form-control form-control-sm" name={`fund_readiness_bucket_${bucket}_label`} value={formData[`fund_readiness_bucket_${bucket}_label` as keyof FormData] || ''} onChange={handleInputChange} disabled={loading} placeholder="e.g. Premium" />
                                                        </td>
                                                        <td className="text-center">
                                                            <input type="color" className="form-control form-control-color form-control-sm mx-auto" name={`fund_readiness_bucket_${bucket}_color`} value={formData[`fund_readiness_bucket_${bucket}_color` as keyof FormData] || '#000000'} onChange={handleInputChange} disabled={loading} />
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default FundingReadinessTab;
