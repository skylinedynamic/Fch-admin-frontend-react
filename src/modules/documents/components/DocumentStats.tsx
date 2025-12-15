import React from 'react'

interface DocumentStatsProps {
  count: number
  size: number
}

export const DocumentStats: React.FC<DocumentStatsProps> = ({ count, size }) => {
  const fmtSize = (n: number) => {
    if (n >= 1024 * 1024) return `${(n / (1024 * 1024)).toFixed(1)} MB`
    if (n >= 1024) return `${(n / 1024).toFixed(1)} KB`
    return `${n} B`
  }

  return (
    <div className="text-center mb-3">
      <h4 className="mb-1">Documents</h4>
      <div className="text-muted">Upload and view your documents for quick overview</div>
      <div className="mt-1">
        <span className="text-primary">Allowed files</span>: JPG, JPEG, PNG, PDF, DOC, DOCX <span className="text-muted">Maximum file size: 10MB per file</span>
      </div>
      <div className="mt-2">
        <span className="badge bg-info-subtle text-info me-1">{count} files</span>
        <span className="badge bg-secondary-subtle text-secondary">{fmtSize(size)}</span>
      </div>
    </div>
  )
}
