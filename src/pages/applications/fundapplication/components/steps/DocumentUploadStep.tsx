import React, { useState, useEffect } from 'react'
import { toast } from 'react-toastify'
import { useQueryClient } from '@tanstack/react-query'
import { queryKeys } from '../../../../../lib/query'
import StepNavigation from '../shared/StepNavigation'
import { FileManagerModal } from '../../../../../components/FileManagerModal/FileManagerModal'
import { DocumentSection } from '../../../../documents/components/DocumentSection'
import { submitFileSelection } from '../../../../../modules/filemanager/services'
import type { FileSystemItem } from '../../../../../modules/filemanager/types'
import { useDocumentTypes } from '../../../../../modules/documents'
import { getUser } from '../../../../../lib/auth/auth'
import DeleteConfirmationModal from '../../../../../components/GlobalModal/DeleteConfirmModal'
import { useFundingRequest, useFundingApplicationDocuments, useDeleteFundingApplicationDocument, useUploadFundingApplicationDocuments } from '../../../../../modules/funding-application/queries'
import type { FundingApplicationDocument } from '../../../../../modules/funding-application/types'
import DocumentUploadSkeleton from '../../../../../components/Loader/DocumentUploadSkeleton'

type DocumentUploadStepProps = {
  onNext: () => void
  onBack: () => void
  loading: boolean
  onRegisterSave?: (fn: (() => Promise<boolean>) | null) => void
  fundingSequenceId?: number | string | null
  fundingRequestId?: number | string | null
  fundingApplicationId?: number | string | null
}

export default function DocumentUploadStep({
  onNext,
  onBack,
  loading,
  onRegisterSave,
  fundingSequenceId,
  fundingRequestId: initialRequestId,
  fundingApplicationId: initialAppId,
}: DocumentUploadStepProps) {
  const [sections, setSections] = useState<string[]>([])
  const [uploads, setUploads] = useState<Record<string, FileSystemItem[]>>({})

  // Register null save function (this step has no auto-save)
  useEffect(() => {
    if (onRegisterSave) {
      onRegisterSave(null)
    }
  }, [onRegisterSave])

  const [uploadingSections, setUploadingSections] = useState<Record<string, boolean>>({})
  const [showFileManager, setShowFileManager] = useState(false)
  const [currentSection, setCurrentSection] = useState<string>('')
  const [openSection, setOpenSection] = useState<string | null>(null)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [documentToDelete, setDocumentToDelete] = useState<{ id: number; name: string } | null>(null)
  
  const queryClient = useQueryClient()

  // Fetch funding request to get ID
  const { data: fundingData } = useFundingRequest(initialRequestId)
  
  const effectiveAppId = initialAppId || initialRequestId || fundingData?.id || null

  // Fetch document types and funding documents
  const { data: types, isLoading: typesLoading } = useDocumentTypes()
  const { data: documentsData, isLoading: docsLoading } = useFundingApplicationDocuments(effectiveAppId)
  const deleteDocumentMutation = useDeleteFundingApplicationDocument()
  const uploadDocumentsMutation = useUploadFundingApplicationDocuments()

  // Map FundingApplicationDocument to FileSystemItem for display
  const mapDocumentToFileItem = (doc: FundingApplicationDocument): FileSystemItem => ({
    name: doc.name, // Use 'name' as per API response
    path: doc.path,
    url: doc.url,
    isDirectory: false,
    size: doc.size,
    updatedAt: doc.created_at,
    documentId: doc.id,
  })

  useEffect(() => {
    if (types && documentsData) {
      const sectionNames = types.sort((a, b) => a.sort_order - b.sort_order).map(t => t.name)
      setSections(sectionNames)

      // Map document_type_id to section name and populate uploads
      const uploadsMap: Record<string, FileSystemItem[]> = {}
      sectionNames.forEach(sec => {
        uploadsMap[sec] = []
      })

      // Populate uploads based on API data (array of documents)
      // We need to match borrower_doc_type_id with docType.id
      types.forEach(docType => {
        const docsForType = (documentsData || []).filter((d: FundingApplicationDocument) => d.borrower_doc_type_id === docType.id)
        uploadsMap[docType.name] = docsForType.map(mapDocumentToFileItem)
      })

      setUploads(uploadsMap)
      
      // Open first section by default
      if (sectionNames.length > 0 && openSection === null) {
        setOpenSection(sectionNames[0])
      }
    }
  }, [types, documentsData, openSection])

  const toggleFileManager = (section?: string) => {
    if (section) {
      setCurrentSection(section)
    }
    setShowFileManager(!showFileManager)
  }

  const handleFileSelection = async (selectedFiles: FileSystemItem[]) => {
    if (currentSection && types && effectiveAppId) {
      const docType = types.find(t => t.name === currentSection)
      if (docType) {
        setUploadingSections(prev => ({ ...prev, [currentSection]: true }))
        try {
          const filePaths = selectedFiles.map(f => f.path)
          
          await uploadDocumentsMutation.mutateAsync({
            funding_application_id: effectiveAppId,
            document_type_id: docType.id,
            files: filePaths,
          })

          toast.success(`${selectedFiles.length} file(s) attached to ${currentSection}`)
        } catch (error) {
          console.error('Failed to attach files', error)
          toast.error('Failed to attach files')
        } finally {
          setUploadingSections(prev => ({ ...prev, [currentSection]: false }))
        }
      }
    }
  }

  const handleRemoveFile = (section: string, documentId: number) => {
    const file = uploads[section]?.find(f => f.documentId === documentId)
    if (file) {
      setDocumentToDelete({ id: documentId, name: file.name })
      setShowDeleteModal(true)
    }
  }

  const confirmDelete = async () => {
    if (!documentToDelete) return

    deleteDocumentMutation.mutate(documentToDelete.id, {
      onSuccess: (response) => {
        toast.success(response.message || 'Document deleted successfully')
        setShowDeleteModal(false)
        setDocumentToDelete(null)
        // Invalidate fetching docs
        queryClient.invalidateQueries({ queryKey: queryKeys.fundingApplication.documents(effectiveAppId) })
      },
      onError: (error) => {
        toast.error('Failed to delete document')
      }
    })
  }

  const toggleSection = (section: string) => {
    setOpenSection(prev => (prev === section ? null : section))
  }

  if (loading || typesLoading || docsLoading) {
    return <DocumentUploadSkeleton />
  }

  return (
    <>
      <FileManagerModal
        isOpen={showFileManager}
        toggle={() => toggleFileManager()}
        section={currentSection}
        selectionMode={true}
        onSelectFiles={handleFileSelection}
        entityType="borrowers"
        entityId={getUser()?.entity_id}
      />

      <DeleteConfirmationModal
        show={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        onConfirm={confirmDelete}
        loading={deleteDocumentMutation.isPending}
        text={`Are you sure you want to delete "${documentToDelete?.name}"? This action cannot be undone.`}
      />

      <div className="row g-3" style={{ position: 'relative' }}>
        <div className="col-12">
          <div className="accordion" id="fundDocsAccordion">
            {sections.map((sec) => (
              <DocumentSection
                key={sec}
                section={sec}
                files={uploads[sec] || []}
                isOpen={openSection === sec}
                isUploading={uploadingSections[sec] || false}
                onToggle={() => toggleSection(sec)}
                onOpenFileManager={toggleFileManager}
                onRemoveFile={handleRemoveFile}
              />
            ))}
          </div>
        </div>

        <StepNavigation onBack={onBack} onNext={onNext} loading={loading} />
      </div>
    </>  
  )
}
