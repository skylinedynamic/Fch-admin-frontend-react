import React, { useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import Modal from 'bootstrap/js/dist/modal'

interface DeleteConfirmationModalProps {
  show: boolean
  onConfirm: () => void
  onClose: () => void
  loading?: boolean
  text?: string
}

export default function DeleteConfirmationModal({ 
  show, 
  onConfirm, 
  onClose, 
  loading = false, 
  text 
}: DeleteConfirmationModalProps) {
  const modalRef = useRef<HTMLDivElement>(null)
  const modalInstanceRef = useRef<Modal | null>(null)

  // Initialize Bootstrap Modal instance once
  useEffect(() => {
    if (!modalRef.current) return
    if (!modalInstanceRef.current) {
      modalInstanceRef.current = new Modal(modalRef.current, {
        backdrop: 'static',
        keyboard: false,
      })
      
      // Prevent Bootstrap from adding classes to body that break layout
      modalRef.current.addEventListener('show.bs.modal', () => {
        // Remove body classes that Bootstrap adds which can break layout
        setTimeout(() => {
          document.body.classList.remove('modal-open')
          document.body.style.overflow = ''
          document.body.style.paddingRight = ''
        }, 10)
      })
      
      modalRef.current.addEventListener('shown.bs.modal', () => {
        // Ensure backdrop is properly positioned
        const backdrop = document.querySelector('.modal-backdrop')
        if (backdrop instanceof HTMLElement) {
          backdrop.style.position = 'fixed'
          backdrop.style.top = '0'
          backdrop.style.left = '0'
          backdrop.style.width = '100vw'
          backdrop.style.height = '100vh'
          backdrop.style.zIndex = '1050'
        }
      })
    }
  }, [])

  // Show/hide based on show prop
  useEffect(() => {
    const modal = modalInstanceRef.current
    if (!modal) return
    
    if (show) {
      modal.show()
    } else {
      modal.hide()
      // Clean up any remaining backdrop
      setTimeout(() => {
        const backdrops = document.querySelectorAll('.modal-backdrop')
        backdrops.forEach(el => el.remove())
      }, 300)
    }
  }, [show])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      const modal = modalInstanceRef.current
      if (modal) {
        try {
          modal.hide()
          if (typeof modal.dispose === 'function') modal.dispose()
        } catch (_) { }
      }
      modalInstanceRef.current = null
      
      // Clean up any remaining backdrops and restore body
      setTimeout(() => {
        const backdrops = document.querySelectorAll('.modal-backdrop')
        backdrops.forEach(el => el.remove())
        document.body.classList.remove('modal-open')
        document.body.style.overflow = ''
        document.body.style.paddingRight = ''
      }, 100)
    }
  }, [])

  const modalContent = (
    <div
      className="modal fade flip"
      ref={modalRef}
      tabIndex={-1}
      aria-hidden="true"
      style={{ zIndex: 1055 }}
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
                {text || "Deleting this item will remove all information."}
              </p>
              <div className="hstack gap-2 justify-content-center remove">
                <button
                  className="btn btn-light fw-medium"
                  onClick={onClose}
                  disabled={loading}
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
  )

  if (typeof document === 'undefined') return null

  return createPortal(modalContent, document.body)
}
