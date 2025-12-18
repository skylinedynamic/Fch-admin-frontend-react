import React, { useEffect } from 'react';
import EmailComposeModal from './EmailComposeModal';
import ActivityCreateModal from './ActivityCreateModal';

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
            <EmailComposeModal />
            <ActivityCreateModal />
        </>
    );
}
