import { useState, useEffect, useCallback, useRef } from 'react'
import { toast } from 'react-toastify'
import {
  fetchDocuments,
  uploadFile,
  createFolder,
  renameItem,
  deleteItems,
  pasteItems,
  downloadFile,
  fetchFolderTree
} from '../../modules/filemanager/services'
import type { FileSystemItem, FileManagerContext } from '../../modules/filemanager/types'

export const useFileManager = (section?: string, initialPath: string = '/', config: { enabled?: boolean } = { enabled: true }, context?: FileManagerContext) => {
  const [files, setFiles] = useState<FileSystemItem[]>([])
  const [folderTree, setFolderTree] = useState<FileSystemItem[]>([])
  const [currentPath, setCurrentPath] = useState(initialPath)
  const [loading, setLoading] = useState(false)
  const hasLoadedRef = useRef(false)

  const loadFolderTree = useCallback(async () => {
    try {
      const tree = await fetchFolderTree('/', context)
      setFolderTree(tree)
    } catch (error) {
      console.error('Failed to load folder tree', error)
    }
  }, [context])

  const loadFiles = useCallback(async (path: string) => {
    setLoading(true)
    try {
      const data = await fetchDocuments(path, context)
      setFiles(data)
      setCurrentPath(path)
    } catch (error) {
      console.error('Failed to load files', error)
      toast.error('Failed to load files')
    } finally {
      setLoading(false)
    }
  }, [context])

  // Initial load - only runs once when enabled
  useEffect(() => {
    if (config.enabled && !hasLoadedRef.current) {
      hasLoadedRef.current = true
      loadFiles(initialPath)
      loadFolderTree() // Load the complete folder tree
    }
  }, [config.enabled, initialPath, loadFiles, loadFolderTree])

  // Reset when modal closes or context changes
  useEffect(() => {
    if (!config.enabled) {
      hasLoadedRef.current = false
    }
  }, [config.enabled])

  useEffect(() => {
    hasLoadedRef.current = false
  }, [context])

  const handleNavigate = useCallback((path: string) => {
    console.log('handleNavigate path:', path)
    loadFiles(path)
  }, [loadFiles])

  const handleCreateFolder = async (name: string, parentPath?: string) => {
    // Use currentPath if parentPath is not provided or is invalid
    const targetPath = parentPath && parentPath !== '/' ? parentPath : currentPath
    try {
      await createFolder(name, targetPath, context)
      await loadFiles(targetPath)
      await loadFolderTree() // Refresh tree after creating folder
    } catch (error) {
      console.error('Create folder failed', error)
      toast.error('Failed to create folder')
    }
  }

  const handleUploadFile = async (file: File, parentPath?: string, refresh: boolean = true, onProgress?: (progress: number) => void) => {
    // Use currentPath if parentPath is not provided or is invalid
    const targetPath = parentPath && parentPath !== '/' ? parentPath : currentPath
    try {
      await uploadFile(file, targetPath, onProgress, context)
      if (refresh) {
        await loadFiles(targetPath)
      }
    } catch (error) {
      console.error('Upload failed', error)
      toast.error('Failed to upload file')
    }
  }

  const handleRename = async (path: string, newName: string) => {
    try {
      await renameItem(path, newName, context)
      await loadFiles(currentPath) // Refresh current view
      await loadFolderTree() // Refresh tree after rename
    } catch (error) {
      console.error('Rename failed', error)
      toast.error('Failed to rename item')
    }
  }

  const handleDelete = async (paths: string[]) => {
    try {
      await deleteItems(paths, context)
      await loadFiles(currentPath)
      await loadFolderTree() // Refresh tree after delete
    } catch (error) {
      console.error('Delete failed', error)
      toast.error('Failed to delete items')
    }
  }

  const handlePaste = async (items: FileSystemItem[], destinationPath: string, operation: 'copy' | 'move') => {
    try {
      await pasteItems(items, destinationPath, operation, context)
      await loadFiles(destinationPath)
    } catch (error) {
      console.error('Paste failed', error)
      toast.error('Failed to paste items')
    }
  }

  const handleDownload = async (path: string, filename: string) => {
    try {
      await downloadFile(path, filename)
    } catch (error) {
      console.error('Download failed', error)
      toast.error('Failed to download file')
    }
  }

  return {
    files,
    folderTree,
    loading,
    currentPath,
    setCurrentPath,
    refresh: useCallback(() => loadFiles(currentPath), [loadFiles, currentPath]),
    handleNavigate,
    handleCreateFolder,
    handleUploadFile,
    handleRename,
    handleDelete,
    handlePaste,
    handleDownload
  }
}
