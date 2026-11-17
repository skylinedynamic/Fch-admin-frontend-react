import { STATUS_NOTE_VISIBILITY_TEXT } from '../../../../config/borrower';

interface StatusNoteVisibilityProps {
    checked: boolean;
    onChange: (checked: boolean) => void;
    disabled?: boolean;
}

/** "Visible to client" for a status note: off keeps it with the team (R3-BUG-016). */
export function StatusNoteVisibility({ checked, onChange, disabled }: StatusNoteVisibilityProps) {
    return (
        <div className="mt-2">
            <div className="form-check form-switch">
                <input
                    className="form-check-input"
                    type="checkbox"
                    id="status-note-visible"
                    checked={checked}
                    onChange={(e) => onChange(e.target.checked)}
                    disabled={disabled}
                />
                <label className="form-check-label" htmlFor="status-note-visible">
                    {STATUS_NOTE_VISIBILITY_TEXT.visibleLabel}
                </label>
            </div>
            <div className={`form-text ${checked ? 'text-warning' : ''}`}>
                {checked ? STATUS_NOTE_VISIBILITY_TEXT.visibleHint : STATUS_NOTE_VISIBILITY_TEXT.internalHint}
            </div>
        </div>
    );
}

interface LastStatusNoteProps {
    note: string;
    visibleToClient: boolean;
}

/** The note saved with the last change, read-only, and who could see it. */
export function LastStatusNote({ note, visibleToClient }: LastStatusNoteProps) {
    return (
        <div className="mb-3" data-testid="last-status-note">
            <div className="d-flex justify-content-between align-items-center mb-1">
                <span className="form-label text-muted mb-0">{STATUS_NOTE_VISIBILITY_TEXT.lastNoteLabel}</span>
                <span className={`badge ${visibleToClient ? 'bg-warning-subtle text-warning' : 'bg-secondary-subtle text-secondary'}`}>
                    {visibleToClient ? STATUS_NOTE_VISIBILITY_TEXT.visibleBadge : STATUS_NOTE_VISIBILITY_TEXT.internalBadge}
                </span>
            </div>
            <div className="p-2 bg-light rounded text-muted small" style={{ whiteSpace: 'pre-wrap' }}>{note}</div>
        </div>
    );
}
