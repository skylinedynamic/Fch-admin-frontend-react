import React, { useEffect, useRef, ReactNode } from 'react';
// bootstrap ships no type declarations for this subpath export
// @ts-expect-error -- untyped third-party module, typed manually below
import BootstrapModalCtor from 'bootstrap/js/dist/modal';

interface BootstrapModalOptions {
    backdrop?: boolean | 'static';
    keyboard?: boolean;
    focus?: boolean;
}
interface BootstrapModalInstance {
    show(relatedTarget?: HTMLElement): void;
    hide(): void;
    toggle(relatedTarget?: HTMLElement): void;
    dispose(): void;
}
interface BootstrapModalConstructor {
    new(element: Element, options?: BootstrapModalOptions): BootstrapModalInstance;
    getInstance(element: Element): BootstrapModalInstance | null;
    getOrCreateInstance(element: Element, options?: BootstrapModalOptions): BootstrapModalInstance;
}
const Modal = BootstrapModalCtor as BootstrapModalConstructor;

declare module 'react' {
    namespace JSX {
        interface IntrinsicElements {
            'lord-icon': React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement> & {
                src?: string;
                trigger?: string;
                colors?: string;
                delay?: string | number;
                target?: string;
            };
        }
    }
}

interface DynamicActionModalProps {
    show: boolean;
    title: string;
    description: ReactNode;
    warningText?: string;
    warningBgClass?: string;
    iconClass?: string;
    imgSrc?: string;
    confirmText?: string;
    cancelText?: string;
    confirmBtnClass?: string;
    onConfirm: () => void;
    onClose: () => void;
    loading?: boolean;
}

const DynamicActionModal: React.FC<DynamicActionModalProps> = ({
    show,
    title,
    description,
    warningText,
    warningBgClass = 'bg-light',
    iconClass = "ri-error-warning-line text-warning",
    imgSrc,
    confirmText = "Confirm",
    cancelText = "Cancel",
    confirmBtnClass = "btn-primary",
    onConfirm,
    onClose,
    loading
}) => {
    const modalRef = useRef<HTMLDivElement>(null);
    const modalInstanceRef = useRef<BootstrapModalInstance | null>(null);

    // Initialize Bootstrap Modal instance once
    useEffect(() => {
        if (!modalRef.current) return;
        if (!modalInstanceRef.current) {
            modalInstanceRef.current = new Modal(modalRef.current, {
                backdrop: 'static',
                keyboard: false,
            });
        }
    }, []);

    // Show/hide based on `show` prop
    useEffect(() => {
        const modal = modalInstanceRef.current;
        if (!modal) return;
        if (show) {
            modal.show();
        } else {
            modal.hide();
        }
    }, [show]);

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            const modal = modalInstanceRef.current;
            if (modal) {
                try {
                    modal.hide();
                    if (typeof modal.dispose === 'function') modal.dispose();
                } catch (_) { }
            }
            modalInstanceRef.current = null;
        };
    }, []);

    return (
        <div
            className="modal fade flip"
            ref={modalRef}
            tabIndex={-1}
            aria-hidden="true"
        >
            <div className="modal-dialog modal-dialog-centered">
                <div className="modal-content border-0 shadow-lg">
                    <div className="modal-body p-5 text-center">
                        {imgSrc ? (
                            <img src={imgSrc} alt="Modal Icon" className="mb-3 d-block mx-auto" style={{ height: '70px' }} />
                        ) : iconClass.includes('lord-icon') ? (
                            // @ts-ignore
                            <lord-icon
                                src={iconClass.replace('lord-icon:', '')}
                                trigger="loop"
                                colors="primary:#f06548,secondary:#f06548"
                                style={{ width: '90px', height: '90px' }}
                            ></lord-icon>
                        ) : (
                            <i className={`${iconClass} display-4 mb-3 d-block`}></i>
                        )}

                        <div className={`mt-${(imgSrc || iconClass.includes('lord-icon')) ? '4' : '2'} text-center`}>
                            <h4>{title}</h4>
                            <div className="text-muted fs-14 mb-3">
                                {description}
                            </div>

                            {warningText && (
                                <p className={`text-muted fs-13 mb-4 p-3 rounded text-start ${warningBgClass}`}>
                                    <i className="ri-information-line me-1 text-primary"></i>
                                    {warningText}
                                </p>
                            )}

                            <div className="hstack gap-2 justify-content-center">
                                <button
                                    type="button"
                                    className="btn btn-light fw-medium"
                                    onClick={onClose}
                                    disabled={loading}
                                >
                                    {cancelText}
                                </button>
                                <button
                                    type="button"
                                    className={`btn ${confirmBtnClass} fw-medium`}
                                    onClick={onConfirm}
                                    disabled={loading}
                                >
                                    {loading ? (
                                        <>
                                            <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                                            Processing...
                                        </>
                                    ) : (
                                        confirmText
                                    )}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default DynamicActionModal;
