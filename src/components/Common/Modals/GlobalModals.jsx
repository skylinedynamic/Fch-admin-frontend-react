import React, { useEffect } from 'react';
import EmailComposeModal from './EmailComposeModal';
import ActivityCreateModal from './ActivityCreateModal';
import AgreementSignModal from './AgreementSignModal';

/**
 * GlobalModals - Container for all global modals used across the application
 * These modals can be triggered from anywhere in the app using Bootstrap's data-bs-toggle
 * or via the global window.showGlobalModal function
 */
export default function GlobalModals() {
    useEffect(() => {
        // Expose global helper to open modals programmatically if needed
        window.showGlobalModal = (modalId) => {
            const modalElement = document.getElementById(modalId);
            if (modalElement && window.bootstrap) {
                const modal = window.bootstrap.Modal.getOrCreateInstance(modalElement);
                modal.show();
            } else if (modalElement) {
                // Fallback for theme initialization
                const btn = document.createElement('button');
                btn.setAttribute('data-bs-toggle', 'modal');
                btn.setAttribute('data-bs-target', `#${modalId}`);
                btn.style.display = 'none';
                document.body.appendChild(btn);
                btn.click();
                document.body.removeChild(btn);
            }
        };

        window.hideGlobalModal = (modalId) => {
            const modalElement = document.getElementById(modalId);
            if (modalElement && window.bootstrap) {
                const modal = window.bootstrap.Modal.getInstance(modalElement);
                if (modal) modal.hide();
            }
        };

        return () => {
            delete window.showGlobalModal;
            delete window.hideGlobalModal;
        };
    }, []);

    return (
        <>
            {/* Spinner keyframe for AgreementSignModal */}
            <style>{`@keyframes asm-spin { to { transform: rotate(360deg); } }`}</style>
            <EmailComposeModal />
            <ActivityCreateModal />
            {/* Agreement sign modal — auto-shown for non-host partners that haven't signed */}
            <AgreementSignModal />
        </>
    );
}
