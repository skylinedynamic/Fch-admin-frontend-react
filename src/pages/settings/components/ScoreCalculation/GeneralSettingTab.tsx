import React from 'react';

interface TimeRange {
    start: string;
    end: string;
}

interface TimeSettings {
    morning: TimeRange;
    midday: TimeRange;
    evening: TimeRange;
}

interface Props {
    timeSettings: TimeSettings;
    onChange: (settings: TimeSettings) => void;
}

const GeneralSettingTab: React.FC<Props> = ({ timeSettings, onChange }) => {
    const handleChange = (period: keyof TimeSettings, field: 'start' | 'end', value: string) => {
        onChange({
            ...timeSettings,
            [period]: { ...timeSettings[period], [field]: value },
        });
    };

    const periods: { key: keyof TimeSettings; label: string; icon: string; desc: string }[] = [
        { key: 'morning', label: 'Morning', icon: 'ri-sun-line', desc: 'Early to late morning window' },
        { key: 'midday', label: 'Mid Day', icon: 'ri-sun-fill', desc: 'Noon to afternoon window' },
        { key: 'evening', label: 'Evening', icon: 'ri-moon-line', desc: 'Late afternoon to night window' },
    ];

    return (
        <div className="animate__animated animate__fadeIn">
            <div className="border rounded-3 p-4 mb-4 bg-white shadow-sm">
                <div className="d-flex align-items-center bg-primary-subtle rounded-3 p-3 mb-4">
                    <div className="flex-shrink-0 me-4">
                        <div className="avatar-md">
                            <div className="avatar-title bg-white rounded fs-24 text-primary">
                                <i className="ri-settings-4-line"></i>
                            </div>
                        </div>
                    </div>
                    <div className="flex-grow-1">
                        <h6 className="mb-1 text-dark fw-semibold fs-14">General Settings</h6>
                        <p className="text-muted mb-0 fs-13">Configure time ranges for Morning, Mid Day, and Evening periods</p>
                    </div>
                </div>

                <div className="row g-4">
                    {periods.map(period => (
                        <div key={period.key} className="col-md-4">
                            <div className="border rounded-3 p-3 h-100 bg-light">
                                <div className="d-flex align-items-center gap-2 mb-3">
                                    <span className="avatar-xs">
                                        <span className="avatar-title bg-primary-subtle text-primary rounded-circle fs-16">
                                            <i className={period.icon}></i>
                                        </span>
                                    </span>
                                    <div>
                                        <h6 className="mb-0 fs-14 fw-semibold">{period.label}</h6>
                                        <small className="text-muted">{period.desc}</small>
                                    </div>
                                </div>
                                <div className="d-flex align-items-center gap-2">
                                    <div className="flex-grow-1">
                                        <label className="form-label fs-12 fw-medium text-muted mb-1">Start</label>
                                        <input
                                            type="time"
                                            className="form-control form-control-sm"
                                            value={timeSettings[period.key].start}
                                            onChange={e => handleChange(period.key, 'start', e.target.value)}
                                        />
                                    </div>
                                    <div className="flex-shrink-0 pt-4">
                                        <span className="text-muted fw-bold">—</span>
                                    </div>
                                    <div className="flex-grow-1">
                                        <label className="form-label fs-12 fw-medium text-muted mb-1">End</label>
                                        <input
                                            type="time"
                                            className="form-control form-control-sm"
                                            value={timeSettings[period.key].end}
                                            onChange={e => handleChange(period.key, 'end', e.target.value)}
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default GeneralSettingTab;
