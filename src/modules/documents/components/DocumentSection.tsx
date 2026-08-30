import React from 'react'
import { Collapse } from 'reactstrap'
import type { FileSystemItem } from '../../../pages/filemanager/types'
import {
  PdfIcon,
  WordIcon,
  ExcelIcon,
  PowerPointIcon,
  ImageIcon,
  VideoIcon,
  AudioIcon,
  ArchiveIcon,
  CodeIcon,
  TextIcon,
  FileIcon,
  getFileIcon
} from '../../../components/FileManagerModal/Icons'

interface DocumentSectionProps {
  section: string
  files: FileSystemItem[]
  isOpen: boolean
  onToggle: () => void
  onOpenFileManager: (section: string, selectionMode: boolean) => void
  onRemoveFile?: (section: string, filePath: string) => void
}

export const DocumentSection: React.FC<DocumentSectionProps> = ({
  section,
  files,
  isOpen,
  onToggle,
  onOpenFileManager,
  onRemoveFile
}) => {
  const fmtSize = (n: number) => {
    if (n >= 1024 * 1024) return `${(n / (1024 * 1024)).toFixed(1)} MB`
    if (n >= 1024) return `${(n / 1024).toFixed(1)} KB`
    return `${n} B`
  }

  const renderFileIcon = (file: FileSystemItem) => {
    const iconType = getFileIcon(file.name, file.type)
    const iconClass = "file-type-icon"

    switch (iconType) {
      case 'pdf':
        return <PdfIcon className={iconClass} />
      case 'word':
        return <WordIcon className={iconClass} />
      case 'excel':
        return <ExcelIcon className={iconClass} />
      case 'powerpoint':
        return <PowerPointIcon className={iconClass} />
      case 'video':
        return <VideoIcon className={iconClass} />
      case 'audio':
        return <AudioIcon className={iconClass} />
      case 'archive':
        return <ArchiveIcon className={iconClass} />
      case 'code':
        return <CodeIcon className={iconClass} />
      case 'text':
        return <TextIcon className={iconClass} />
      case 'image':
        return <ImageIcon className={iconClass} />
      default:
        return <FileIcon className={iconClass} />
    }
  }

  return (
    <div className="accordion-item">
      <h2 className="accordion-header">
        <button
          className={`accordion-button ${isOpen ? '' : 'collapsed'}`}
          type="button"
          onClick={onToggle}
          aria-expanded={isOpen}
        >
          <span className="status-icon">
            {files.length ? <i className="ri-check-fill text-success"></i> : null}
          </span>
          <span>{section}</span>
        </button>
      </h2>
      <Collapse isOpen={isOpen} className="accordion-collapse">
        <div className="accordion-body">
          <div
            className="dropzone dz-clickable text-center"
            onClick={() => onOpenFileManager(section, true)}
            style={{ cursor: 'pointer' }}
          >
            <div className="dz-message needsclick">
              <div className="mb-3">
                <i className="display-4 text-muted ri-upload-cloud-2-fill"></i>
              </div>
              <h4>Click here to upload documents.</h4>
            </div>
          </div>
          <div className="file-list mt-3">
            {files.filter(f => !f.isDirectory).length > 0 ? (
              <div className="list-group">
                {files.filter(f => !f.isDirectory).map((f) => (
                  <div className="list-group-item d-flex justify-content-between align-items-center" key={f.path}>
                    <div className="d-flex align-items-center gap-3">
                      {renderFileIcon(f)}
                      <div className="d-flex flex-column">
                        <span className="fw-medium">{f.name}</span>
                        <small className="text-muted">{fmtSize(f.size || 0)}</small>
                      </div>
                    </div>
                    <button
                      className="btn btn-sm btn-outline-danger"
                      onClick={() => onRemoveFile && onRemoveFile(section, f.path)}
                      title="Remove file"
                    >
                      <i className="ri-delete-bin-line"></i> Remove
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-muted text-center mb-0">No files selected</p>
            )}
          </div>
        </div>
      </Collapse>
    </div>
  )
}
