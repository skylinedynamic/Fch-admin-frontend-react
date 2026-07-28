import React, { useState, useEffect, useRef } from "react";
// @ts-ignore
import Modal from "bootstrap/js/dist/modal";
import { toast } from "react-toastify";
import DynamicActionModal from "../../../components/Common/Modals/DynamicActionModal";
import "../../../../assets/css/funding-application.css";
import { PASSWORD_GENERATE_CHARS, PASSWORD_GENERATE_LENGTH } from "../../../config/appConfig";

interface DownloadPdfModalProps {
  show: boolean;
  onHide: () => void;
  onDownload: (type: "application" | "signature" | "both", password?: string) => Promise<void>;
}

export default function DownloadPdfModal({ show, onHide, onDownload }: DownloadPdfModalProps) {
  const [withPassword, setWithPassword] = useState(true);
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(true);
  const [loadingType, setLoadingType] = useState<"application" | "signature" | "both" | null>(null);
  const [isCopied, setIsCopied] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [pendingDownloadType, setPendingDownloadType] = useState<"application" | "signature" | "both" | null>(null);

  const modalRef = useRef<HTMLDivElement>(null);
  const modalInstanceRef = useRef<Modal | null>(null);
  const confirmModalRef = useRef<HTMLDivElement>(null);
  const confirmModalInstanceRef = useRef<Modal | null>(null);

  useEffect(() => {
    if (!modalRef.current) return;
    if (!modalInstanceRef.current) {
      modalInstanceRef.current = new Modal(modalRef.current, { backdrop: "static", keyboard: false });
    }
    if (confirmModalRef.current && !confirmModalInstanceRef.current) {
      confirmModalInstanceRef.current = new Modal(confirmModalRef.current, { backdrop: false, keyboard: false });
    }

    // Cleanup on unmount
    return () => {
      if (modalInstanceRef.current) {
        modalInstanceRef.current.dispose();
        modalInstanceRef.current = null;
      }
      if (confirmModalInstanceRef.current) {
        confirmModalInstanceRef.current.dispose();
        confirmModalInstanceRef.current = null;
      }
      document.querySelectorAll('.modal-backdrop').forEach(el => el.remove());
      document.body.classList.remove('modal-open');
      document.body.style.overflow = '';
      document.body.style.paddingRight = '';
    };
  }, []);

  useEffect(() => {
    const modal = modalInstanceRef.current;
    if (!modal) return;
    if (show) {
      modal.show();
      setWithPassword(true);
      setPassword(generatePasswordString());
      setShowPassword(true);
    } else {
      modal.hide();
      // Ensure backdrop is removed after hide animation completes
      setTimeout(() => {
        if (!show && !showConfirmModal) {
          document.querySelectorAll('.modal-backdrop').forEach(el => el.remove());
          document.body.classList.remove('modal-open');
          document.body.style.overflow = '';
          document.body.style.paddingRight = '';
        }
      }, 400);
    }
  }, [show]);

  useEffect(() => {
    const confirmModal = confirmModalInstanceRef.current;
    if (!confirmModal) return;
    if (showConfirmModal) {
      confirmModal.show();
    } else {
      confirmModal.hide();
    }
  }, [showConfirmModal]);

  const generatePasswordString = () => {
    const chars = PASSWORD_GENERATE_CHARS;
    let p = "";
    for (let i = 0; i < PASSWORD_GENERATE_LENGTH; i++) p += chars.charAt(Math.floor(Math.random() * chars.length));
    return p;
  };

  const handleCopy = () => {
    if (password) {
      navigator.clipboard.writeText(password);
      setIsCopied(true);
      toast.success("Password copied to clipboard");
      setTimeout(() => setIsCopied(false), 2000);
    }
  };

  const handleDownload = async (type: "application" | "signature" | "both") => {
    if (withPassword) {
      if (!password.trim()) { 
        toast.error("Please enter or generate a password"); 
        return; 
      }
      if (password.length < 8) {
        toast.error("Password must be at least 8 characters long");
        return;
      }
    } else {
      setPendingDownloadType(type);
      setShowConfirmModal(true);
      return;
    }
    await executeDownload(type);
  };

  const executeDownload = async (type: "application" | "signature" | "both") => {
    setLoadingType(type);
    try {
      await onDownload(type, withPassword ? password : undefined);
      onHide();
      resetState();
    } catch (error: any) {
      if (error.response?.data instanceof Blob) {
        const text = await error.response.data.text();
        try { toast.error(JSON.parse(text).message || "Failed to download"); } catch { toast.error("Failed to download"); }
      } else {
        toast.error(error.response?.data?.message || "Failed to download documents");
      }
    } finally { setLoadingType(null); }
  };

  const confirmDownloadWithoutPassword = () => {
    setShowConfirmModal(false);
    if (pendingDownloadType) {
      executeDownload(pendingDownloadType);
    }
  };

  const resetState = () => { setPassword(""); setLoadingType(null); setWithPassword(true); setShowConfirmModal(false); setPendingDownloadType(null); };
  const handleClose = () => { if (!loadingType) { onHide(); resetState(); } };

  return (
    <>
    <div className="modal fade flip" ref={modalRef} tabIndex={-1} aria-hidden="true">
      <div className="modal-dialog modal-dialog-centered modal-xl pdf-modal-dialog">
        <div className="modal-content border-0 shadow-lg pdf-modal-content">

          {/* Header */}
          <div className="modal-header px-4 py-4">
            <div className="d-flex align-items-center gap-3 w-100">
              <div className="flex-shrink-0 pdf-modal-header-icon">
                <i className="ri-folder-zip-fill text-white fs-22"></i>
              </div>
              <div className="flex-grow-1">
                <h5 className="modal-title mb-1 fw-bold text-dark fs-18">Download Documents</h5>
                <p className="text-muted fs-13 mb-0 pdf-modal-desc-text">Securely download your funding application and related documents compiled in a protected package.</p>
              </div>
              <button type="button" className="btn-close pdf-modal-close-btn" onClick={handleClose} disabled={loadingType !== null}></button>
            </div>
          </div>

          <div className="modal-body p-4 bg-white">
            <div className="row g-4">

              {/* Left — Package Contents */}
              <div className="col-md-5">
                <p className="text-uppercase fw-bold mb-3 d-flex align-items-center gap-2 pdf-modal-section-title">
                  <i className="ri-archive-line fs-14"></i> FUNDING DOCUMENTS
                </p>

                {/* Application Card */}
                <div className="d-flex flex-column p-3 mb-3 pdf-modal-card">
                  <div className="d-flex gap-3">
                    <div className="flex-shrink-0 pdf-modal-icon-dark">
                      <i className="ri-file-text-line text-white fs-20"></i>
                    </div>
                    <div className="flex-grow-1">
                      <div className="d-flex justify-content-between align-items-start mb-1">
                        <div className="fw-bold fs-14 text-dark">Funding Application</div>
                        <span className="badge rounded-1 pdf-modal-badge">PDF</span>
                      </div>
                      <div className="text-muted fs-13 lh-sm pdf-modal-desc-text">Completed funding application containing all submitted information.</div>
                    </div>
                  </div>
                </div>

                {/* Signature Card */}
                <div className="d-flex flex-column p-3 mb-3 pdf-modal-card-success">
                  <div className="d-flex gap-3">
                    <div className="flex-shrink-0 pdf-modal-icon-success">
                      <i className="ri-shield-check-line text-white fs-20"></i>
                    </div>
                    <div className="flex-grow-1">
                      <div className="d-flex justify-content-between align-items-start mb-1">
                        <div className="fw-bold fs-14 text-dark">Signature Certificate</div>
                        <span className="badge rounded-1 pdf-modal-badge-success">PDF</span>
                      </div>
                      <div className="text-muted fs-13 lh-sm pdf-modal-desc-text">Electronic signature and consent certificate for the applicant.</div>
                    </div>
                  </div>
                </div>

                {/* Notice Box */}
                <div className="d-flex gap-3 p-3 align-items-center pdf-modal-card">
                  <div className="flex-shrink-0 pdf-modal-notice-icon-bg">
                    <i className="ri-group-fill pdf-modal-notice-icon"></i>
                  </div>
                  <div className="text-muted fs-13 lh-sm pdf-modal-desc-text">
                    You can securely download and send this funding application and signature to the borrower's email.
                  </div>
                </div>
              </div>

              {/* Right — Security */}
              <div className="col-md-7">
                <p className="text-uppercase fw-bold mb-3 d-flex align-items-center gap-2 pdf-modal-section-title">
                  <i className="ri-shield-keyhole-line fs-14"></i> ZIP SECURITY
                </p>

                {/* Password Protected Option */}
                <div
                  onClick={() => { setWithPassword(true); if (!password) setPassword(generatePasswordString()); }}
                  className={`p-4 mb-3 pdf-modal-security-pw ${withPassword ? 'active' : ''}`}
                >
                  <div className="d-flex align-items-center gap-3 mb-2">
                    {/* Custom Radio Button */}
                    <div className={`pdf-modal-radio-dot ${withPassword ? 'active' : ''}`}></div>

                    <div className="d-flex align-items-center gap-2 flex-grow-1">
                      <i className="ri-lock-fill text-dark fs-18"></i>
                      <span className="fw-bold fs-15 text-dark">Password Protected</span>
                    </div>
                  </div>
                  <div className="text-muted fs-13 lh-base mb-4 pdf-modal-indent pdf-modal-desc-text">
                    ZIP file will be password protected.<br />The password is required to open and extract files.
                  </div>

                  {/* Password Controls */}
                  {withPassword && (
                    <div className="pdf-modal-indent" onClick={(e) => e.stopPropagation()}>
                      <div className="d-flex align-items-center bg-white mb-3 pdf-modal-pw-wrapper">
                        <div className="px-3 pdf-modal-pw-icon"><i className="ri-key-2-line fs-16"></i></div>
                        <input
                          type={showPassword ? "text" : "password"}
                          className="form-control border-0 shadow-none font-monospace fs-14 px-0 h-100 bg-white pdf-modal-pw-input"
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          spellCheck="false"
                          autoComplete="new-password"
                        />
                        <div className="d-flex h-100">
                          <button type="button" className="btn btn-link px-3 text-decoration-none rounded-0 h-100 pdf-modal-pw-btn" onClick={() => setShowPassword(!showPassword)}>
                            <i className={showPassword ? "ri-eye-line fs-16" : "ri-eye-off-line fs-16"}></i>
                          </button>
                          <button type="button" className="btn btn-link px-3 text-decoration-none rounded-0 h-100 pdf-modal-pw-btn" onClick={handleCopy} title="Copy password">
                            <i className={isCopied ? "ri-check-line fs-16 fw-bold text-success" : "ri-file-copy-line fs-16"}></i>
                          </button>
                          <button type="button" className="btn btn-link px-3 text-decoration-none rounded-0 h-100 pdf-modal-pw-btn" onClick={() => setPassword(generatePasswordString())} title="Generate new password">
                            <i className="ri-refresh-line fs-16"></i>
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Without Password Option */}
                <div
                  onClick={() => { setWithPassword(false); setPassword(""); }}
                  className={`p-4 pdf-modal-security-nopw ${!withPassword ? 'active' : ''}`}
                >
                  <div className="d-flex align-items-center gap-3 mb-2">
                    {/* Custom Radio Button */}
                    <div className={`pdf-modal-radio-dot ${!withPassword ? 'active' : ''}`}></div>

                    <div className="d-flex align-items-center gap-2">
                      <i className="ri-lock-unlock-line text-dark fs-18"></i>
                      <span className="fw-bold fs-15 text-dark">Without Password</span>
                    </div>
                  </div>
                  <div className="text-muted fs-13 lh-base pdf-modal-indent pdf-modal-desc-text">
                    ZIP file will not be password protected.<br />Anyone can open the ZIP file without a password.
                  </div>
                  <div className="pdf-modal-warning-text fs-13 lh-base pdf-modal-indent mt-2 fw-semibold">
                    <i className="ri-error-warning-line me-1"></i>
                    Warning: The package may contain confidential borrower information.
                  </div>
                </div>

              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="modal-footer border-top-0 px-4 py-4 mt-2 pdf-modal-footer d-flex justify-content-between gap-3">
            <button type="button" className="btn px-4 py-2 fw-semibold pdf-modal-btn-cancel text-nowrap" onClick={handleClose} disabled={loadingType !== null}>
              Cancel
            </button>
            <div className="d-flex gap-2 pdf-modal-download-actions">
              <button type="button" className="btn px-3 py-2 fw-semibold text-white d-flex align-items-center justify-content-center gap-2 pdf-modal-btn-download text-nowrap" onClick={() => handleDownload('application')} disabled={loadingType !== null}>
                {loadingType === 'application' ? (
                  <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>
                ) : (
                  <i className="ri-file-download-line fs-16"></i>
                )}
                Download Application
              </button>
              <button type="button" className="btn px-3 py-2 fw-semibold text-white d-flex align-items-center justify-content-center gap-2 pdf-modal-btn-download text-nowrap" onClick={() => handleDownload('signature')} disabled={loadingType !== null}>
                {loadingType === 'signature' ? (
                  <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>
                ) : (
                  <i className="ri-file-download-line fs-16"></i>
                )}
                Download Signature Certificate
              </button>
              <button type="button" className="btn px-3 py-2 fw-semibold text-white d-flex align-items-center justify-content-center gap-2 pdf-modal-btn-download text-nowrap" onClick={() => handleDownload('both')} disabled={loadingType !== null}>
                {loadingType === 'both' ? (
                  <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>
                ) : (
                  <i className="ri-download-2-line fs-16"></i>
                )}
                Download All ZIP
              </button>
            </div>
          </div>

        </div>
      </div>
    </div>
    
    {/* Custom Confirm Modal Backdrop */}
    {showConfirmModal && (
       <div className="modal-backdrop fade show" style={{ zIndex: 1059 }}></div>
    )}

    {/* Custom Confirm Modal */}
    <div className="modal fade zoomIn" id="confirmPdfModal" ref={confirmModalRef} tabIndex={-1} aria-hidden="true" style={{ zIndex: 1060 }}>
      <div className="modal-dialog modal-dialog-centered" style={{ maxWidth: '500px' }}>
        <div className="modal-content border-0 shadow-lg" style={{ borderRadius: '16px', overflow: 'hidden' }}>
          
          <div className="position-absolute top-0 end-0 p-3" style={{ zIndex: 10 }}>
            <button type="button" className="btn btn-sm btn-icon text-muted border-0 bg-transparent" onClick={(e) => { e.preventDefault(); e.stopPropagation(); setShowConfirmModal(false); }}>
              <i className="ri-close-line fs-24"></i>
            </button>
          </div>

          <div className="modal-body p-4 text-center">
            
            <div className="mx-auto mb-3 d-flex align-items-center justify-content-center" style={{ width: '72px', height: '72px', backgroundColor: '#fee2e2', borderRadius: '50%' }}>
              <div className="position-relative d-flex align-items-center justify-content-center" style={{ width: '40px', height: '40px' }}>
                <i className="ri-shield-fill text-danger position-absolute" style={{ fontSize: '44px' }}></i>
                <span className="text-white position-absolute fw-bold" style={{ fontSize: '22px', zIndex: 1, marginTop: '-2px' }}>!</span>
              </div>
            </div>
            
            <h4 className="mb-2 fw-bold text-dark">Download Without Password?</h4>
            <p className="text-muted fs-14 mb-4 px-3">You are about to download the ZIP package without password protection.</p>
            
            <div className="d-flex align-items-center gap-3 p-3 rounded-3 mb-3 text-start" style={{ backgroundColor: '#fef2f2', color: '#dc2626', border: '1px solid #fee2e2' }}>
              <i className="ri-error-warning-fill fs-18"></i>
              <div className="fs-13">
                <strong style={{ fontWeight: 600 }}>Security Risk:</strong> Your borrower's confidential information may be exposed.
              </div>
            </div>

            <ul className="text-start text-muted fs-13 lh-lg mb-4 ps-3 pe-2">
               <li>Anyone with the file can immediately view sensitive financial documents.</li>
               <li>Using a password ensures compliance with data security standards.</li>
            </ul>

            <div className="d-flex gap-3 p-3 rounded-3 text-start mb-3" style={{ backgroundColor: '#fffbeb', color: '#b45309' }}>
              <div className="mt-1"><i className="ri-lightbulb-flash-line fs-20" style={{ color: '#d97706' }}></i></div>
              <div className="fs-13 fw-semibold">
                We strongly recommend using password protection to keep borrower information safe and secure.
              </div>
            </div>

            <div className="d-flex gap-3 w-100 mt-2">
              <button type="button" className="btn fw-semibold py-2 w-50" style={{ backgroundColor: '#f3f4f6', color: '#111827' }} onClick={() => setShowConfirmModal(false)}>
                Cancel
              </button>
              <button type="button" className="btn btn-danger fw-semibold d-flex align-items-center justify-content-center gap-2 py-2 w-50" style={{ backgroundColor: '#ef4444', border: 'none' }} onClick={confirmDownloadWithoutPassword}>
                <i className="ri-download-2-line"></i> Yes, download
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
    </>
  );
}
