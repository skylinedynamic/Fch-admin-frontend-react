import { ACCESS_TIME } from '../../../../config/capitalAccessOptions';

interface TimeRange {
    start: string;
    end: string;
}

interface TimeSettings {
    morning: TimeRange;
    midday: TimeRange;
    afternoon: TimeRange;
    evening: TimeRange;
    anytime: TimeRange;
}

interface Props {
    timeSettings: TimeSettings;
    onChange: (settings: TimeSettings) => void;
    nextPlayDelay: string;
    onNextPlayDelayChange: (value: string) => void;
}

const GeneralSettingTab: React.FC<Props> = ({ timeSettings, onChange, nextPlayDelay, onNextPlayDelayChange }) => {
    const handleChange = (period: keyof TimeSettings, field: 'start' | 'end', value: string) => {
        onChange({
            ...timeSettings,
            [period]: { ...timeSettings[period], [field]: value },
        });
    };

    const format12Hour = (timeStr: string): string => {
        if (!timeStr) return '';
        const [hoursStr, minutesStr] = timeStr.split(':');
        const hours = parseInt(hoursStr, 10);
        if (isNaN(hours)) return timeStr;
        const ampm = hours >= 12 ? 'PM' : 'AM';
        const displayHours = hours % 12 === 0 ? 12 : hours % 12;
        const minutes = minutesStr ? `:${minutesStr}` : '';
        return `${displayHours}${minutes} ${ampm}`;
    };

    const periods: { key: keyof TimeSettings; label: string; icon: string }[] = [
        { key: 'morning', label: ACCESS_TIME.MORNING, icon: 'ri-sun-line' },
        { key: 'midday', label: ACCESS_TIME.MIDDAY, icon: 'ri-sun-fill' },
        { key: 'afternoon', label: ACCESS_TIME.AFTERNOON, icon: 'ri-sun-cloudy-line' },
        { key: 'evening', label: ACCESS_TIME.EVENING, icon: 'ri-moon-line' },
        { key: 'anytime', label: ACCESS_TIME.ANYTIME, icon: 'ri-time-line' },
    ];

    return (
        <div className="animate__animated animate__fadeIn">
            {/* Global General Settings Card */}
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
                        <p className="text-muted mb-0 fs-13">Configure general settings, time window intervals, and play progression delay</p>
                    </div>
                </div>

                {/* Section 1: Time Window Configurations */}
                <div className="mb-4">
                    <h5 className="fs-15 fw-semibold text-dark mb-1">Time Window Configurations</h5>
                    <p className="text-muted fs-13 mb-0">Define the start and end hours for Morning, Mid Day, and Evening sequences.</p>
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
                                        <small className="text-muted">
                                            {format12Hour(timeSettings[period.key].start)} – {format12Hour(timeSettings[period.key].end)}
                                        </small>
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

                <hr className="my-5 text-muted opacity-25" />

                {/* Section 2: Next Play Delay */}
                <div className="mb-4">
                    <h5 className="fs-15 fw-semibold text-dark mb-1">Next Play Delay</h5>
                    <p className="text-muted fs-13 mb-0">Define timing rules and cooling periods between successive plays.</p>
                </div>

                <div className="row g-4">
                    <div className="col-md-12">
                        <div className="border rounded-3 p-3 bg-light">
                            <h6 className="fs-14 fw-semibold text-dark mb-2">Cooling Period</h6>
                            <p className="text-muted fs-12 mb-3">
                                Set the cooling period (in days) required before a borrower can start a new play after completing another.
                            </p>
                            <div className="d-flex align-items-center gap-3">
                                <div className="flex-grow-1">
                                    <label className="form-label fs-12 fw-medium text-muted mb-1">Delay (Days)</label>
                                    <input
                                        type="number"
                                        min="0"
                                        className="form-control form-control-sm"
                                        value={nextPlayDelay}
                                        onChange={e => onNextPlayDelayChange(e.target.value)}
                                    />
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default GeneralSettingTab;
