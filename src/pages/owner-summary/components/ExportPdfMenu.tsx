import { useEffect, useId, useRef, useState, type KeyboardEvent } from 'react';
import { toast } from 'react-toastify';
import { useExportOwnerSummaryPdf, type OwnerSummaryParams } from '../../../modules/owner-summary';
import {
    OWNER_SUMMARY_EXPORT_FAILED,
    OWNER_SUMMARY_EXPORT_OPTIONS,
    type OwnerSummaryExportType,
} from '../../../config/ownerSummary';
import { downloadBlob } from '../../../utils/fileDownload';

const PDF_MIME = 'application/pdf';
const MENU_LABEL = 'Export PDF';

interface ExportPdfMenuProps {
    /** The period and payments on screen - the report is made for exactly these. */
    params: OwnerSummaryParams;
    disabled?: boolean;
}

/**
 * Business Insights › Export PDF: a menu of the summary report and the details
 * report, each made on the API (fch-api OwnerSummaryExportPdf) for the period
 * and payments on screen, and downloaded.
 */
export default function ExportPdfMenu({ params, disabled = false }: ExportPdfMenuProps) {
    const [open, setOpen] = useState(false);
    const wrapper = useRef<HTMLDivElement>(null);
    const firstItem = useRef<HTMLButtonElement>(null);
    const menuId = useId();
    const exportPdf = useExportOwnerSummaryPdf();

    useEffect(() => {
        if (!open) return undefined;
        firstItem.current?.focus();
        const closeOnOutside = (event: MouseEvent) => {
            if (wrapper.current && !wrapper.current.contains(event.target as Node)) setOpen(false);
        };
        document.addEventListener('mousedown', closeOnOutside);
        return () => document.removeEventListener('mousedown', closeOnOutside);
    }, [open]);

    const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
        if (event.key === 'Escape') {
            setOpen(false);
            return;
        }
        if (event.key !== 'ArrowDown' && event.key !== 'ArrowUp') return;
        const items = Array.from(wrapper.current?.querySelectorAll<HTMLButtonElement>('[role="menuitem"]') ?? []);
        const at = items.indexOf(document.activeElement as HTMLButtonElement);
        const next = event.key === 'ArrowDown' ? (at + 1) % items.length : (at - 1 + items.length) % items.length;
        items[next]?.focus();
        event.preventDefault();
    };

    const choose = (type: OwnerSummaryExportType) => {
        setOpen(false);
        exportPdf.mutate(
            { ...params, type },
            {
                onSuccess: ({ blob, filename }) => downloadBlob(blob, filename, PDF_MIME),
                onError: () => toast.error(OWNER_SUMMARY_EXPORT_FAILED),
            }
        );
    };

    const busy = exportPdf.isPending;

    return (
        <div className="os-menu-wrap" ref={wrapper} onKeyDown={onKeyDown}>
            <button
                type="button"
                className="os-btn os-btn--primary"
                aria-haspopup="menu"
                aria-expanded={open}
                aria-controls={open ? menuId : undefined}
                aria-busy={busy}
                onClick={() => setOpen((isOpen) => !isOpen)}
                disabled={disabled || busy}
            >
                {busy ? (
                    <span className="spinner-border spinner-border-sm" aria-hidden="true"></span>
                ) : (
                    <i className="ri-download-2-line" aria-hidden="true"></i>
                )}
                {MENU_LABEL}
                <i className={`ri-arrow-${open ? 'up' : 'down'}-s-line os-btn__caret`} aria-hidden="true"></i>
            </button>

            {open && (
                <div className="os-menu" role="menu" id={menuId} aria-label={MENU_LABEL}>
                    {OWNER_SUMMARY_EXPORT_OPTIONS.map((option, index) => (
                        <button
                            key={option.value}
                            ref={index === 0 ? firstItem : undefined}
                            type="button"
                            role="menuitem"
                            className="os-menu__item"
                            onClick={() => choose(option.value)}
                        >
                            <span className="os-menu__icon" aria-hidden="true"><i className={option.icon}></i></span>
                            <span className="os-menu__text">
                                <span className="os-menu__label">{option.label}</span>
                                <span className="os-menu__desc">{option.description}</span>
                            </span>
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
}
