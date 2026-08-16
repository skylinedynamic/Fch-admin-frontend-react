import React from 'react'
import type { FileEntry } from '../../types'

type DocumentUploadSectionProps = {
  sectionKey: string
  sectionIndex: number
  uploads: FileEntry[]
  uploading: boolean
  progress: number
  onAddFiles: (key: string, files: FileList | File[]) => void
  onRemoveFile: (key: string, name: string) => void
  onDrop: (e: React.DragEvent<HTMLDivElement>, key: string) => void
  acceptTypes: string
}

const fmtDocSize = (n: number) => {
  if (n >= 1024 * 1024) return `${(n / (1024 * 1024)).toFixed(1)} MB`
  if (n >= 1024) return `${(n / 1024).toFixed(1)} KB`
  return `${n} B`
}

const docIconFor = (t: string) => {
  if (t.startsWith('image/')) return 'ri-file-image-line'
  if (t === 'application/pdf') return 'ri-file-pdf-line'
  if (
    t === 'application/msword' ||
    t === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  )
    return 'ri-file-word-line'
  if (
    t === 'application/vnd.ms-excel' ||
    t === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  )
    return 'ri-file-excel-line'
  return 'ri-file-line'
}

export default function DocumentUploadSection({
  sectionKey,
  sectionIndex,
  uploads,
  uploading,
  progress,
  onAddFiles,
  onRemoveFile,
  onDrop,
  acceptTypes,
}: DocumentUploadSectionProps) {
  return (
    <>
      {uploading && (
        <div className="progress mb-2" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={progress}>
          <div
            className="progress-bar progress-bar-striped progress-bar-animated"
            style={{ width: `${progress}%` }}
          ></div>
        </div>
      )}
      <div
        className="dropzone dz-clickable text-center"
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => onDrop(e, sectionKey)}
        onClick={() => document.getElementById(`fund-file-${sectionIndex}`)?.click()}
      >
        <div className="dz-message needsclick">
          <div className="mb-3">
            <i className="display-4 text-muted ri-upload-cloud-2-fill"></i>
          </div>
          <h4>Drop files here or click to upload.</h4>
        </div>
        <input
          id={`fund-file-${sectionIndex}`}
          type="file"
          multiple
          accept={acceptTypes}
          className="d-none"
          onChange={(e) => e.target.files && onAddFiles(sectionKey, e.target.files)}
        />
      </div>
      <div className="mt-3 file-list">
        {uploads.map((f) => (
          <div className="item d-flex align-items-center justify-content-between py-2" key={f.name}>
            <div className="d-flex align-items-center">
              <i className={`${docIconFor(f.type)} fs-5 text-primary me-2`}></i>
              <div className="d-flex flex-column">
                <span className="name">{f.name}</span>
                <span className="meta">{fmtDocSize(f.size)}</span>
              </div>
            </div>
            <button
              type="button"
              className="btn btn-sm btn-outline-danger"
              aria-label="Remove file"
              onClick={() => onRemoveFile(sectionKey, f.name)}
            >
              <i className="ri-close-line"></i>
            </button>
          </div>
        ))}
        {uploads.length === 0 && <div className="text-muted">No files added yet</div>}
      </div>
    </>
  )
}
