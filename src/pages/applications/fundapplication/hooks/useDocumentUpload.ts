import { useState, useCallback } from 'react'
import { toast } from 'react-toastify'
import type { FileEntry } from '../types'

// Constants
const ACCEPTED_FILE_TYPES = 'image/*,.pdf,.doc,.docx,.xls,.xlsx'
const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024 // 10MB

const ALLOWED_MIME_TYPES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
]

const UPLOAD_PROGRESS_INTERVAL_MS = 120

export const useDocumentUpload = (sections: string[]) => {
  const [docUploads, setDocUploads] = useState<Record<string, FileEntry[]>>(() => {
    const init: Record<string, FileEntry[]> = {}
    sections.forEach((s) => (init[s] = []))
    return init
  })

  const [docUploading, setDocUploading] = useState<Record<string, boolean>>(() => {
    const init: Record<string, boolean> = {}
    sections.forEach((s) => (init[s] = false))
    return init
  })

  const [docProgress, setDocProgress] = useState<Record<string, number>>(() => {
    const init: Record<string, number> = {}
    sections.forEach((s) => (init[s] = 0))
    return init
  })

  const isValidFile = useCallback((file: File): boolean => {
    const isValidType = file.type.startsWith('image/') || ALLOWED_MIME_TYPES.includes(file.type)
    const isValidSize = file.size <= MAX_FILE_SIZE_BYTES
    return isValidType && isValidSize
  }, [])

  const addDocFiles = useCallback(
    (key: string, list: FileList | File[]) => {
      const arr = Array.from(list as FileList)
      const invalidFiles = arr.filter((f) => !isValidFile(f))

      if (invalidFiles.length > 0) {
        toast.error('Unsupported file or size exceeds 10MB')
        return
      }

      setDocUploading((prev) => ({ ...prev, [key]: true }))
      setDocProgress((prev) => ({ ...prev, [key]: 0 }))
      setDocUploads((prev) => {
        const next = { ...prev }
        const mapped = arr.map<FileEntry>((f) => ({
          name: f.name,
          size: f.size,
          type: f.type,
          file: f,
        }))
        next[key] = [...(next[key] || []), ...mapped]
        return next
      })

      // Simulate upload progress
      let pct = 0
      const step = 7 + Math.round(Math.random() * 12)
      const timer = setInterval(() => {
        pct = Math.min(100, pct + step)
        setDocProgress((p) => ({ ...p, [key]: pct }))
        if (pct >= 100) {
          clearInterval(timer)
          setDocUploading((u) => ({ ...u, [key]: false }))
        }
      }, UPLOAD_PROGRESS_INTERVAL_MS)
    },
    [isValidFile]
  )

  const removeDocFile = useCallback((key: string, name: string) => {
    setDocUploads((prev) => {
      const next = { ...prev }
      next[key] = (next[key] || []).filter((f) => f.name !== name)
      return next
    })
  }, [])

  const onDocDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>, key: string) => {
      e.preventDefault()
      if (e.dataTransfer.files && e.dataTransfer.files.length) {
        addDocFiles(key, e.dataTransfer.files)
      }
    },
    [addDocFiles]
  )

  return {
    docUploads,
    docUploading,
    docProgress,
    addDocFiles,
    removeDocFile,
    onDocDrop,
    acceptTypes: ACCEPTED_FILE_TYPES,
  }
}
