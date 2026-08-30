import React from 'react';
import type { FormData } from '../ScoreCalculationConfigForm';

interface ApprovalProbabilityTabProps {
    formData: FormData;
    loading: boolean;
    handleInputChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => void;
    factorTierLabel: (slug: string, sortOrder: number) => string;
}

const ApprovalProbabilityTab: React.FC<ApprovalProbabilityTabProps> = ({
    formData,
    loading,
    handleInputChange,
    factorTierLabel,
}) => {
    return (
        <div className="animate__animated animate__fadeIn">
{/* Subscore metric tables */}
            <div className="border rounded-3 p-4 mb-4 bg-white shadow-sm">
                <div className="row g-4">
                    {/* FICO Above Play Minimum */}
                    <div className="col-lg-6">
                        <div className="card shadow-none border h-100 mb-0">
                            <div className="card-header bg-light-subtle py-2">
                                <h6 className="card-title mb-0 fs-13 fw-semibold">FICO Above Play Minimum</h6>
                            </div>
                            <div className="card-body p-3">
                                <div className="table-responsive">
                                    <table className="table table-sm table-bordered mb-0 align-middle text-center">
                                        <thead className="table-light text-uppercase fs-11">
                                            <tr>
                                                <th className="text-start ps-3">FICO Range</th>
                                                <th className="config-th-val">Modifier Value (Points)</th>
                                            </tr>
                                        </thead>
                                        <tbody className="fs-13">
                                            <tr>
                                                <td>
                                                    <div className="d-flex align-items-center justify-content-start gap-1 ps-3">
                                                        <input type="number" min="0" max="850" className="form-control form-control-sm text-center px-1 config-input config-input-lg" name="prob_fico_rule_t1" value={formData.prob_fico_rule_t1} onChange={handleInputChange} disabled={loading} />
                                                        <span className="text-muted fs-11 ms-1">or more points</span>
                                                    </div>
                                                </td>
                                                <td>
                                                    <input type="number" className="form-control form-control-sm text-center mx-auto config-input config-input-md" name="prob_fico_above_40" value={formData.prob_fico_above_40} onChange={handleInputChange} disabled={loading} />
                                                </td>
                                            </tr>
                                            <tr>
                                                <td>
                                                    <div className="d-flex align-items-center justify-content-start gap-1 ps-3">
                                                        <input type="number" min="0" max="850" className="form-control form-control-sm text-center px-1 config-input config-input-lg" name="prob_fico_rule_t2" value={formData.prob_fico_rule_t2} onChange={handleInputChange} disabled={loading} />
                                                        <span className="text-muted fs-11">to</span>
                                                        <input type="number" className="form-control form-control-sm text-center px-1 config-input config-input-lg" value={(Number(formData.prob_fico_rule_t1) - 1) || 39} disabled />
                                                        <span className="text-muted fs-11 ms-1">points</span>
                                                    </div>
                                                </td>
                                                <td>
                                                    <input type="number" className="form-control form-control-sm text-center mx-auto config-input config-input-md" name="prob_fico_above_20_39" value={formData.prob_fico_above_20_39} onChange={handleInputChange} disabled={loading} />
                                                </td>
                                            </tr>
                                            <tr>
                                                <td>
                                                    <div className="d-flex align-items-center justify-content-start gap-1 ps-3">
                                                        <input type="number" className="form-control form-control-sm text-center px-1 config-input config-input-lg" value="0" disabled />
                                                        <span className="text-muted fs-11">to</span>
                                                        <input type="number" className="form-control form-control-sm text-center px-1 config-input config-input-lg" value={(Number(formData.prob_fico_rule_t2) - 1) || 19} disabled />
                                                        <span className="text-muted fs-11 ms-1">points</span>
                                                    </div>
                                                </td>
                                                <td>
                                                    <input type="number" className="form-control form-control-sm text-center mx-auto config-input config-input-md" name="prob_fico_above_0_19" value={formData.prob_fico_above_0_19} onChange={handleInputChange} disabled={loading} />
                                                </td>
                                            </tr>
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Utilization */}
                    <div className="col-lg-6">
                        <div className="card shadow-none border h-100 mb-0">
                            <div className="card-header bg-light-subtle py-2">
                                <h6 className="card-title mb-0 fs-13 fw-semibold">Utilization</h6>
                            </div>
                            <div className="card-body p-3">
                                <div className="table-responsive">
                                    <table className="table table-sm table-bordered mb-0 align-middle text-center">
                                        <thead className="table-light text-uppercase fs-11">
                                            <tr>
                                                <th className="text-start ps-3">Utilization Range</th>
                                                <th className="config-th-val">Modifier Value (Points)</th>
                                            </tr>
                                        </thead>
                                        <tbody className="fs-13">
                                            <tr>
                                                <td>
                                                    <div className="d-flex align-items-center justify-content-start gap-1 ps-3">
                                                        <input type="number" className="form-control form-control-sm text-center px-1 config-input config-input-md" value="0" disabled />
                                                        <span className="text-muted fs-11">% to</span>
                                                        <input type="number" min="0" max="100" step="0.01" className="form-control form-control-sm text-center px-1 config-input config-input-md" name="prob_util_rule_t1" value={formData.prob_util_rule_t1} onChange={handleInputChange} disabled={loading} />
                                                        <span className="text-muted fs-11">%</span>
                                                    </div>
                                                </td>
                                                <td>
                                                    <input type="number" className="form-control form-control-sm text-center mx-auto config-input config-input-md" name="prob_util_0_5" value={formData.prob_util_0_5} onChange={handleInputChange} disabled={loading} />
                                                </td>
                                            </tr>
                                            <tr>
                                                <td>
                                                    <div className="d-flex align-items-center justify-content-start gap-1 ps-3">
                                                        <input type="number" className="form-control form-control-sm text-center px-1 config-input config-input-md" value={formData.prob_util_rule_t1 ? (Number(formData.prob_util_rule_t1) + 0.01).toFixed(2) : ''} disabled />
                                                        <span className="text-muted fs-11">% to</span>
                                                        <input type="number" min="0" max="100" step="0.01" className="form-control form-control-sm text-center px-1 config-input config-input-md" name="prob_util_rule_t2" value={formData.prob_util_rule_t2} onChange={handleInputChange} disabled={loading} />
                                                        <span className="text-muted fs-11">%</span>
                                                    </div>
                                                </td>
                                                <td>
                                                    <input type="number" className="form-control form-control-sm text-center mx-auto config-input config-input-md" name="prob_util_5_10" value={formData.prob_util_5_10} onChange={handleInputChange} disabled={loading} />
                                                </td>
                                            </tr>
                                            <tr>
                                                <td>
                                                    <div className="d-flex align-items-center justify-content-start gap-1 ps-3">
                                                        <input type="number" className="form-control form-control-sm text-center px-1 config-input config-input-md" value={formData.prob_util_rule_t2 ? (Number(formData.prob_util_rule_t2) + 0.01).toFixed(2) : ''} disabled />
                                                        <span className="text-muted fs-11">% to</span>
                                                        <input type="number" min="0" max="100" step="0.01" className="form-control form-control-sm text-center px-1 config-input config-input-md" name="prob_util_rule_t3" value={formData.prob_util_rule_t3} onChange={handleInputChange} disabled={loading} />
                                                        <span className="text-muted fs-11">%</span>
                                                    </div>
                                                </td>
                                                <td>
                                                    <input type="number" className="form-control form-control-sm text-center mx-auto config-input config-input-md" name="prob_util_10_20" value={formData.prob_util_10_20} onChange={handleInputChange} disabled={loading} />
                                                </td>
                                            </tr>
                                            <tr>
                                                <td>
                                                    <div className="d-flex align-items-center justify-content-start gap-1 ps-3">
                                                        <input type="number" className="form-control form-control-sm text-center px-1 config-input config-input-md" value={formData.prob_util_rule_t3 ? (Number(formData.prob_util_rule_t3) + 0.01).toFixed(2) : ''} disabled />
                                                        <span className="text-muted fs-11">% to</span>
                                                        <input type="number" min="0" max="100" step="0.01" className="form-control form-control-sm text-center px-1 config-input config-input-md" name="prob_util_rule_t4" value={formData.prob_util_rule_t4} onChange={handleInputChange} disabled={loading} />
                                                        <span className="text-muted fs-11">%</span>
                                                    </div>
                                                </td>
                                                <td>
                                                    <input type="number" className="form-control form-control-sm text-center mx-auto config-input config-input-md" name="prob_util_20_25" value={formData.prob_util_20_25} onChange={handleInputChange} disabled={loading} />
                                                </td>
                                            </tr>
                                            <tr>
                                                <td>
                                                    <div className="d-flex align-items-center justify-content-start gap-1 ps-3">
                                                        <input type="number" className="form-control form-control-sm text-center px-1 config-input config-input-md" value={formData.prob_util_rule_t4 ? (Number(formData.prob_util_rule_t4) + 0.01).toFixed(2) : ''} disabled />
                                                        <span className="text-muted fs-11">% or more</span>
                                                    </div>
                                                </td>
                                                <td>
                                                    <input type="number" className="form-control form-control-sm text-center mx-auto config-input config-input-md" name="prob_util_above_25" value={formData.prob_util_above_25} onChange={handleInputChange} disabled={loading} />
                                                </td>
                                            </tr>
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Recent Inquiries */}
                    <div className="col-lg-6">
                        <div className="card shadow-none border h-100 mb-0">
                            <div className="card-header bg-light-subtle py-2">
                                <h6 className="card-title mb-0 fs-13 fw-semibold">Recent Inquiries</h6>
                            </div>
                            <div className="card-body p-3">
                                <div className="table-responsive">
                                    <table className="table table-sm table-bordered mb-0 align-middle text-center">
                                        <thead className="table-light text-uppercase fs-11">
                                            <tr>
                                                <th className="text-start ps-3">Inquiries Range</th>
                                                <th className="config-th-val">Modifier Value (Points)</th>
                                            </tr>
                                        </thead>
                                        <tbody className="fs-13">
                                            <tr>
                                                <td>
                                                    <div className="d-flex align-items-center justify-content-start gap-1 ps-3">
                                                        <input type="number" className="form-control form-control-sm text-center px-1 config-input config-input-md" value="0" disabled />
                                                        <span className="text-muted fs-11">to</span>
                                                        <input type="number" className="form-control form-control-sm text-center px-1 config-input config-input-md" value={(Number(formData.prob_inquiries_rule_t2) - 1) || 2} disabled />
                                                        <span className="text-muted fs-11 ms-1">inquiries</span>
                                                    </div>
                                                </td>
                                                <td>
                                                    <input type="number" className="form-control form-control-sm text-center mx-auto config-input config-input-md" name="prob_inquiries_0_2" value={formData.prob_inquiries_0_2} onChange={handleInputChange} disabled={loading} />
                                                </td>
                                            </tr>
                                            <tr>
                                                <td>
                                                    <div className="d-flex align-items-center justify-content-start gap-1 ps-3">
                                                        <input type="number" min="0" max="50" className="form-control form-control-sm text-center px-1 config-input config-input-md" name="prob_inquiries_rule_t2" value={formData.prob_inquiries_rule_t2} onChange={handleInputChange} disabled={loading} />
                                                        <span className="text-muted fs-11">to</span>
                                                        <input type="number" className="form-control form-control-sm text-center px-1 config-input config-input-md" value={(Number(formData.prob_inquiries_rule_t1) - 1) || 4} disabled />
                                                        <span className="text-muted fs-11 ms-1">inquiries</span>
                                                    </div>
                                                </td>
                                                <td>
                                                    <input type="number" className="form-control form-control-sm text-center mx-auto config-input config-input-md" name="prob_inquiries_3_4" value={formData.prob_inquiries_3_4} onChange={handleInputChange} disabled={loading} />
                                                </td>
                                            </tr>
                                            <tr>
                                                <td>
                                                    <div className="d-flex align-items-center justify-content-start gap-1 ps-3">
                                                        <input type="number" min="0" max="50" className="form-control form-control-sm text-center px-1 config-input config-input-md" name="prob_inquiries_rule_t1" value={formData.prob_inquiries_rule_t1} onChange={handleInputChange} disabled={loading} />
                                                        <span className="text-muted fs-11 ms-1">or more inquiries</span>
                                                    </div>
                                                </td>
                                                <td>
                                                    <input type="number" className="form-control form-control-sm text-center mx-auto config-input config-input-md" name="prob_inquiries_above_5" value={formData.prob_inquiries_above_5} onChange={handleInputChange} disabled={loading} />
                                                </td>
                                            </tr>
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Banking Relationship */}
                    <div className="col-lg-6">
                        <div className="card shadow-none border h-100 mb-0">
                            <div className="card-header bg-light-subtle py-2">
                                <h6 className="card-title mb-0 fs-13 fw-semibold">Banking Relationship</h6>
                            </div>
                            <div className="card-body p-3">
                                <div className="table-responsive">
                                    <table className="table table-sm table-bordered mb-0 align-middle text-center">
                                        <thead className="table-light text-uppercase fs-11">
                                            <tr>
                                                <th className="text-start ps-3">Status</th>
                                                <th className="config-th-val">Modifier Value (Points)</th>
                                            </tr>
                                        </thead>
                                        <tbody className="fs-13">
                                            <tr>
                                                <td className="text-start ps-3 fw-semibold text-body">
                                                    {factorTierLabel('banking_relationships', 1)}
                                                </td>
                                                <td>
                                                    <input type="number" className="form-control form-control-sm text-center mx-auto config-input config-input-md" name="prob_banking_strong" value={formData.prob_banking_strong} onChange={handleInputChange} disabled={loading} />
                                                </td>
                                            </tr>
                                            <tr>
                                                <td className="text-start ps-3 fw-semibold text-body">
                                                    {factorTierLabel('banking_relationships', 2)}
                                                </td>
                                                <td>
                                                    <input type="number" className="form-control form-control-sm text-center mx-auto config-input config-input-md" name="prob_banking_moderate" value={formData.prob_banking_moderate} onChange={handleInputChange} disabled={loading} />
                                                </td>
                                            </tr>
                                            <tr>
                                                <td className="text-start ps-3 fw-semibold text-body">
                                                    {factorTierLabel('banking_relationships', 3)}
                                                </td>
                                                <td>
                                                    <input type="number" className="form-control form-control-sm text-center mx-auto config-input config-input-md" name="prob_banking_limited" value={formData.prob_banking_limited} onChange={handleInputChange} disabled={loading} />
                                                </td>
                                            </tr>
                                            <tr>
                                                <td className="text-start ps-3 fw-semibold text-body">
                                                    {factorTierLabel('banking_relationships', 4)}
                                                </td>
                                                <td>
                                                    <input type="number" className="form-control form-control-sm text-center mx-auto config-input config-input-md" name="prob_banking_none" value={formData.prob_banking_none} onChange={handleInputChange} disabled={loading} />
                                                </td>
                                            </tr>
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Tradeline Depth */}
                    <div className="col-lg-6">
                        <div className="card shadow-none border h-100 mb-0">
                            <div className="card-header bg-light-subtle py-2">
                                <h6 className="card-title mb-0 fs-13 fw-semibold">Tradeline Depth</h6>
                            </div>
                            <div className="card-body p-3">
                                <div className="table-responsive">
                                    <table className="table table-sm table-bordered mb-0 align-middle text-center">
                                        <thead className="table-light text-uppercase fs-11">
                                            <tr>
                                                <th className="text-start ps-3">Status</th>
                                                <th className="config-th-val">Modifier Value (Points)</th>
                                            </tr>
                                        </thead>
                                        <tbody className="fs-13">
                                            <tr>
                                                <td className="text-start ps-3 fw-semibold text-body">
                                                    {factorTierLabel('tradeline_depth', 1)}
                                                </td>
                                                <td>
                                                    <input type="number" className="form-control form-control-sm text-center mx-auto config-input config-input-md" name="prob_trade_multiple_high" value={formData.prob_trade_multiple_high} onChange={handleInputChange} disabled={loading} />
                                                </td>
                                            </tr>
                                            <tr>
                                                <td className="text-start ps-3 fw-semibold text-body">
                                                    {factorTierLabel('tradeline_depth', 2)}
                                                </td>
                                                <td>
                                                    <input type="number" className="form-control form-control-sm text-center mx-auto config-input config-input-md" name="prob_trade_good_depth" value={formData.prob_trade_good_depth} onChange={handleInputChange} disabled={loading} />
                                                </td>
                                            </tr>
                                            <tr>
                                                <td className="text-start ps-3 fw-semibold text-body">
                                                    {factorTierLabel('tradeline_depth', 3)}
                                                </td>
                                                <td>
                                                    <input type="number" className="form-control form-control-sm text-center mx-auto config-input config-input-md" name="prob_trade_moderate" value={formData.prob_trade_moderate} onChange={handleInputChange} disabled={loading} />
                                                </td>
                                            </tr>
                                            <tr>
                                                <td className="text-start ps-3 fw-semibold text-body">
                                                    {factorTierLabel('tradeline_depth', 4)}
                                                </td>
                                                <td>
                                                    <input type="number" className="form-control form-control-sm text-center mx-auto config-input config-input-md" name="prob_trade_thin" value={formData.prob_trade_thin} onChange={handleInputChange} disabled={loading} />
                                                </td>
                                            </tr>
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Revenue / Income */}
                    <div className="col-lg-6">
                        <div className="card shadow-none border h-100 mb-0">
                            <div className="card-header bg-light-subtle py-2">
                                <h6 className="card-title mb-0 fs-13 fw-semibold">Revenue / Income</h6>
                            </div>
                            <div className="card-body p-3">
                                <div className="table-responsive">
                                    <table className="table table-sm table-bordered mb-0 align-middle text-center">
                                        <thead className="table-light text-uppercase fs-11">
                                            <tr>
                                                <th className="text-start ps-3">Status</th>
                                                <th className="config-th-val">Modifier Value (Points)</th>
                                            </tr>
                                        </thead>
                                        <tbody className="fs-13">
                                            <tr>
                                                <td className="text-start ps-3 fw-semibold text-body">
                                                    {factorTierLabel('revenue_strength', 1)}
                                                </td>
                                                <td>
                                                    <input type="number" className="form-control form-control-sm text-center mx-auto config-input config-input-md" name="prob_revenue_strong" value={formData.prob_revenue_strong} onChange={handleInputChange} disabled={loading} />
                                                </td>
                                            </tr>
                                            <tr>
                                                <td className="text-start ps-3 fw-semibold text-body">
                                                    {factorTierLabel('revenue_strength', 2)}
                                                </td>
                                                <td>
                                                    <input type="number" className="form-control form-control-sm text-center mx-auto config-input config-input-md" name="prob_revenue_moderate" value={formData.prob_revenue_moderate} onChange={handleInputChange} disabled={loading} />
                                                </td>
                                            </tr>
                                            <tr>
                                                <td className="text-start ps-3 fw-semibold text-body">
                                                    {factorTierLabel('revenue_strength', 3)}
                                                </td>
                                                <td>
                                                    <input type="number" className="form-control form-control-sm text-center mx-auto config-input config-input-md" name="prob_revenue_limited" value={formData.prob_revenue_limited} onChange={handleInputChange} disabled={loading} />
                                                </td>
                                            </tr>
                                            <tr>
                                                <td className="text-start ps-3 fw-semibold text-body">
                                                    {factorTierLabel('revenue_strength', 4)}
                                                </td>
                                                <td>
                                                    <input type="number" className="form-control form-control-sm text-center mx-auto config-input config-input-md" name="prob_revenue_startup" value={formData.prob_revenue_startup} onChange={handleInputChange} disabled={loading} />
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
        </div>
    );
};

export default ApprovalProbabilityTab;
