import React, { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import Modal from 'bootstrap/js/dist/modal';
import { clearStrayModalBackdrops } from '../../../utils/modalBackdrop';

export default function DeleteConfirmationModal({ show, onConfirm, onClose, loading, text }) {
  const modalRef = useRef(null);
  const modalInstanceRef = useRef(null);

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
      // Stray backdrops only. Unmounting while another modal is still open used
      // to delete that modal's overlay too, leaving it over an undimmed,
      // still-scrollable page.
      clearStrayModalBackdrops();
    };
  }, []);

  const modalContent = (
    <div
      className="modal fade flip"
      ref={modalRef}
      tabIndex="-1"
      aria-hidden="true"
    >
      <div className="modal-dialog modal-dialog-centered">
        <div className="modal-content">
          <div className="modal-body p-5 text-center">
            <lord-icon
              src="https://cdn.lordicon.com/gsqxdxog.json"
              trigger="loop"
              colors="primary:#405189,secondary:#f06548"
              style={{ width: '90px', height: '90px' }}
            ></lord-icon>
            <div className="mt-4 text-center">
              <h4>Are you sure?</h4>
              <p className="text-muted fs-15 mb-4">
                {text || "Deleting employees will remove all information."}
              </p>
              <div className="hstack gap-2 justify-content-center remove">
                <button
                  type="button"
                  className="btn btn-link link-success fw-medium"
                  onClick={onClose}
                  disabled={loading} // optional: disable close while loading
                >
                  Close
                </button>
                <button
                  type="button"
                  className="btn btn-danger"
                  onClick={onConfirm}
                  disabled={loading}
                >
                  {loading ? (
                    <>
                      <span
                        className="spinner-border spinner-border-sm me-2"
                        role="status"
                        aria-hidden="true"
                      ></span>
                      Deleting...
                    </>
                  ) : (
                    'Yes, Delete It'
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  if (typeof document === 'undefined') return null;
  return createPortal(modalContent, document.body);
}
