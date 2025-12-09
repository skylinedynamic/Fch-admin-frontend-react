import React from 'react';

export default function DocumentChecklistSection() {
    return (
        <form>
            <div className="row">
                <div className="col-lg-6">
                    <h5 className="card-title mb-3">📑 Universal Required Documents</h5>
                    <div className="vstack gap-2">
                        <div className="form-check">
                            <input className="form-check-input" type="checkbox" id="docApplicationReceived" />
                            <label className="form-check-label" htmlFor="docApplicationReceived">Application Received</label>
                        </div>
                        <div className="form-check">
                            <input className="form-check-input" type="checkbox" id="docBankStatements" />
                            <label className="form-check-label" htmlFor="docBankStatements">Bank Statements (3 Months)</label>
                        </div>
                        <div className="form-check">
                            <input className="form-check-input" type="checkbox" id="docBusinessTaxReturns" />
                            <label className="form-check-label" htmlFor="docBusinessTaxReturns">Business Tax Returns</label>
                        </div>
                        <div className="form-check">
                            <input className="form-check-input" type="checkbox" id="docEINIRS" />
                            <label className="form-check-label" htmlFor="docEINIRS">EIN / IRS SS-4 Document</label>
                        </div>
                        <div className="form-check">
                            <input className="form-check-input" type="checkbox" id="docPnL" />
                            <label className="form-check-label" htmlFor="docPnL">Profit &amp; Loss / Balance Sheet</label>
                        </div>
                    </div>
                </div>
                <div className="col-lg-6">
                    <h5 className="card-title mb-3">📂 ENTITY &amp; VERIFICATION DOCUMENTS</h5>
                    <div className="vstack gap-2">
                        <div className="form-check">
                            <input className="form-check-input" type="checkbox" id="docDriversLicense" />
                            <label className="form-check-label" htmlFor="docDriversLicense">Driver's License</label>
                        </div>
                        <div className="form-check">
                            <input className="form-check-input" type="checkbox" id="docVoidedCheck" />
                            <label className="form-check-label" htmlFor="docVoidedCheck">Voided Check</label>
                        </div>
                        <div className="form-check">
                            <input className="form-check-input" type="checkbox" id="docArticlesOfIncorp" />
                            <label className="form-check-label" htmlFor="docArticlesOfIncorp">Articles of Incorporation</label>
                        </div>
                        <div className="form-check">
                            <input className="form-check-input" type="checkbox" id="docBusinessLicense" />
                            <label className="form-check-label" htmlFor="docBusinessLicense">Business License (if applicable)</label>
                        </div>
                        <div className="form-check">
                            <input className="form-check-input" type="checkbox" id="docOwnershipDocs" />
                            <label className="form-check-label" htmlFor="docOwnershipDocs">Ownership Docs (Operating Agmt / Bylaws)</label>
                        </div>
                    </div>
                </div>
            </div>
        </form>
    );
}
