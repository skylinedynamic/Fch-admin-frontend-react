import React, { useEffect, useRef } from 'react';

export default function DeleteConfirmationModal({ show, onConfirm, onClose, loading }) {
  const modalRef = useRef(null);
  useEffect(() => {
    if (!modalRef.current) return;
    const modal = new window.bootstrap.Modal(modalRef.current, {
      backdrop: 'static',
      keyboard: false,
    });

    if (show) {
      modal.show();
    } else {
      modal.hide();
    }
    return () => modal.hide();
  }, [show]);

  return (
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
                Deleting employees will remove all information.
              </p>
              <div className="hstack gap-2 justify-content-center remove">
                <button
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
}
