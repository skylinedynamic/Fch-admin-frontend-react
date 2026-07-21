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
  const [withPassword, setWithPassword] = useState(true);
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
      setWithPassword(true);
      setPassword(generatePasswordString());
    } else {
      modal.hide();
    }
  }, [show]);

  const generatePasswordString = () => {
    const chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*";
    let p = "";
    for (let i = 0; i < 14; i++) p += chars.charAt(Math.floor(Math.random() * chars.length));
    return p;
  };

  const handleDownload = async () => {
    if (withPassword && !password) { toast.error("Please enter or generate a ZIP password"); return; }
    setLoading(true);
    try {
      await onDownload("both", withPassword ? password : undefined);
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

  const resetState = () => { setPassword(""); setLoading(false); setWithPassword(true); };
  const handleClose = () => { if (!loading) { onHide(); resetState(); } };

  return (
    <div className="modal fade flip" ref={modalRef} tabIndex={-1} aria-hidden="true">
      <div className="modal-dialog modal-dialog-centered modal-lg">
        <div className="modal-content border-0 shadow-lg rounded-4">

          {/* Header */}
          <div className="modal-header border-bottom px-4 py-3">
            <div className="d-flex align-items-center gap-3">
              <div className="avatar-sm flex-shrink-0">
                <div className="avatar-title bg-dark rounded-3">
                  <i className="ri-folder-zip-fill text-white fs-18"></i>
                </div>
              </div>
              <div>
                <h5 className="modal-title mb-0 fw-semibold">Download Documents</h5>
                <p className="text-muted fs-12 mb-0 mt-1">Both PDFs will be packaged into a single ZIP archive</p>
              </div>
            </div>
            <button type="button" className="btn-close" onClick={handleClose} disabled={loading}></button>
          </div>

          <div className="modal-body p-4">
            <div className="row g-4">

              {/* Left — Package Contents */}
              <div className="col-md-5">
                <p className="text-uppercase fw-semibold text-muted mb-3" style={{ fontSize: 11, letterSpacing: "0.7px" }}>
                  <i className="ri-archive-line me-1"></i> Package Contents
                </p>

                {/* Application */}
                <div className="d-flex align-items-start gap-3 p-3 rounded-3 mb-2" style={{ background: "#EBF3FF", border: "1px solid #C7DEFF" }}>
                  <div className="avatar-sm flex-shrink-0">
                    <div className="avatar-title bg-primary rounded-3">
                      <i className="ri-file-text-line text-white fs-16"></i>
                    </div>
                  </div>
                  <div className="flex-grow-1">
                    <div className="fw-semibold fs-13 text-dark">Funding Application</div>
                    <div className="text-muted fs-12 mt-1">Borrower information &amp; all supporting documents</div>
                    <span className="badge bg-primary bg-opacity-10 text-primary border border-primary border-opacity-25 mt-2" style={{ fontSize: 10 }}>PDF</span>
                  </div>
                </div>

                {/* Signature */}
                <div className="d-flex align-items-start gap-3 p-3 rounded-3" style={{ background: "#EDFBF4", border: "1px solid #B9F0D5" }}>
                  <div className="avatar-sm flex-shrink-0">
                    <div className="avatar-title bg-success rounded-3">
                      <i className="ri-shield-check-line text-white fs-16"></i>
                    </div>
                  </div>
                  <div className="flex-grow-1">
                    <div className="fw-semibold fs-13 text-dark">Signature Certificate</div>
                    <div className="text-muted fs-12 mt-1">Signed authorization based on borrower</div>
                    <span className="badge bg-success bg-opacity-10 text-success border border-success border-opacity-25 mt-2" style={{ fontSize: 10 }}>PDF</span>
                  </div>
                </div>
              </div>

              {/* Right — Security */}
              <div className="col-md-7">
                <p className="text-uppercase fw-semibold text-muted mb-3" style={{ fontSize: 11, letterSpacing: "0.7px" }}>
                  <i className="ri-shield-keyhole-line me-1"></i> ZIP Security
                </p>

                {/* Option 1: Password Protected */}
                <div
                  onClick={() => { setWithPassword(true); if (!password) setPassword(generatePasswordString()); }}
                  className={`rounded-3 p-3 mb-2 ${withPassword ? "border border-dark" : "border"}`}
                  style={{ cursor: "pointer", background: withPassword ? "#f8f9fa" : "#fff", transition: "all 0.15s" }}
                >
                  <div className="d-flex align-items-center gap-2 mb-1">
                    <input
                      className="form-check-input mt-0 flex-shrink-0"
                      type="radio"
                      name="zipSecurity"
                      checked={withPassword}
                      onChange={() => { setWithPassword(true); if (!password) setPassword(generatePasswordString()); }}
                      onClick={(e) => e.stopPropagation()}
                      readOnly
                    />
                    <span className="fw-semibold fs-13 text-dark">
                      <i className="ri-lock-fill text-warning me-1"></i> Password Protected
                    </span>
                    <span className="badge bg-success ms-auto fs-10">Recommended</span>
                  </div>
                  <p className="text-muted fs-12 mb-0 ms-4">ZIP requires a password to open and extract files</p>

                  {/* Password input — shown when selected */}
                  {withPassword && (
                    <div className="mt-3" onClick={(e) => e.stopPropagation()}>
                      <div className="input-group">
                        <span className="input-group-text bg-white">
                          <i className="ri-key-2-line text-muted"></i>
                        </span>
                        <input
                          type="text"
                          className="form-control font-monospace fs-13 bg-white"
                          placeholder="Set a secure password"
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                        />
                        <button
                          className="btn btn-dark btn-sm"
                          type="button"
                          onClick={() => setPassword(generatePasswordString())}
                        >
                          <i className="ri-refresh-line me-1"></i> Generate
                        </button>
                      </div>
                      <div className="d-flex align-items-start gap-2 mt-2 p-2 rounded-2 border border-warning border-opacity-50" style={{ background: "#FFFBEB" }}>
                        <i className="ri-information-line text-warning mt-1 flex-shrink-0" style={{ fontSize: 13 }}></i>
                        <span className="fs-12 text-warning-emphasis">
                          Share this password with the recipient separately — they need it to extract and open the documents.
                        </span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Option 2: Without Password */}
                <div
                  onClick={() => setWithPassword(false)}
                  className={`rounded-3 p-3 ${!withPassword ? "border border-secondary" : "border"}`}
                  style={{ cursor: "pointer", background: !withPassword ? "#f8f9fa" : "#fff", transition: "all 0.15s" }}
                >
                  <div className="d-flex align-items-center gap-2 mb-1">
                    <input
                      className="form-check-input mt-0 flex-shrink-0"
                      type="radio"
                      name="zipSecurity"
                      checked={!withPassword}
                      onChange={() => setWithPassword(false)}
                      onClick={(e) => e.stopPropagation()}
                      readOnly
                    />
                    <span className="fw-semibold fs-13 text-dark">
                      <i className="ri-lock-unlock-line text-muted me-1"></i> Without Password
                    </span>
                  </div>
                  <p className="text-muted fs-12 mb-0 ms-4">ZIP can be opened by anyone without a password</p>
                </div>

              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="modal-footer border-top px-4 py-3 gap-2">
            <button type="button" className="btn btn-light px-4" onClick={handleClose} disabled={loading}>
              Cancel
            </button>
            <button type="button" className="btn btn-dark px-4" onClick={handleDownload} disabled={loading}>
              {loading ? (
                <><span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>Generating ZIP...</>
              ) : (
                <><i className="ri-folder-zip-line me-2"></i>Download ZIP</>
              )}
            </button>
          </div>

        </div>
      </div>
    </div>
  );
}
