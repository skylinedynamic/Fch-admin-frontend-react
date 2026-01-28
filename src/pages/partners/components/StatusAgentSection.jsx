import React from 'react';
import { Dropdown } from 'primereact/dropdown';
import { PARTNER_STATUS } from '../../../config';

export default function StatusAgentSection({
    formData,
    handleInputChange,
    handleAgentChange,
    users = [],
    errors = {}
}) {
    // Transform users array to dropdown options with empty option
    const userOptions = [
        { label: 'Select Agent', value: '' },
        ...users.map(user => ({
            label: user.name,
            value: user.id
        }))
    ];

    // Add empty option to status
    const statusOptions = [
        { label: 'Select Status', value: '' },
        ...PARTNER_STATUS
    ];

    return (
        <div className="row">

            {/* Agent */}
            <div className="col-lg-4 col-12">
                <div className="mb-3">
                    <label className="form-label">Agent <span className="text-danger">*</span></label>
                    <Dropdown
                        value={formData.agent || ''}
                        options={userOptions || []}
                        onChange={(e) =>
                            handleAgentChange({ target: { name: 'agent', value: e.value } })
                        }
                        onBlur={() =>
                            handleInputChange({ target: { name: 'agent', value: formData.agent } })
                        }
                        optionLabel="label"
                        optionValue="value"
                        placeholder="Select agent..."
                        filter
                        className={`w-100 ${errors.agent ? 'p-invalid' : ''}`}
                    />
                    {errors.agent && (
                        <div className="invalid-feedback d-block">{errors.agent}</div>
                    )}
                </div>
            </div>

            {/* Email */}
            <div className="col-lg-4 col-12">
                <div className="mb-3">
                    <label className="form-label">E-mail</label>
                    <input
                        type="email"
                        className={`form-control bg-light ${errors.agentEmail ? 'is-invalid' : ''}`}
                        name="agentEmail"
                        placeholder="Auto-filled"
                        value={formData.agentEmail}
                        readOnly
                    />
                    {errors.agentEmail && (
                        <div className="invalid-feedback d-block">{errors.agentEmail}</div>
                    )}
                </div>
            </div>

            {/* Phone */}
            <div className="col-lg-4 col-12">
                <div className="mb-3">
                    <label className="form-label">Mobile</label>
                    <input
                        type="text"
                        className={`form-control bg-light ${errors.agentPhone ? 'is-invalid' : ''}`}
                        name="agentPhone"
                        placeholder="Auto-filled"
                        value={formData.agentPhone}
                        readOnly
                    />
                    {errors.agentPhone && (
                        <div className="invalid-feedback d-block">{errors.agentPhone}</div>
                    )}
                </div>
            </div>

            {/* Status */}
            <div className="col-lg-4 col-12">
                <div className="mb-3">
                    <label className="form-label">Status <span className="text-danger">*</span></label>
                    <Dropdown
                        value={formData.status || ''}
                        options={statusOptions || []}
                        onChange={(e) =>
                            handleInputChange({ target: { name: 'status', value: e.value } })
                        }
                        onBlur={() =>
                            handleInputChange({ target: { name: 'status', value: formData.status } })
                        }
                        optionLabel="label"
                        optionValue="value"
                        placeholder="Select status..."
                        className={`w-100 ${errors.status ? 'p-invalid' : ''}`}
                    />
                    {errors.status && (
                        <div className="invalid-feedback d-block">{errors.status}</div>
                    )}
                </div>
            </div>
        </div>
    );
}
