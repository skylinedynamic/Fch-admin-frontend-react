import React, { useState, useCallback, useEffect } from 'react'
import { toast } from 'react-toastify'
import type { FileSystemItem } from '../../modules/filemanager/types'
import { FILE_MANAGER_CONFIG } from '../../modules/filemanager/config'
import { FolderTree } from './FolderTree'
import { Breadcrumb } from './Breadcrumb'
import { FileGrid } from './FileGrid'
import { ContextMenu } from './ContextMenu'
import { NewFolderModal, RenameModal, DeleteConfirmDialog, UploadModal, DuplicateFileModal } from './Modals'
import {
  PlusIcon,
  UploadIcon,
  RefreshIcon,
  GridViewIcon,
  ListViewIcon,
  MenuIcon,
  CloseIcon,
  CopyIcon,
  MoveIcon,
  DeleteIcon
} from './Icons'
import './CustomFileManager.css'

interface CustomFileManagerProps {
  files: FileSystemItem[]
  folderTree: FileSystemItem[]
  currentPath: string
  loading: boolean
  selectionMode?: boolean
  onNavigate: (path: string) => void
  onRefresh: () => void
  onCreateFolder: (name: string, path: string) => Promise<void>
  onUploadFile: (file: File, path?: string, refresh?: boolean, onProgress?: (progress: number) => void) => Promise<void>
  onRename: (path: string, newName: string) => Promise<void>
  onDelete: (paths: string[]) => Promise<void>
  onDownload: (path: string, filename: string) => Promise<void>
  onPaste: (items: FileSystemItem[], destinationPath: string, operation: 'copy' | 'move') => Promise<void>
  onSelectFiles?: (files: FileSystemItem[]) => void
  onCancelSelection?: () => void
  onChanged?: () => void
  rootLabel?: string
}

export const CustomFileManager: React.FC<CustomFileManagerProps> = ({
  files,
  folderTree,
  currentPath,
  loading,
  selectionMode = false,
  onNavigate,
  onRefresh,
  onCreateFolder,
  onUploadFile,
  onRename,
  onDelete,
  onDownload,
  onPaste,
  onSelectFiles,
  onCancelSelection,
  onChanged,
  rootLabel
}) => {
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  const [selectedItems, setSelectedItems] = useState<string[]>([])
  const [selectedItem, setSelectedItem] = useState<FileSystemItem | null>(null)
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number } | null>(null)
  const [showNewFolderModal, setShowNewFolderModal] = useState(false)
  const [showRenameModal, setShowRenameModal] = useState(false)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [showUploadModal, setShowUploadModal] = useState(false)
  const [clipboard, setClipboard] = useState<{ items: FileSystemItem[]; operation: 'copy' | 'move' } | null>(null)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)

  // Upload Queue & Collision Handling
  const [uploadQueue, setUploadQueue] = useState<File[]>([])
  const [currentCollision, setCurrentCollision] = useState<{ file: File; resolve: (action: 'replace' | 'keep' | 'cancel') => void } | null>(null)
  const isProcessingQueue = React.useRef(false) // Ref to track queue processing status without triggering re-renders

  // Progress State
  const [uploadProgress, setUploadProgress] = useState<number | null>(null)
  const [currentUploadingFile, setCurrentUploadingFile] = useState<string | null>(null)
  const [uploadComplete, setUploadComplete] = useState(false)
  // notify parent when file manager made changes (upload/rename/delete/paste)
  const notifyChanged = () => {
    if (typeof onChanged === 'function') onChanged()
  }

  // Clear selection when path changes
  useEffect(() => {
    setSelectedItems([])
    setSelectedItem(null)
  }, [currentPath])

  const handleItemClick = useCallback((item: FileSystemItem, event: React.MouseEvent) => {
    if (event.ctrlKey || event.metaKey) {
      // Multiple selection
      setSelectedItems(prev =>
        prev.includes(item.path)
          ? prev.filter(p => p !== item.path)
          : [...prev, item.path]
      )
    } else {
      // Single selection
      setSelectedItems([item.path])
      setSelectedItem(item)
    }
  }, [])

  const handleItemDoubleClick = useCallback((item: FileSystemItem) => {
    if (item.isDirectory) {
      onNavigate(item.path)
    } else {
      // In selection mode, double-click adds the file to the selection
      if (selectionMode && onSelectFiles) {
        onSelectFiles([item])
      } else if (item.url) {
        // Normal mode: open file in new tab
        window.open(item.url, '_blank')
      }
    }
  }, [onNavigate, selectionMode, onSelectFiles])

  const handleContextMenu = useCallback((item: FileSystemItem, event: React.MouseEvent) => {
    event.preventDefault()
    if (!selectedItems.includes(item.path)) {
      setSelectedItems([item.path])
    }
    setSelectedItem(item)
    setContextMenu({ x: event.clientX, y: event.clientY })
  }, [selectedItems])

  const handleCreateFolder = useCallback(async (name: string) => {
    await onCreateFolder(name, currentPath)
  }, [onCreateFolder, currentPath])

  const processUploadQueue = useCallback(async (queue: File[]) => {
    if (isProcessingQueue.current) return
    isProcessingQueue.current = true

    let currentQueue = [...queue]
    // Clear state queue as we are processing locally
    setUploadQueue([])

    // Maintain a local set of file names to track duplicates within the same batch
    // This handles cases where 'files' prop hasn't updated yet, or multiple files in this batch have the same name
    const knownFileNames = new Set(files.map(f => f.name))

    const totalFiles = currentQueue.length
    for (let i = 0; i < totalFiles; i++) {
      const file = currentQueue[i]
      const isLastFile = i === totalFiles - 1

      // Check for duplicate
      const duplicate = knownFileNames.has(file.name)

      if (duplicate) {
        // Wait for user decision
        const action = await new Promise<'replace' | 'keep' | 'cancel'>((resolve) => {
          setCurrentCollision({ file, resolve })
        })

        setCurrentCollision(null) // Close modal

        if (action === 'cancel') continue

        if (action === 'replace') {
          setCurrentUploadingFile(file.name)
          setUploadProgress((i * 100) / totalFiles)
          await onUploadFile(file, currentPath, isLastFile, (progress) => {
            const batchProgress = ((i * 100) + progress) / totalFiles
            setUploadProgress(batchProgress)
          })
          // State cleaned up after loop
          // No need to update knownFileNames, name exists
        } else if (action === 'keep') {
          // Generate new name
          let newName = file.name
          let counter = 1
          const nameParts = file.name.lastIndexOf('.')
          const baseName = nameParts !== -1 ? file.name.substring(0, nameParts) : file.name
          const extension = nameParts !== -1 ? file.name.substring(nameParts) : ''

          while (knownFileNames.has(newName)) {
            newName = `${baseName} (${counter})${extension}`
            counter++
          }

          // Create new File object
          const newFile = new File([file], newName, { type: file.type })
          setCurrentUploadingFile(newName)
          setUploadProgress((i * 100) / totalFiles)
          await onUploadFile(newFile, currentPath, isLastFile, (progress) => {
            const batchProgress = ((i * 100) + progress) / totalFiles
            setUploadProgress(batchProgress)
          })
          knownFileNames.add(newName)
        }
      } else {
        setCurrentUploadingFile(file.name)
        setUploadProgress((i * 100) / totalFiles)
        await onUploadFile(file, currentPath, isLastFile, (progress) => {
          const batchProgress = ((i * 100) + progress) / totalFiles
          setUploadProgress(batchProgress)
        })
        knownFileNames.add(file.name)
      }
    }

    isProcessingQueue.current = false
    setUploadProgress(null)
    setCurrentUploadingFile(null)
    setUploadComplete(true)
    if (typeof onChanged === 'function') onChanged()
  }, [files, currentPath, onUploadFile, onChanged])

  // Trigger processing when queue changes
  useEffect(() => {
    if (uploadQueue.length > 0 && !isProcessingQueue.current) {
      processUploadQueue(uploadQueue)
    }
  }, [uploadQueue, processUploadQueue])


  const handleUpload = useCallback(async (inputFiles: File[] | FileList) => {
    const newFiles = inputFiles instanceof FileList ? Array.from(inputFiles) : inputFiles
    const validFiles: File[] = []

    newFiles.forEach(file => {
      // Validate Size
      if (file.size > FILE_MANAGER_CONFIG.MAX_FILE_SIZE) {
        toast.error(`File "${file.name}" exceeds ${(FILE_MANAGER_CONFIG.MAX_FILE_SIZE / 1024 / 1024).toFixed(0)}MB limit.`)
        return
      }

      // Validate Extension
      const extension = file.name.split('.').pop()?.toLowerCase()
      if (!extension || !FILE_MANAGER_CONFIG.ALLOWED_EXTENSIONS.includes(extension)) {
        toast.error(`File type "${extension}" not allowed for "${file.name}".`)
        return
      }

      validFiles.push(file)
    })

    if (validFiles.length > 0) {
      setUploadQueue(prev => [...prev, ...validFiles])
    }
  }, [])

  const handleRename = useCallback(async (newName: string) => {
    if (selectedItem) {
      await onRename(selectedItem.path, newName)
      if (typeof onChanged === 'function') onChanged()
    }
  }, [selectedItem, onRename, onChanged])

  const handleDelete = useCallback(async () => {
    if (selectedItems.length > 0) {
      await onDelete(selectedItems)
      setSelectedItems([])
      setSelectedItem(null)
      if (typeof onChanged === 'function') onChanged()
    }
  }, [selectedItems, onDelete, onChanged])

  const handleDownload = useCallback(async () => {
    if (selectedItem && !selectedItem.isDirectory) {
      await onDownload(selectedItem.path, selectedItem.name)
    }
  }, [selectedItem, onDownload])

  const handleCopy = useCallback(() => {
    const items = files.filter(f => selectedItems.includes(f.path))
    setClipboard({ items, operation: 'copy' })
  }, [files, selectedItems])

  const handleMove = useCallback(() => {
    const items = files.filter(f => selectedItems.includes(f.path))
    setClipboard({ items, operation: 'move' })
  }, [files, selectedItems])

  const handlePaste = useCallback(async () => {
    if (clipboard && clipboard.items.length > 0) {
      await onPaste(clipboard.items, currentPath, clipboard.operation)
      // Clear clipboard after paste operation (both copy and move)
      setClipboard(null)
      if (typeof onChanged === 'function') onChanged()
    }
  }, [clipboard, currentPath, onPaste, onChanged])

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey) {
        switch (e.key.toLowerCase()) {
          case 'a':
            e.preventDefault()
            setSelectedItems(files.map(f => f.path))
            break
          case 'c':
            if (selectedItems.length > 0) {
              handleCopy()
            }
            break
          case 'v':
            if (clipboard) {
              handlePaste()
            }
            break
        }
      } else if (e.key === 'Delete' && selectedItems.length > 0) {
        setShowDeleteDialog(true)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [files, selectedItems, clipboard, handleCopy, handlePaste])

  return (
    <div className="custom-file-manager">
      {/* Sidebar */}
      <div className={`fm-sidebar ${sidebarCollapsed ? 'collapsed' : ''}`}>
        <div className="fm-sidebar-header">Folders</div>
        <FolderTree
          tree={folderTree}
          currentPath={currentPath}
          onNavigate={onNavigate}
          rootLabel={rootLabel}
        />
      </div>

      {/* Main Content */}
      <div className="fm-main">
        {/* Toolbar */}
        <div className="fm-toolbar">
          <button
            className="fm-toolbar-btn"
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            title={sidebarCollapsed ? 'Show sidebar' : 'Hide sidebar'}
          >
            {sidebarCollapsed ? <MenuIcon /> : <CloseIcon />}
          </button>

          <button className="fm-toolbar-btn" onClick={() => setShowNewFolderModal(true)}>
            <PlusIcon />
            <span>New Folder</span>
          </button>

          <button className="fm-toolbar-btn" onClick={() => {
            setUploadComplete(false)
            setShowUploadModal(true)
          }}>
            <UploadIcon />
            <span>Upload</span>
          </button>

          <button className="fm-toolbar-btn" onClick={onRefresh} disabled={loading}>
            <RefreshIcon />
            <span>Refresh</span>
          </button>

          {clipboard && clipboard.items.length > 0 && (
            <button className="fm-toolbar-btn" onClick={handlePaste}>
              <span>Paste {clipboard.items.length} {clipboard.items.length === 1 ? 'item' : 'items'}</span>
            </button>
          )}

          {selectedItems.length > 0 && (
            <button
              className="fm-toolbar-btn"
              onClick={handleCopy}
              title="Copy"
            >
              <CopyIcon />
              <span>Copy</span>
            </button>
          )}

          {selectedItems.length > 0 && (
            <button
              className="fm-toolbar-btn"
              onClick={handleMove}
              title="Cut"
            >
              <MoveIcon />
              <span>Cut</span>
            </button>
          )}

          {selectedItems.length > 0 && (
            <button
              className="fm-toolbar-btn fm-toolbar-btn-delete"
              onClick={() => setShowDeleteDialog(true)}
              title="Delete"
            >
              <DeleteIcon />
              <span>Delete</span>
            </button>
          )}

          <div className="fm-view-toggle">
            <button
              className={`fm-view-btn ${viewMode === 'grid' ? 'active' : ''}`}
              onClick={() => setViewMode('grid')}
              title="Grid view"
            >
              <GridViewIcon />
            </button>
            <button
              className={`fm-view-btn ${viewMode === 'list' ? 'active' : ''}`}
              onClick={() => setViewMode('list')}
              title="List view"
            >
              <ListViewIcon />
            </button>
          </div>
        </div>

        {/* Breadcrumb */}
        <Breadcrumb currentPath={currentPath} onNavigate={onNavigate} rootLabel={rootLabel} />

        {/* Content */}
        <div className="fm-content">
          <FileGrid
            files={files}
            viewMode={viewMode}
            selectedItems={selectedItems}
            loading={loading}
            onItemClick={handleItemClick}
            onItemDoubleClick={handleItemDoubleClick}
            onContextMenu={handleContextMenu}
          />
        </div>
      </div>

      {/* Context Menu */}
      <ContextMenu
        isOpen={!!contextMenu}
        position={contextMenu || { x: 0, y: 0 }}
        selectedItem={selectedItem}
        selectedCount={selectedItems.length}
        onClose={() => setContextMenu(null)}
        onDownload={handleDownload}
        onRename={() => setShowRenameModal(true)}
        onDelete={() => setShowDeleteDialog(true)}
        onCopy={handleCopy}
        onMove={handleMove}
      />

      {/* Modals */}
      <NewFolderModal
        isOpen={showNewFolderModal}
        onClose={() => setShowNewFolderModal(false)}
        onConfirm={handleCreateFolder}
      />

      <RenameModal
        isOpen={showRenameModal}
        currentName={selectedItem?.name || ''}
        onClose={() => setShowRenameModal(false)}
        onConfirm={handleRename}
      />

      <DeleteConfirmDialog
        isOpen={showDeleteDialog}
        itemCount={selectedItems.length}
        onClose={() => setShowDeleteDialog(false)}
        onConfirm={handleDelete}
      />

      <UploadModal
        isOpen={showUploadModal}
        onClose={() => setShowUploadModal(false)}
        onUpload={handleUpload}
        uploadProgress={uploadProgress}
        currentUploadingFile={currentUploadingFile}
        uploadComplete={uploadComplete}
      />

      {currentCollision && (
        <DuplicateFileModal
          isOpen={!!currentCollision}
          fileName={currentCollision.file.name}
          onReplace={() => currentCollision.resolve('replace')}
          onKeepBoth={() => currentCollision.resolve('keep')}
          onCancel={() => currentCollision.resolve('cancel')}
        />
      )}

      {/* Floating Select Button */}
      {selectionMode && selectedItems.length > 0 && (() => {
        const selectedFiles = files.filter(f => selectedItems.includes(f.path) && !f.isDirectory)
        return selectedFiles.length > 0 ? (
          <button
            className="fm-floating-select-btn"
            onClick={() => {
              if (onSelectFiles) {
                onSelectFiles(selectedFiles)
              }
            }}
          >
            <span>Select ({selectedFiles.length} {selectedFiles.length === 1 ? 'file' : 'files'})</span>
          </button>
        ) : null
      })()}
    </div>
  )
}
