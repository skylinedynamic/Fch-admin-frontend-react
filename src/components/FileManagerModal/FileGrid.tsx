import React from 'react'
import type { FileSystemItem } from '../../modules/filemanager/types'
import {
  FolderIcon,
  FileIcon,
  PdfIcon,
  ImageIcon,
  WordIcon,
  ExcelIcon,
  PowerPointIcon,
  VideoIcon,
  AudioIcon,
  ArchiveIcon,
  CodeIcon,
  TextIcon,
  getFileIcon
} from './Icons'
import { SkeletonLoader } from './SkeletonLoader'

interface FileGridProps {
  files: FileSystemItem[]
  viewMode: 'grid' | 'list'
  selectedItems: string[]
  loading?: boolean
  onItemClick: (item: FileSystemItem, event: React.MouseEvent) => void
  onItemDoubleClick: (item: FileSystemItem) => void
  onContextMenu: (item: FileSystemItem, event: React.MouseEvent) => void
}

export const FileGrid: React.FC<FileGridProps> = ({
  files,
  viewMode,
  selectedItems,
  loading = false,
  onItemClick,
  onItemDoubleClick,
  onContextMenu
}) => {
  if (loading) {
    return <SkeletonLoader viewMode={viewMode} count={20} />
  }

  if (files.length === 0) {
    return (
      <div className="fm-empty-state">
        <FolderIcon />
        <p>Nothing here yet</p>
      </div>
    )
  }

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return '-'
    const sizes = ['B', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(1024))
    return `${(bytes / Math.pow(1024, i)).toFixed(2)} ${sizes[i]}`
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  }

  const truncateName = (name: string, maxLength: number = 25) => {
    if (name.length <= maxLength) return name
    return name.substring(0, maxLength) + '...'
  }

  const renderIcon = (item: FileSystemItem, size: 'large' | 'small' = 'large') => {
    const className = size === 'large' ? 'fm-grid-item-icon' : 'fm-list-item-icon'
    
    if (item.isDirectory) {
      return <FolderIcon className={className} />
    }

    const iconType = getFileIcon(item.name, item.type)
    
    // Show image thumbnail for image files
    if (iconType === 'image' && item.url && size === 'large') {
      return (
        <img
          src={item.url}
          alt={item.name}
          className={`${className} image`}
          onError={(e) => {
            // Fallback to icon if image fails to load
            e.currentTarget.style.display = 'none'
            e.currentTarget.nextElementSibling?.removeAttribute('style')
          }}
        />
      )
    }

    // Return appropriate icon based on file type with their real brand colors
    switch (iconType) {
      case 'pdf':
        return <PdfIcon className={size === 'large' ? 'fm-icon-large' : 'fm-icon-small'} />
      case 'word':
        return <WordIcon className={size === 'large' ? 'fm-icon-large' : 'fm-icon-small'} />
      case 'excel':
        return <ExcelIcon className={size === 'large' ? 'fm-icon-large' : 'fm-icon-small'} />
      case 'powerpoint':
        return <PowerPointIcon className={size === 'large' ? 'fm-icon-large' : 'fm-icon-small'} />
      case 'video':
        return <VideoIcon className={size === 'large' ? 'fm-icon-large' : 'fm-icon-small'} />
      case 'audio':
        return <AudioIcon className={size === 'large' ? 'fm-icon-large' : 'fm-icon-small'} />
      case 'archive':
        return <ArchiveIcon className={size === 'large' ? 'fm-icon-large' : 'fm-icon-small'} />
      case 'code':
        return <CodeIcon className={size === 'large' ? 'fm-icon-large' : 'fm-icon-small'} />
      case 'text':
        return <TextIcon className={size === 'large' ? 'fm-icon-large' : 'fm-icon-small'} />
      case 'image':
        return <ImageIcon className={size === 'large' ? 'fm-icon-large' : 'fm-icon-small'} />
      default:
        return <FileIcon className={`${className} file`} />
    }
  }

  if (viewMode === 'grid') {
    return (
      <div className="fm-grid">
        {files.map((item) => (
          <div
            key={item.path}
            className={`fm-grid-item ${selectedItems.includes(item.path) ? 'selected' : ''}`}
            onClick={(e) => onItemClick(item, e)}
            onDoubleClick={() => onItemDoubleClick(item)}
            onContextMenu={(e) => onContextMenu(item, e)}
            title={item.name}
          >
            {renderIcon(item, 'large')}
            <div className="fm-grid-item-name">{truncateName(item.name)}</div>
          </div>
        ))}
      </div>
    )
  }

  return (
    <div className="fm-list">
      <div className="fm-list-header">
        <div>Name</div>
        <div>Modified</div>
        <div>Size</div>
      </div>
      {files.map((item) => (
        <div
          key={item.path}
          className={`fm-list-item ${selectedItems.includes(item.path) ? 'selected' : ''}`}
          onClick={(e) => onItemClick(item, e)}
          onDoubleClick={() => onItemDoubleClick(item)}
          onContextMenu={(e) => onContextMenu(item, e)}
          title={item.name}
        >
          <div className="fm-list-item-cell">
            {renderIcon(item, 'small')}
            <span>{truncateName(item.name, 50)}</span>
          </div>
          <div className="fm-list-item-cell">
            {formatDate(item.updatedAt)}
          </div>
          <div className="fm-list-item-cell">
            {item.isDirectory ? '-' : formatFileSize(item.size)}
          </div>
        </div>
      ))}
    </div>
  )
}
