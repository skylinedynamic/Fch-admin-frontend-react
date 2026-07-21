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
  const [showPassword, setShowPassword] = useState(true);
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
      setShowPassword(true);
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

  const handleCopy = () => {
    if (password) {
      navigator.clipboard.writeText(password);
      toast.success("Password copied to clipboard");
    }
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
      <div className="modal-dialog modal-dialog-centered modal-xl" style={{ maxWidth: "880px" }}>
        <div className="modal-content border-0 shadow-lg" style={{ fontFamily: "'Inter', sans-serif" }}>

          {/* Header */}
          <div className="modal-header px-4 py-4">
            <div className="d-flex align-items-center gap-3 w-100">
              <div className="flex-shrink-0" style={{ width: 48, height: 48, background: "#111827", borderRadius: 12, display: "flex", alignItems: "center", justifyContent: "center" }}>
                <i className="ri-folder-zip-fill text-white fs-22"></i>
              </div>
              <div className="flex-grow-1">
                <h5 className="modal-title mb-1 fw-bold text-dark fs-18">Download Documents</h5>
                <p className="text-muted fs-13 mb-0" style={{ color: "#64748b" }}>Borrower application, funding application and all information will be packaged into a secure ZIP file.</p>
              </div>
              <button type="button" className="btn-close" onClick={handleClose} disabled={loading} style={{ backgroundSize: "0.8em" }}></button>
            </div>
          </div>

          <div className="modal-body p-4 bg-white">
            <div className="row g-4">

              {/* Left — Package Contents */}
              <div className="col-md-5">
                <p className="text-uppercase fw-bold mb-3 d-flex align-items-center gap-2" style={{ fontSize: 11, letterSpacing: "1px", color: "#0f172a" }}>
                  <i className="ri-archive-line fs-14"></i> FUNDING DOCUMENTS
                </p>

                {/* Application Card */}
                <div className="d-flex flex-column p-3 mb-3" style={{ background: "#f8fafc", border: "1px solid #e2e8f0" }}>
                  <div className="d-flex gap-3">
                    <div className="flex-shrink-0" style={{ width: 44, height: 44, background: "#1e293b", borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center" }}>
                      <i className="ri-file-text-line text-white fs-20"></i>
                    </div>
                    <div className="flex-grow-1">
                      <div className="d-flex justify-content-between align-items-start mb-1">
                        <div className="fw-bold fs-14 text-dark">Borrower Application</div>
                        <span className="badge rounded-1" style={{ background: "#f1f5f9", color: "#0f172a", fontSize: 11, padding: "5px 12px", fontWeight: 600 }}>PDF</span>
                      </div>
                      <div className="text-muted fs-13 lh-sm" style={{ color: "#64748b" }}>Borrower application, funding application and with all information.</div>
                    </div>
                  </div>
                </div>

                {/* Signature Card */}
                <div className="d-flex flex-column p-3 mb-3" style={{ background: "#f0fdf4", border: "1px solid #bbf7d0" }}>
                  <div className="d-flex gap-3">
                    <div className="flex-shrink-0" style={{ width: 44, height: 44, background: "#16a34a", borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center" }}>
                      <i className="ri-shield-check-line text-white fs-20"></i>
                    </div>
                    <div className="flex-grow-1">
                      <div className="d-flex justify-content-between align-items-start mb-1">
                        <div className="fw-bold fs-14 text-dark">Signature Certificate</div>
                        <span className="badge rounded-1" style={{ background: "#f0fdf4", color: "#16a34a", fontSize: 11, padding: "5px 12px", fontWeight: 600 }}>PDF</span>
                      </div>
                      <div className="text-muted fs-13 lh-sm" style={{ color: "#64748b" }}>Signed authorization certificate based on borrower.</div>
                    </div>
                  </div>
                </div>

                {/* Notice Box */}
                <div className="d-flex gap-3 p-3 align-items-center" style={{ background: "#f8fafc", border: "1px solid #e2e8f0" }}>
                  <div className="flex-shrink-0" style={{ width: 36, height: 36, background: "#e0e7ff", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <i className="ri-group-fill" style={{ color: "#4338ca", fontSize: 16 }}></i>
                  </div>
                  <div className="text-muted fs-13 lh-sm" style={{ color: "#64748b" }}>
                    You can securely download and send this funding application and signature to the borrower's email.
                  </div>
                </div>
              </div>

              {/* Right — Security */}
              <div className="col-md-7">
                <p className="text-uppercase fw-bold mb-3 d-flex align-items-center gap-2" style={{ fontSize: 11, letterSpacing: "1px", color: "#0f172a" }}>
                  <i className="ri-shield-keyhole-line fs-14"></i> ZIP SECURITY
                </p>

                {/* Password Protected Option */}
                <div
                  onClick={() => { setWithPassword(true); if (!password) setPassword(generatePasswordString()); }}
                  className="p-4 mb-3"
                  style={{ 
                    cursor: "pointer", 
                    background: "#ffffff", 
                    border: withPassword ? "1px solid #0f172a" : "1px solid #e2e8f0",
                    transition: "all 0.2s ease" 
                  }}
                >
                  <div className="d-flex align-items-center gap-3 mb-2">
                    {/* Custom Radio Button */}
                    <div style={{
                      width: 22, height: 22, borderRadius: "50%", 
                      border: withPassword ? "7px solid #0f172a" : "2px solid #cbd5e1",
                      background: "#fff", flexShrink: 0,
                      transition: "all 0.2s ease"
                    }}></div>
                    
                    <div className="d-flex align-items-center gap-2 flex-grow-1">
                      <i className="ri-lock-fill text-dark fs-18"></i>
                      <span className="fw-bold fs-15 text-dark">Password Protected</span>
                    </div>
                  </div>
                  <div className="text-muted fs-13 lh-base mb-4" style={{ paddingLeft: "34px", color: "#64748b" }}>
                    ZIP file will be password protected.<br/>The password is required to open and extract files.
                  </div>

                  {/* Password Controls */}
                  {withPassword && (
                    <div style={{ paddingLeft: "34px" }} onClick={(e) => e.stopPropagation()}>
                      <div className="d-flex align-items-center bg-white mb-3" style={{ border: "1px solid #0f172a", borderRadius: 0, overflow: "hidden", height: 46 }}>
                        <div className="px-3" style={{ color: "#0f172a" }}><i className="ri-key-2-line fs-16"></i></div>
                        <input
                          type={showPassword ? "text" : "password"}
                          className="form-control border-0 shadow-none font-monospace fs-14 px-0 h-100 bg-white"
                          value={password}
                          style={{ color: "#0f172a", borderRadius: 0 }}
                          onChange={(e) => setPassword(e.target.value)}
                        />
                        <div className="d-flex h-100">
                          <button type="button" className="btn btn-link px-3 text-decoration-none rounded-0 h-100" style={{ borderLeft: "1px solid #0f172a", color: "#0f172a" }} onClick={() => setShowPassword(!showPassword)}>
                            <i className={showPassword ? "ri-eye-line fs-16" : "ri-eye-off-line fs-16"}></i>
                          </button>
                          <button type="button" className="btn btn-link px-3 text-decoration-none rounded-0 h-100" style={{ borderLeft: "1px solid #0f172a", color: "#0f172a" }} onClick={handleCopy}>
                            <i className="ri-clipboard-line fs-16"></i>
                          </button>
                          <button type="button" className="btn btn-link px-3 text-decoration-none rounded-0 h-100" style={{ borderLeft: "1px solid #0f172a", color: "#0f172a" }} onClick={() => setPassword(generatePasswordString())}>
                            <i className="ri-refresh-line fs-16"></i>
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Without Password Option */}
                <div
                  onClick={() => setWithPassword(false)}
                  className="p-4"
                  style={{ 
                    cursor: "pointer", 
                    background: "#ffffff", 
                    border: !withPassword ? "1px solid #0f172a" : "1px solid #e2e8f0",
                    transition: "all 0.2s ease" 
                  }}
                >
                  <div className="d-flex align-items-center gap-3 mb-2">
                    {/* Custom Radio Button */}
                    <div style={{
                      width: 22, height: 22, borderRadius: "50%", 
                      border: !withPassword ? "7px solid #0f172a" : "2px solid #cbd5e1",
                      background: "#fff", flexShrink: 0,
                      transition: "all 0.2s ease"
                    }}></div>

                    <div className="d-flex align-items-center gap-2">
                      <i className="ri-lock-unlock-line text-dark fs-18"></i>
                      <span className="fw-bold fs-15 text-dark">Without Password</span>
                    </div>
                  </div>
                  <div className="text-muted fs-13 lh-base" style={{ paddingLeft: "34px", color: "#64748b" }}>
                    ZIP file will not be password protected.<br/>Anyone can open the ZIP file without a password.
                  </div>
                </div>

              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="modal-footer border-top-0 px-4 py-4 mt-2" style={{ borderTop: "1px solid transparent" }}>
            <button type="button" className="btn px-4 py-2 fw-semibold" onClick={handleClose} disabled={loading} style={{ background: "#f1f5f9", border: "none", color: "#334155", fontSize: 14, borderRadius: "8px" }}>
              Cancel
            </button>
            <button type="button" className="btn px-4 py-2 fw-semibold text-white d-flex align-items-center gap-2" onClick={handleDownload} disabled={loading} style={{ background: "#0f172a", fontSize: 14, borderRadius: "8px", boxShadow: "0 4px 6px -1px rgba(15, 23, 42, 0.1), 0 2px 4px -1px rgba(15, 23, 42, 0.06)" }}>
              {loading ? (
                <><span className="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span></>
              ) : (
                <i className="ri-download-2-line fs-16"></i>
              )}
              Download ZIP
            </button>
          </div>

        </div>
      </div>
    </div>
  );
}
