import React, { useEffect, useRef } from 'react';
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

interface PaymentProvider {
    id: number;
    name: string;
    status: boolean;
}

interface PaymentMethodStatusModalProps {
    show: boolean;
    targetProvider: PaymentProvider | null;
    updating: boolean;
    onClose: () => void;
    onConfirm: () => void;
}

const PaymentMethodStatusModal: React.FC<PaymentMethodStatusModalProps> = ({
    show,
    targetProvider,
    updating,
    onClose,
    onConfirm
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
        <div className="modal fade flip" ref={modalRef} tabIndex={-1} aria-hidden="true">
            <div className="modal-dialog modal-dialog-centered">
                <div className="modal-content border-0 shadow-lg payment-method-modal-content">
                    <div className="modal-header border-bottom-0 p-4 pb-0">
                        <h5 className="modal-title fs-16 fw-semibold text-dark">Confirm Status Change</h5>
                        <button 
                            type="button" 
                            className="btn-close" 
                            onClick={onClose}
                            disabled={updating}
                            aria-label="Close"
                        ></button>
                    </div>
                    
                    <div className="modal-body p-4 pt-3">
                        {/* Alert Warning Box */}
                        <div className="alert alert-warning border-0 rounded-3 p-3 mb-4 d-flex align-items-start gap-2 text-start payment-method-alert-warning">
                            <i className="ri-error-warning-line fs-20 text-warning mt-1"></i>
                            <div>
                                <h6 className="alert-heading text-warning mb-1 fs-14 fw-semibold">Immediate Checkout Impact</h6>
                                <p className="text-muted mb-0 fs-12 leading-relaxed">
                                    Updating this gateway status will dynamically alter checkout availability for all active portal users.
                                </p>
                            </div>
                        </div>

                        {/* Gateway Transition Details Diagram */}
                        {targetProvider && (
                            <div className="text-center my-3 p-3 bg-light animate__animated animate__fadeIn payment-method-transition-box">
                                <h6 className="fs-14 fw-semibold mb-3 text-dark">{targetProvider.name} Status Transition</h6>
                                <div className="d-flex align-items-center justify-content-center gap-3">
                                    <div className="text-center">
                                        <span className="text-muted d-block fs-11 text-uppercase mb-1">Current State</span>
                                        <span className={`badge ${targetProvider.status ? 'bg-success-subtle text-success' : 'bg-danger-subtle text-danger'} fs-12 px-3 py-1.5`}>
                                            {targetProvider.status ? 'Enabled' : 'Disabled'}
                                        </span>
                                    </div>
                                    <div className="d-flex align-items-center justify-content-center bg-white rounded-circle shadow-sm payment-method-arrow-circle">
                                        <i className="ri-arrow-right-line fs-16 text-primary"></i>
                                    </div>
                                    <div className="text-center">
                                        <span className="text-muted d-block fs-11 text-uppercase mb-1">Target State</span>
                                        <span className={`badge ${targetProvider.status ? 'bg-danger-subtle text-danger' : 'bg-success-subtle text-success'} fs-12 px-3 py-1.5`}>
                                            {targetProvider.status ? 'Disabled' : 'Enabled'}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="modal-footer p-4 pt-0 border-top-0 d-flex justify-content-end gap-2">
                        <button
                            type="button"
                            className="btn btn-light payment-method-btn-round"
                            onClick={onClose}
                            disabled={updating}
                        >
                            Cancel
                        </button>
                        <button
                            type="button"
                            className={`btn ${targetProvider?.status ? 'btn-danger' : 'btn-primary'} payment-method-btn-round`}
                            onClick={onConfirm}
                            disabled={updating}
                        >
                            {updating ? (
                                <span className="spinner-border spinner-border-sm me-1" role="status" aria-hidden="true"></span>
                            ) : null}
                            {targetProvider?.status ? 'Disable Gateway' : 'Enable Gateway'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default PaymentMethodStatusModal;
