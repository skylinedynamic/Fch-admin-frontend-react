import { useState, type FormEvent } from 'react';
import { isAxiosError } from 'axios';
import { Dialog } from 'primereact/dialog';
import { toast } from 'react-toastify';
import { useOwnerReportSettings, useUpdateOwnerReportSettings, type OwnerReportSettings } from '../../../modules/owner-summary';
import { OWNER_REPORT_MAX_RECIPIENTS } from '../../../config/ownerSummary';
import { firstMessage } from './format';

const HTTP_UNPROCESSABLE = 422;
const TITLE_ID = 'owner-report-settings-title';
const FORM_ID = 'owner-report-settings-form';

type FieldErrors = Record<string, unknown>;

/** The form, mounted fresh on each opening so a cancelled edit is forgotten. */
function ReportSettingsForm({ saved, onDone, onSaving }: { saved: OwnerReportSettings; onDone: () => void; onSaving: (saving: boolean) => void }) {
    const [enabled, setEnabled] = useState(saved.enabled);
    const [rows, setRows] = useState<string[]>(saved.recipients.length ? saved.recipients : ['']);
    const [errors, setErrors] = useState<FieldErrors>({});
    const update = useUpdateOwnerReportSettings();

    const submit = (event: FormEvent) => {
        event.preventDefault();
        const recipients = rows.map((row) => row.trim()).filter(Boolean);
        // The rows now line up with the API's recipients.N errors.
        setRows(recipients.length ? recipients : ['']);
        setErrors({});
        onSaving(true);

        update.mutate({ enabled, recipients }, {
            onSuccess: ({ message }) => {
                toast.success(message);
                onDone();
            },
            onError: (error) => {
                if (isAxiosError(error) && error.response?.status === HTTP_UNPROCESSABLE) {
                    setErrors(error.response.data?.errors ?? {});
                }
            },
            onSettled: () => onSaving(false),
        });
    };

    const changeRow = (index: number, value: string) => {
        setRows(rows.map((row, i) => (i === index ? value : row)));
        setErrors(({ [`recipients.${index}`]: _edited, ...rest }) => rest);
    };

    const removeRow = (index: number) => {
        setRows(rows.filter((_, i) => i !== index));
        // Positions have moved, so what was said about them no longer lines up.
        setErrors({});
    };

    const listError = firstMessage(errors.recipients);

    return (
        <form id={FORM_ID} className="os-report" onSubmit={submit} noValidate>
            <label className="os-report__toggle">
                <span>
                    <strong>Send the weekly report</strong>
                    <span className="os-report__hint">Sundays at 10:00 AM ET, last week's numbers, PDF attached</span>
                </span>
                <input type="checkbox" checked={enabled} onChange={(event) => setEnabled(event.target.checked)} />
            </label>

            <div className="os-report__recipients">
                <div className="os-range__label" id="owner-report-recipients">Recipients</div>
                {rows.map((row, index) => {
                    const error = firstMessage(errors[`recipients.${index}`]);
                    return (
                        <div key={index} data-recipient={index}>
                            <div className="os-report__row">
                                <input
                                    type="email"
                                    className="os-field os-report__input"
                                    aria-label={`Recipient ${index + 1}`}
                                    aria-invalid={Boolean(error)}
                                    value={row}
                                    onChange={(event) => changeRow(index, event.target.value)}
                                />
                                {rows.length > 1 && (
                                    <button type="button" className="os-report__remove" aria-label={`Remove recipient ${index + 1}`} onClick={() => removeRow(index)}>
                                        <i className="ri-close-line" aria-hidden="true"></i>
                                    </button>
                                )}
                            </div>
                            {error && <div className="text-danger mt-1 small">{error}</div>}
                        </div>
                    );
                })}
                {listError && <div className="text-danger small">{listError}</div>}
                <button type="button" className="os-btn os-report__add" disabled={rows.length >= OWNER_REPORT_MAX_RECIPIENTS} onClick={() => setRows([...rows, ''])}>
                    + Add recipient
                </button>
                <span className="os-report__hint">Up to {OWNER_REPORT_MAX_RECIPIENTS} addresses.</span>
            </div>
        </form>
    );
}

/** Whether the owner's weekly report goes out, and to whom. */
export default function ReportSettingsModal({ visible, onHide }: { visible: boolean; onHide: () => void }) {
    const { data: saved, isLoading, isError } = useOwnerReportSettings(visible);
    const [saving, setSaving] = useState(false);

    return (
        <Dialog
            visible={visible}
            onHide={onHide}
            header={<span id={TITLE_ID}>Report settings</span>}
            aria-labelledby={TITLE_ID}
            className="os-page os-report-dialog"
            style={{ width: '520px', maxWidth: 'calc(100vw - 32px)' }}
            draggable={false}
            resizable={false}
            modal
            footer={saved && (
                <div className="os-report__footer">
                    <button type="button" className="os-btn" onClick={onHide}>Cancel</button>
                    <button type="submit" form={FORM_ID} className="os-btn os-btn--primary" disabled={saving}>Save settings</button>
                </div>
            )}
        >
            {isError && !saved && <p className="os-empty">Report settings could not be loaded. Please try again.</p>}
            {isLoading && <div className="os-skeleton" aria-busy="true"></div>}
            {saved && <ReportSettingsForm saved={saved} onDone={onHide} onSaving={setSaving} />}
        </Dialog>
    );
}
