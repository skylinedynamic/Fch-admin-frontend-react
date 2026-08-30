import React, { useState } from 'react'
import { FILE_MANAGER_CONFIG } from '../../modules/filemanager/config'

interface NewFolderModalProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: (name: string) => void
}

export const NewFolderModal: React.FC<NewFolderModalProps> = ({ isOpen, onClose, onConfirm }) => {
  const [folderName, setFolderName] = useState('')
  const maxLength = FILE_MANAGER_CONFIG.MAX_NAME_LENGTH

  if (!isOpen) return null

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (folderName.trim() && folderName.length <= maxLength) {
      onConfirm(folderName.trim())
      setFolderName('')
      onClose()
    }
  }

  const handleClose = () => {
    setFolderName('')
    onClose()
  }

  return (
    <div className="fm-modal-overlay" onClick={handleClose}>
      <div className="fm-modal" onClick={(e) => e.stopPropagation()}>
        <div className="fm-modal-header">Create New Folder</div>
        <form onSubmit={handleSubmit}>
          <div className="fm-modal-body">
            <label className="fm-label">Folder Name</label>
            <input
              className="fm-input"
              type="text"
              value={folderName}
              onChange={(e) => setFolderName(e.target.value)}
              placeholder="Enter folder name"
              maxLength={maxLength}
              autoFocus
            />
            <div className="fm-char-counter">
              {folderName.length}/{maxLength} characters
            </div>
          </div>
          <div className="fm-modal-footer">
            <button type="button" className="fm-btn fm-btn-secondary" onClick={handleClose}>
              Cancel
            </button>
            <button type="submit" className="fm-btn fm-btn-primary" disabled={!folderName.trim() || folderName.length > maxLength}>
              Create
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

interface RenameModalProps {
  isOpen: boolean
  currentName: string
  onClose: () => void
  onConfirm: (newName: string) => void
}

export const RenameModal: React.FC<RenameModalProps> = ({ isOpen, currentName, onClose, onConfirm }) => {
  const [newName, setNewName] = useState(currentName)
  const maxLength = FILE_MANAGER_CONFIG.MAX_NAME_LENGTH

  React.useEffect(() => {
    setNewName(currentName)
  }, [currentName])

  if (!isOpen) return null

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (newName.trim() && newName !== currentName && newName.length <= maxLength) {
      onConfirm(newName.trim())
      onClose()
    }
  }

  const handleClose = () => {
    setNewName(currentName)
    onClose()
  }

  return (
    <div className="fm-modal-overlay" onClick={handleClose}>
      <div className="fm-modal" onClick={(e) => e.stopPropagation()}>
        <div className="fm-modal-header">Rename Item</div>
        <form onSubmit={handleSubmit}>
          <div className="fm-modal-body">
            <label className="fm-label">New Name</label>
            <input
              className="fm-input"
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="Enter new name"
              maxLength={maxLength}
              autoFocus
            />
            <div className="fm-char-counter">
              {newName.length}/{maxLength} characters
            </div>
          </div>
          <div className="fm-modal-footer">
            <button type="button" className="fm-btn fm-btn-secondary" onClick={handleClose}>
              Cancel
            </button>
            <button type="submit" className="fm-btn fm-btn-primary" disabled={!newName.trim() || newName === currentName || newName.length > maxLength}>
              Rename
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

interface DeleteConfirmDialogProps {
  isOpen: boolean
  itemCount: number
  onClose: () => void
  onConfirm: () => void
}

export const DeleteConfirmDialog: React.FC<DeleteConfirmDialogProps> = ({ isOpen, itemCount, onClose, onConfirm }) => {
  if (!isOpen) return null

  return (
    <div className="fm-modal-overlay" onClick={onClose}>
      <div className="fm-modal" onClick={(e) => e.stopPropagation()}>
        <div className="fm-modal-header">Confirm Delete</div>
        <div className="fm-modal-body">
          <p>Are you sure you want to delete {itemCount} {itemCount === 1 ? 'item' : 'items'}?</p>
          <p className="fm-delete-warning">This action cannot be undone.</p>
        </div>
        <div className="fm-modal-footer">
          <button className="fm-btn fm-btn-secondary" onClick={onClose}>
            Cancel
          </button>
          <button className="fm-btn fm-btn-danger" onClick={() => { onConfirm(); onClose(); }}>
            Delete
          </button>
        </div>
      </div>
    </div>
  )
}

interface UploadModalProps {
  isOpen: boolean
  onClose: () => void
  onUpload: (files: File[]) => void
  uploadProgress: number | null
  currentUploadingFile: string | null
  uploadComplete?: boolean
}

export const UploadModal: React.FC<UploadModalProps> = ({ isOpen, onClose, onUpload, uploadProgress, currentUploadingFile, uploadComplete }) => {
  const [isDragOver, setIsDragOver] = useState(false)
  const [selectedFiles, setSelectedFiles] = useState<File[]>([])
  const fileInputRef = React.useRef<HTMLInputElement>(null)
  const isUploading = uploadProgress !== null

  // Clear state when modal opens/closes
  React.useEffect(() => {
    if (!isOpen) {
      setSelectedFiles([])
    }
  }, [isOpen])

  if (!isOpen) return null

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(true)
  }

  const handleDragLeave = () => {
    setIsDragOver(false)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(false)
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const newFiles = Array.from(e.dataTransfer.files)
      setSelectedFiles(prev => {
        const uniqueNewFiles = newFiles.filter(newFile =>
          !prev.some(existingFile => existingFile.name === newFile.name)
        )
        return [...prev, ...uniqueNewFiles]
      })
    }
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const newFiles = Array.from(e.target.files)
      setSelectedFiles(prev => {
        const uniqueNewFiles = newFiles.filter(newFile =>
          !prev.some(existingFile => existingFile.name === newFile.name)
        )
        return [...prev, ...uniqueNewFiles]
      })
      // Reset input so same files can be selected again if needed (though we just added them)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  const handleClick = () => {
    fileInputRef.current?.click()
  }

  const removeFile = (index: number) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index))
  }

  const handleUploadClick = () => {
    if (selectedFiles.length > 0) {
      onUpload(selectedFiles)
    }
  }

  return (
    <div className="fm-modal-overlay" onClick={isUploading ? undefined : onClose}>
      <div className="fm-modal" onClick={(e) => e.stopPropagation()}>
        <div className="fm-modal-header">Upload Files</div>
        <div className="fm-modal-body">
          {uploadComplete ? (
            <div className="text-center py-5">
              <div className="mb-3">
                <svg className="w-16 h-16 mx-auto text-success" style={{ width: '64px', height: '64px', color: '#001f3f' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h5 className="mb-2" style={{ color: '#001f3f' }}>Files Uploaded Successfully</h5>
              <p className="text-muted">Your files have been added to the folder.</p>
            </div>
          ) : isUploading ? (
            <div className="fm-upload-area" style={{ borderColor: '#d4af37', backgroundColor: 'rgba(212, 175, 55, 0.05)' }}>
              <div className="spinner-border mb-3" role="status" style={{ color: '#001f3f' }}>
                <span className="visually-hidden">Loading...</span>
              </div>
              <h6 className="mb-2" style={{ color: '#001f3f' }}>Uploading {currentUploadingFile || 'file'}...</h6>
              <div className="progress w-75 mx-auto" style={{ height: '20px' }}>
                <div
                  className="progress-bar progress-bar-striped progress-bar-animated"
                  role="progressbar"
                  style={{ width: `${uploadProgress}%`, backgroundColor: '#001f3f' }}
                  aria-valuenow={uploadProgress || 0}
                  aria-valuemin={0}
                  aria-valuemax={100}
                >
                </div>
              </div>
            </div>
          ) : (
            <div
              className={`fm-upload-area ${isDragOver ? 'dragover' : ''}`}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={handleClick}
            >
              <svg className="fm-upload-area-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
              </svg>
              <p className="fm-upload-text-primary">
                Drag and drop files here
              </p>
              <p className="fm-upload-text-secondary">
                or click to browse
              </p>
            </div>
          )}

          <input
            ref={fileInputRef}
            type="file"
            multiple
            onChange={handleFileSelect}
            className="fm-file-input-hidden"
          />

          {!isUploading && !uploadComplete && selectedFiles.length > 0 && (
            <div className="mt-3">
              <h5 className="mb-2 text-sm font-medium">Selected Files ({selectedFiles.length})</h5>
              <div className="fm-upload-list" style={{ maxHeight: '150px', overflowY: 'auto' }}>
                {selectedFiles.map((file, index) => (
                  <div key={index} className="d-flex justify-content-between align-items-center p-2 mb-1 border rounded bg-light">
                    <span className="text-truncate small" style={{ maxWidth: '80%' }}>
                      {file.name} ({(file.size / 1024).toFixed(1)} KB)
                    </span>
                    <button
                      className="btn btn-sm btn-link text-danger p-0"
                      onClick={(e) => { e.stopPropagation(); removeFile(index); }}
                    >
                      &times;
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
        {!isUploading && !uploadComplete && (
          <div className="fm-modal-footer">
            <button className="fm-btn fm-btn-secondary me-auto" onClick={onClose}>
              Cancel
            </button>
            <button
              className="fm-btn fm-btn-primary"
              onClick={handleUploadClick}
              disabled={selectedFiles.length === 0}
            >
              Upload ({selectedFiles.length})
            </button>
          </div>
        )}
        {uploadComplete && (
          <div className="fm-modal-footer justify-content-center">
            <button className="fm-btn fm-btn-primary px-4" onClick={onClose}>
              Done
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

interface DuplicateFileModalProps {
  isOpen: boolean
  fileName: string
  onReplace: () => void
  onKeepBoth: () => void
  onCancel: () => void
}

export const DuplicateFileModal: React.FC<DuplicateFileModalProps> = ({
  isOpen,
  fileName,
  onReplace,
  onKeepBoth,
  onCancel
}) => {
  if (!isOpen) return null

  return (
    <div className="fm-modal-overlay">
      <div className="fm-modal" onClick={(e) => e.stopPropagation()}>
        <div className="fm-modal-header text-warning">Duplicate File Alert</div>
        <div className="fm-modal-body">
          <p>A file named <strong>{fileName}</strong> already exists in this folder.</p>
          <p className="text-muted mt-2 small">What would you like to do?</p>
        </div>
        <div className="fm-modal-footer">
          <button className="fm-btn fm-btn-secondary me-auto" onClick={onCancel}>
            Cancel
          </button>
          <div className="d-flex gap-2">
            <button className="fm-btn fm-btn-primary" onClick={onKeepBoth}>
              Keep Both
            </button>
            <button className="fm-btn fm-btn-danger" onClick={onReplace}>
              Replace
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
