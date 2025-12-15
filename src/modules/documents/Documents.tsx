import React, { useMemo, useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { toast } from 'react-toastify'
import {
  submitFileSelection,
  fetchFolderTree,
  fetchDocuments
} from '../../modules/filemanager/services'
import type { FileSystemItem } from '../../modules/filemanager/types'
import { DocumentStats } from './components/DocumentStats'
import { DocumentSection } from './components/DocumentSection'
import { FileManagerModal } from '../../components/FileManagerModal/FileManagerModal'


interface DocumentsProps {
  entity_type?: string;
  entity_id?: string | number;
}

export default function Documents({ entity_type = "partners", entity_id }: DocumentsProps) {
  const { id } = useParams()
  const currentEntityId = entity_id || id

  const [sections, setSections] = useState<string[]>([])
  const [uploads, setUploads] = useState<Record<string, FileSystemItem[]>>({})

  const [loading, setLoading] = useState(true)
  const [showFileManager, setShowFileManager] = useState(false)
  const [openSection, setOpenSection] = useState<string | null>(null)
  const [currentSection, setCurrentSection] = useState<string>('')
  const [selectionMode, setSelectionMode] = useState(false)

  // Fetch folders and files
  const refreshDocuments = async () => {
    if (!currentEntityId) return

    setLoading(true)
    try {
      // 1. Fetch Root Folders (Sections)
      const context = { entity_type, entity_id: currentEntityId }
      const tree = await fetchFolderTree('/', context)

      const folderNames = tree
        .filter(item => item.isDirectory)
        .map(item => item.name)

      setSections(folderNames)

      // 2. Fetch Files for each folder
      const uploadsMap: Record<string, FileSystemItem[]> = {}

      await Promise.all(folderNames.map(async (folderName) => {
        try {
          const files = await fetchDocuments(`/${folderName}`, context)
          uploadsMap[folderName] = files
        } catch (e) {
          console.error(`Failed to load files for ${folderName}`, e)
          uploadsMap[folderName] = []
        }
      }))

      setUploads(uploadsMap)

      // Open first section by default if none open
      if (!openSection && folderNames.length > 0) {
        setOpenSection(folderNames[0])
      }
    } catch (error) {
      console.error('Failed to load documents data', error)
      toast.error('Failed to load documents')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    refreshDocuments()
  }, [currentEntityId, entity_type])



  const totals = useMemo(() => {
    const entries = Object.entries(uploads)
    const count = entries.reduce((acc, [, files]) => acc + files.filter(f => !f.isDirectory).length, 0)
    const size = entries.reduce((acc, [, files]) => acc + files.reduce((a, f) => a + (f.size || 0), 0), 0)
    return { count, size }
  }, [uploads])

  const toggleFileManager = (section?: string, selectMode: boolean = false) => {
    if (section) {
      setCurrentSection(section)
      setSelectionMode(selectMode)
    }
    setShowFileManager(!showFileManager)
  }

  const handleFileSelection = async (selectedFiles: FileSystemItem[]) => {
    if (currentSection) {
      try {
        const filePaths = selectedFiles.map(f => f.path)
        // Use currentSection as destination path or tag? 
        // Assuming submitFileSelection handles the logic, or we manipulate files via FM services
        // For now, retaining submitFileSelection but usually FileManager handles upload directly.

        await submitFileSelection(filePaths, '/borrower/documents/upload', {
          document_type: currentSection, // Passing section name as type
          entity_type,
          entity_id: currentEntityId
        })

        // Refresh all documents to show new files
        await refreshDocuments()

        toast.success(`${selectedFiles.length} file(s) attached to ${currentSection}`)
      } catch (error) {
        console.error('Failed to attach files', error)
        toast.error('Failed to attach files')
      }
    }
  }

  const handleRemoveFile = (section: string, filePath: string) => {
    setUploads(prev => ({
      ...prev,
      [section]: prev[section].filter(f => f.path !== filePath)
    }))
    toast.info('File removed from list')
  }

  const toggleSection = (section: string) => {
    setOpenSection(prev => (prev === section ? null : section))
  }

  return (
    <div className="page-content documents-page">
      <FileManagerModal
        isOpen={showFileManager}
        toggle={() => toggleFileManager()}
        section={currentSection}
        selectionMode={selectionMode}
        onSelectFiles={handleFileSelection}
        entityType={entity_type}
        entityId={currentEntityId ? String(currentEntityId) : undefined}
      />

      <div className="container-fluid min-vh-70 pt-2">
        {loading ? (
          <div className="text-center mb-3">
            <div className="d-flex flex-column align-items-center">
              <div className="skeleton-line" style={{ width: 180, height: 24, borderRadius: 8 }}></div>
              <div className="skeleton-line mt-2" style={{ width: 480, height: 14, borderRadius: 8 }}></div>
              <div className="skeleton-line mt-2" style={{ width: 420, height: 14, borderRadius: 8 }}></div>
              <div className="d-flex gap-2 mt-2">
                <div className="skeleton-line" style={{ width: 80, height: 22, borderRadius: 10 }}></div>
                <div className="skeleton-line" style={{ width: 100, height: 22, borderRadius: 10 }}></div>
              </div>
            </div>
          </div>
        ) : (
          <DocumentStats count={totals.count} size={totals.size} />
        )}

        <div className="row">
          <div className="col-11 mx-auto">
            <div className="card doc-panel">
              <div className="card-body">
                {loading ? (
                  <div>
                    {[1, 2, 3, 4].map((i) => (
                      <div className="mb-3" key={i}>
                        <div className="skeleton-line w-50" style={{ height: 22, borderRadius: 6 }}></div>
                        <div className="skeleton-line w-100 mt-2" style={{ height: 120, borderRadius: 8 }}></div>
                        <div className="d-flex gap-2 mt-2">
                          <div className="skeleton-line" style={{ width: 160, height: 14, borderRadius: 6 }}></div>
                          <div className="skeleton-line" style={{ width: 90, height: 14, borderRadius: 6 }}></div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="accordion" id="docsAccordion">
                    {sections.map((sec) => (
                      <DocumentSection
                        key={sec}
                        section={sec}
                        files={uploads[sec] || []}
                        isOpen={openSection === sec}
                        onToggle={() => toggleSection(sec)}
                        onOpenFileManager={toggleFileManager}
                        onRemoveFile={handleRemoveFile}
                      />
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
