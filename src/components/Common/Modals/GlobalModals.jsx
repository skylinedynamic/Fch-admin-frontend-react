import React, { useEffect } from 'react';
import EmailComposeModal from './EmailComposeModal';
import ActivityCreateModal from './ActivityCreateModal';
import AgreementSignModal from './AgreementSignModal';
import { useAuthStore } from '../../../store/auth/authStore';

/**
 * GlobalModals - Container for all global modals used across the application
 * These modals can be triggered from anywhere in the app using Bootstrap's data-bs-toggle
 * or via the global window.showGlobalModal function
 */
export default function GlobalModals() {
    const { user } = useAuthStore();
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
            if (!modalElement) return;

            // The absolute safest way to close a Bootstrap modal in React without breaking
            // the backdrop loop is to simulate exactly what the user does: clicking the close button.
            // This forces Bootstrap's internal event loop to fire smoothly.
            const closeBtn = modalElement.querySelector('[data-bs-dismiss="modal"]');
            if (closeBtn) {
                closeBtn.click();
            } else if (window.bootstrap) {
                // Fallback if no button exists
                const modal = window.bootstrap.Modal.getOrCreateInstance(modalElement);
                modal.hide();
            } else if (window.jQuery && window.jQuery(`#${modalId}`).modal) {
                window.jQuery(`#${modalId}`).modal('hide');
            }

            // Still clean up summernote backdrops which are tricky
            setTimeout(() => {
                document.querySelectorAll('.note-modal-backdrop').forEach(el => el.remove());
                // DO NOT remove .note-modal because Summernote needs to reuse them! Just hide them.
                document.querySelectorAll('.note-modal').forEach(el => {
                    el.style.display = 'none';
                    el.classList.remove('show', 'in');
                });
                document.body.classList.remove('note-modal-open');

                // Final safety net for stuck backdrops only if NO modals are still open
                if (!document.querySelector('.modal.show')) {
                    document.querySelectorAll('.modal-backdrop').forEach(el => el.remove());
                    document.body.classList.remove('modal-open');
                    document.body.style.overflow = '';
                    document.body.style.paddingRight = '';
                }
            }, 400);
        };

        return () => {
            delete window.showGlobalModal;
            delete window.hideGlobalModal;
        };
    }, []);

    // Render directly in the DOM where Layout placed it.
    // Relies on Bootstrap's native stacking (z-index: 1055+) which naturally overrides theme sidebars
    return (
        <>
            {/* Spinner keyframe for AgreementSignModal */}
            <style>{`@keyframes asm-spin { to { transform: rotate(360deg); } }`}</style>
            <EmailComposeModal />
            <ActivityCreateModal />
            {Number(user?.is_host) == 0 && <AgreementSignModal />}
        </>
    );
}
