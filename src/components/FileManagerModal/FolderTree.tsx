import React, { useState } from 'react'
import type { FileSystemItem } from '../../modules/filemanager/types'
import { FolderIcon, ChevronRightIcon, ChevronDownIcon } from './Icons'

interface FolderTreeProps {
  tree: FileSystemItem[]
  currentPath: string
  onNavigate: (path: string) => void
}

interface TreeItemProps {
  item: FileSystemItem
  currentPath: string
  onNavigate: (path: string) => void
  level: number
}

const TreeItem: React.FC<TreeItemProps> = ({ item, currentPath, onNavigate, level }) => {
  const [isExpanded, setIsExpanded] = useState(false)
  const hasChildren = item.children && item.children.length > 0
  const isActive = currentPath === item.path

  const handleToggle = (e: React.MouseEvent) => {
    e.stopPropagation()
    setIsExpanded(!isExpanded)
  }

  const handleClick = () => {
    onNavigate(item.path)
    if (hasChildren && !isExpanded) {
      setIsExpanded(true)
    }
  }

  return (
    <div>
      <div
        className={`fm-tree-item ${isActive ? 'active' : ''}`}
        style={{ paddingLeft: `${level * 12 + 16}px` }}
        onClick={handleClick}
        title={item.name}
      >
        {hasChildren && (
          <div className="fm-tree-item-toggle" onClick={handleToggle}>
            {isExpanded ? <ChevronDownIcon /> : <ChevronRightIcon />}
          </div>
        )}
        {!hasChildren && <div className="fm-tree-spacer" />}
        <FolderIcon className="fm-tree-item-icon" />
        <span className="fm-tree-item-name">{item.name}</span>
      </div>
      {hasChildren && isExpanded && (
        <div className="fm-tree-children">
          {item.children!.map((child) => (
            <TreeItem
              key={child.path}
              item={child}
              currentPath={currentPath}
              onNavigate={onNavigate}
              level={level + 1}
            />
          ))}
        </div>
      )}
    </div>
  )
}

export const FolderTree: React.FC<FolderTreeProps> = ({ tree, currentPath, onNavigate }) => {
  return (
    <div className="fm-tree">
      <div
        className={`fm-tree-item ${currentPath === '/' ? 'active' : ''}`}
        onClick={() => onNavigate('/')}
        title="Home"
      >
        <FolderIcon className="fm-tree-item-icon" />
        <span className="fm-tree-item-name">Home</span>
      </div>
      {tree.map((item) => (
        <TreeItem
          key={item.path}
          item={item}
          currentPath={currentPath}
          onNavigate={onNavigate}
          level={0}
        />
      ))}
    </div>
  )
}
