import React from 'react';

export default function StatusAgentSection({
    formData,
    handleInputChange,
    handleAgentChange,
    users = []
}) {
    return (
        <>
            {/* Agent */}
            <div className="col-lg-4 col-12">
                <div className="mb-3">
                    <label htmlFor="agent" className="form-label">Agent</label>
                    <select
                        className="form-select"
                        id="agent"
                        name="agent"
                        value={formData.agent}
                        onChange={handleAgentChange}
                    >
                        <option value="">Select agent...</option>
                        {users.map((user) => (
                            <option key={user.id} value={user.id}>
                                {user.name}
                            </option>
                        ))}
                    </select>
                </div>
            </div>

            {/* Agent Email (Auto-filled) */}
            <div className="col-lg-4 col-12">
                <div className="mb-3">
                    <label htmlFor="agentEmail" className="form-label">E-mail</label>
                    <input
                        type="email"
                        className="form-control"
                        id="agentEmail"
                        name="agentEmail"
                        placeholder="Auto-filled"
                        value={formData.agentEmail}
                        readOnly
                    />
                </div>
            </div>

            {/* Agent Phone (Auto-filled) */}
            <div className="col-lg-4 col-12">
                <div className="mb-3">
                    <label htmlFor="agentPhone" className="form-label">Mobile</label>
                    <input
                        type="text"
                        className="form-control"
                        id="agentPhone"
                        name="agentPhone"
                        placeholder="Auto-filled"
                        value={formData.agentPhone}
                        readOnly
                    />
                </div>
            </div>

            {/* Partner Type - Moved here */}

        </>
    );
}
