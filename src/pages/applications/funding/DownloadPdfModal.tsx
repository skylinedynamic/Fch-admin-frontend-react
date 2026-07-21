import React, { useState, useEffect, useRef } from "react";
// @ts-ignore
import Modal from "bootstrap/js/dist/modal";
import { toast } from "react-toastify";

interface DownloadPdfModalProps {
  show: boolean;
  onHide: () => void;
  onDownload: (type: "application" | "signature" | "both", password?: string) => Promise<void>;
}

export default function DownloadPdfModal({ show, onHide, onDownload }: DownloadPdfModalProps) {
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const modalRef = useRef<HTMLDivElement>(null);
  const modalInstanceRef = useRef<Modal | null>(null);

  useEffect(() => {
    if (!modalRef.current) return;
    if (!modalInstanceRef.current) {
      modalInstanceRef.current = new Modal(modalRef.current, { backdrop: "static", keyboard: false });
    }
  }, []);

  useEffect(() => {
    const modal = modalInstanceRef.current;
    if (!modal) return;
    if (show) {
      modal.show();
      setPassword(generatePasswordString());
    } else {
      modal.hide();
    }
  }, [show]);

  const generatePasswordString = () => {
    const chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*";
    let p = "";
    for (let i = 0; i < 12; i++) p += chars.charAt(Math.floor(Math.random() * chars.length));
    return p;
  };

  const handleDownload = async () => {
    if (!password) { toast.error("Please enter a ZIP password"); return; }
    setLoading(true);
    try {
      await onDownload("both", password);
      onHide();
      resetState();
    } catch (error: any) {
      if (error.response?.data instanceof Blob) {
        const text = await error.response.data.text();
        try { toast.error(JSON.parse(text).message || "Failed to download"); } catch { toast.error("Failed to download"); }
      } else {
        toast.error(error.response?.data?.message || "Failed to download documents");
      }
    } finally { setLoading(false); }
  };

  const resetState = () => { setPassword(""); setLoading(false); };
  const handleClose = () => { if (!loading) { onHide(); resetState(); } };

  return (
    <div className="modal fade" ref={modalRef} tabIndex={-1} aria-hidden="true">
      <div className="modal-dialog modal-dialog-centered" style={{ maxWidth: "480px" }}>
        <div className="modal-content border-0 shadow-lg rounded-4">

          {/* Header */}
          <div className="modal-header border-0 px-4 pt-4 pb-2">
            <div className="d-flex align-items-center gap-3">
              <div className="avatar-sm flex-shrink-0">
                <div className="avatar-title bg-dark rounded-3">
                  <i className="ri-folder-zip-fill text-white fs-18"></i>
                </div>
              </div>
              <div>
                <h5 className="modal-title mb-0 fw-bold fs-16">Download All Documents</h5>
                <p className="text-muted fs-12 mb-0 mt-1">Packages both files into a single ZIP archive</p>
              </div>
            </div>
            <button type="button" className="btn-close" onClick={handleClose} disabled={loading}></button>
          </div>

          <div className="modal-body px-4 pb-0 pt-3">

            {/* Package Contents */}
            <div className="mb-3">
              <p className="text-uppercase text-muted fw-semibold fs-11 mb-2 letter-spacing-1">
                <i className="ri-archive-line me-1"></i> Package Contents
              </p>
              <div className="rounded-3 overflow-hidden border">
                <div className="d-flex align-items-center gap-3 px-3 py-3 bg-primary bg-opacity-10 border-bottom">
                  <div className="flex-shrink-0 text-primary fs-22">
                    <i className="ri-file-pdf-2-line"></i>
                  </div>
                  <div className="flex-grow-1 text-start">
                    <div className="fw-semibold fs-13 text-dark">Funding Application</div>
                    <div className="fs-12 text-muted">PDF Document · Includes all form data &amp; documents</div>
                  </div>
                  <span className="badge bg-primary fs-10 px-2 py-1">PDF</span>
                </div>
                <div className="d-flex align-items-center gap-3 px-3 py-3 bg-success bg-opacity-10">
                  <div className="flex-shrink-0 text-success fs-22">
                    <i className="ri-file-shield-2-line"></i>
                  </div>
                  <div className="flex-grow-1 text-start">
                    <div className="fw-semibold fs-13 text-dark">Signature Certificate</div>
                    <div className="fs-12 text-muted">PDF Document · Contains signed authorization</div>
                  </div>
                  <span className="badge bg-success fs-10 px-2 py-1">PDF</span>
                </div>
              </div>
            </div>

            {/* Security */}
            <div className="mb-3">
              <p className="text-uppercase text-muted fw-semibold fs-11 mb-2 letter-spacing-1">
                <i className="ri-shield-keyhole-line me-1"></i> ZIP Password Protection
              </p>
              <div className="border rounded-3 p-3">
                <div className="d-flex align-items-center gap-2 mb-3">
                  <span className="badge bg-warning-subtle text-warning border border-warning-subtle px-2 py-1">
                    <i className="ri-lock-fill me-1"></i> Required
                  </span>
                  <span className="fs-12 text-muted">The ZIP archive is always password protected</span>
                </div>
                <div className="input-group input-group-sm">
                  <span className="input-group-text bg-light"><i className="ri-key-line text-muted"></i></span>
                  <input type="text" className="form-control font-monospace"
                    placeholder="ZIP password" value={password} onChange={(e) => setPassword(e.target.value)} />
                  <button className="btn btn-dark btn-sm" type="button" onClick={() => setPassword(generatePasswordString())}>
                    <i className="ri-refresh-line me-1"></i> Generate
                  </button>
                </div>
                <div className="alert alert-warning py-2 px-3 mt-2 mb-0 rounded-2 d-flex align-items-start gap-2">
                  <i className="ri-information-line mt-1 flex-shrink-0"></i>
                  <span className="fs-12">The ZIP will be encrypted (AES-256). Share this password separately with the recipient — they need it to open any file inside.</span>
                </div>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="modal-footer border-0 px-4 pb-4 pt-2 d-flex gap-2 justify-content-end">
            <button type="button" className="btn btn-light" onClick={handleClose} disabled={loading}>
              Cancel
            </button>
            <button type="button" className="btn btn-dark px-4" onClick={handleDownload} disabled={loading}>
              {loading ? (
                <><span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>Generating ZIP...</>
              ) : (
                <><i className="ri-folder-zip-line me-1"></i> Download ZIP</>
              )}
            </button>
          </div>

        </div>
      </div>
    </div>
  );
}
