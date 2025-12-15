import React, { useMemo } from 'react'
import { Modal, ModalHeader, ModalBody } from 'reactstrap'
import { CustomFileManager } from './CustomFileManager'
import { useFileManager } from './useFileManager'
import type { FileSystemItem } from '../../modules/filemanager/types'

interface FileManagerModalProps {
  isOpen: boolean
  toggle: () => void
  section?: string
  initialPath?: string
  selectionMode?: boolean
  onSelectFiles?: (files: FileSystemItem[]) => void
  entityType?: string
  entityId?: number | string
}

export const FileManagerModal: React.FC<FileManagerModalProps> = ({
  isOpen,
  toggle,
  section,
  initialPath = '/',
  selectionMode = false,
  onSelectFiles,
  onChanged,
  entityType,
  entityId
}) => {
  const context = useMemo(() => ({
    entity_type: entityType,
    entity_id: entityId
  }), [entityType, entityId])

  const {
    files,
    folderTree,
    loading,
    currentPath,
    refresh,
    handleNavigate,
    handleCreateFolder,
    handleUploadFile,
    handleRename,
    handleDelete,
    handlePaste,
    handleDownload
  } = useFileManager(section, initialPath, { enabled: isOpen }, context)

  const handleSelectFiles = (selectedFiles: FileSystemItem[]) => {
    if (onSelectFiles) {
      onSelectFiles(selectedFiles)
    }
    toggle()
  }

  return (
    <Modal isOpen={isOpen} toggle={toggle} size="xl" centered>
      <ModalHeader toggle={toggle} className="fm-modal-header-main">
        {selectionMode ? 'Select Files' : `File Manager ${section ? `- ${section}` : ''}`}
      </ModalHeader>
      <ModalBody style={{ height: '80vh', padding: 0 }}>
        <CustomFileManager
          files={files}
          folderTree={folderTree}
          currentPath={currentPath}
          loading={loading}
          selectionMode={selectionMode}
          onNavigate={handleNavigate}
          onRefresh={refresh}
          onCreateFolder={handleCreateFolder}
          onUploadFile={handleUploadFile}
          onRename={handleRename}
          onDelete={handleDelete}
          onDownload={handleDownload}
          onPaste={handlePaste}
          onSelectFiles={handleSelectFiles}
          onCancelSelection={toggle}
          onChanged={onChanged}
        />
      </ModalBody>
    </Modal>
  )
}
