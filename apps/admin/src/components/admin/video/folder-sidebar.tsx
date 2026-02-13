'use client'

import { cn } from '@cgk-platform/ui'
import {
  ChevronDown,
  ChevronRight,
  Folder,
  FolderOpen,
  FolderPlus,
  MoreHorizontal,
  Pencil,
  Trash2,
  Video,
} from 'lucide-react'
import Link from 'next/link'
import { usePathname, useSearchParams } from 'next/navigation'
import { useState } from 'react'

import {
  createFolderAction,
  deleteFolderAction,
  renameFolderAction,
} from '@/lib/video/actions'
import { buildFolderTree, type FolderNode } from '@/lib/video/types'

import type { VideoFolder } from '@cgk-platform/video'

interface FolderSidebarProps {
  folders: VideoFolder[]
  totalVideoCount: number
}

export function FolderSidebar({ folders, totalVideoCount }: FolderSidebarProps) {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const currentFolderId = searchParams.get('folder')
  const [isCreating, setIsCreating] = useState(false)
  const [newFolderName, setNewFolderName] = useState('')
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set())

  const folderTree = buildFolderTree(folders)

  const handleCreateFolder = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newFolderName.trim()) return

    const result = await createFolderAction({ name: newFolderName.trim() })
    if (result.success) {
      setNewFolderName('')
      setIsCreating(false)
      // Folder will appear on next refresh/revalidation
    }
  }

  const toggleExpanded = (folderId: string) => {
    setExpandedFolders((prev) => {
      const next = new Set(prev)
      if (next.has(folderId)) {
        next.delete(folderId)
      } else {
        next.add(folderId)
      }
      return next
    })
  }

  const buildUrl = (folderId: string | null) => {
    const params = new URLSearchParams(searchParams.toString())
    if (folderId) {
      params.set('folder', folderId)
    } else {
      params.delete('folder')
    }
    params.delete('page') // Reset pagination
    return `${pathname}?${params.toString()}`
  }

  return (
    <aside className="w-64 flex-shrink-0 border-r border-zinc-800 bg-zinc-900/50">
      <div className="flex h-full flex-col">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-zinc-800 px-4 py-3">
          <h2 className="text-sm font-semibold text-zinc-200">Library</h2>
          <button
            onClick={() => setIsCreating(true)}
            className="rounded p-1 text-zinc-400 transition-colors hover:bg-zinc-800 hover:text-white"
            title="New folder"
          >
            <FolderPlus className="h-4 w-4" />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto p-2">
          {/* All Videos */}
          <Link
            href={buildUrl(null)}
            className={cn(
              'flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors',
              !currentFolderId
                ? 'bg-primary/10 text-primary'
                : 'text-zinc-300 hover:bg-zinc-800 hover:text-white',
            )}
          >
            <Video className="h-4 w-4" />
            <span className="flex-1">All Videos</span>
            <span className="text-xs text-zinc-500">{totalVideoCount}</span>
          </Link>

          {/* New Folder Input */}
          {isCreating && (
            <form onSubmit={handleCreateFolder} className="mt-2 px-2">
              <input
                type="text"
                value={newFolderName}
                onChange={(e) => setNewFolderName(e.target.value)}
                placeholder="Folder name..."
                className="w-full rounded-md border border-zinc-700 bg-zinc-800 px-3 py-1.5 text-sm text-white placeholder:text-zinc-500 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                autoFocus
                onBlur={() => {
                  if (!newFolderName.trim()) {
                    setIsCreating(false)
                  }
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Escape') {
                    setIsCreating(false)
                    setNewFolderName('')
                  }
                }}
              />
            </form>
          )}

          {/* Folder Tree */}
          {folderTree.length > 0 && (
            <div className="mt-4 space-y-0.5">
              <p className="mb-2 px-3 text-xs font-medium uppercase tracking-wider text-zinc-500">
                Folders
              </p>
              {folderTree.map((folder) => (
                <FolderItem
                  key={folder.id}
                  folder={folder}
                  currentFolderId={currentFolderId}
                  expandedFolders={expandedFolders}
                  onToggleExpanded={toggleExpanded}
                  buildUrl={buildUrl}
                  depth={0}
                />
              ))}
            </div>
          )}
        </nav>
      </div>
    </aside>
  )
}

function FolderItem({
  folder,
  currentFolderId,
  expandedFolders,
  onToggleExpanded,
  buildUrl,
  depth,
}: {
  folder: FolderNode
  currentFolderId: string | null
  expandedFolders: Set<string>
  onToggleExpanded: (id: string) => void
  buildUrl: (id: string | null) => string
  depth: number
}) {
  const isExpanded = expandedFolders.has(folder.id)
  const isActive = currentFolderId === folder.id
  const hasChildren = folder.children.length > 0

  const [showMenu, setShowMenu] = useState(false)
  const [isRenaming, setIsRenaming] = useState(false)
  const [newName, setNewName] = useState(folder.name)

  const handleRename = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newName.trim() || newName === folder.name) {
      setIsRenaming(false)
      setNewName(folder.name)
      return
    }

    await renameFolderAction(folder.id, newName.trim())
    setIsRenaming(false)
  }

  const handleDelete = async () => {
    if (!confirm(`Delete folder "${folder.name}"? Videos will be moved to root.`)) {
      return
    }
    await deleteFolderAction(folder.id)
    setShowMenu(false)
  }

  return (
    <div>
      <div
        className={cn(
          'group relative flex items-center rounded-lg transition-colors',
          isActive
            ? 'bg-primary/10 text-primary'
            : 'text-zinc-300 hover:bg-zinc-800 hover:text-white',
        )}
        style={{ paddingLeft: `${depth * 12 + 8}px` }}
      >
        {/* Expand/Collapse Button */}
        {hasChildren ? (
          <button
            onClick={() => onToggleExpanded(folder.id)}
            className="rounded p-1 hover:bg-zinc-700/50"
          >
            {isExpanded ? (
              <ChevronDown className="h-3 w-3" />
            ) : (
              <ChevronRight className="h-3 w-3" />
            )}
          </button>
        ) : (
          <span className="w-5" />
        )}

        {/* Folder Link */}
        {isRenaming ? (
          <form onSubmit={handleRename} className="flex-1 py-1">
            <input
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              className="w-full rounded border border-zinc-600 bg-zinc-800 px-2 py-1 text-sm text-white focus:border-primary focus:outline-none"
              autoFocus
              onBlur={handleRename}
              onKeyDown={(e) => {
                if (e.key === 'Escape') {
                  setIsRenaming(false)
                  setNewName(folder.name)
                }
              }}
            />
          </form>
        ) : (
          <Link
            href={buildUrl(folder.id)}
            className="flex flex-1 items-center gap-2 py-2 pr-2"
          >
            {isActive ? (
              <FolderOpen className="h-4 w-4" />
            ) : (
              <Folder className="h-4 w-4" />
            )}
            <span className="flex-1 truncate text-sm">{folder.name}</span>
          </Link>
        )}

        {/* Actions Menu */}
        <div className="relative">
          <button
            onClick={() => setShowMenu(!showMenu)}
            className="rounded p-1 opacity-0 transition-opacity hover:bg-zinc-700/50 group-hover:opacity-100"
          >
            <MoreHorizontal className="h-4 w-4" />
          </button>

          {showMenu && (
            <>
              <div
                className="fixed inset-0 z-10"
                onClick={() => setShowMenu(false)}
              />
              <div className="absolute right-0 top-full z-20 mt-1 w-32 rounded-lg border border-zinc-700 bg-zinc-800 py-1 shadow-xl">
                <button
                  onClick={() => {
                    setShowMenu(false)
                    setIsRenaming(true)
                  }}
                  className="flex w-full items-center gap-2 px-3 py-1.5 text-sm text-zinc-300 hover:bg-zinc-700 hover:text-white"
                >
                  <Pencil className="h-3 w-3" />
                  Rename
                </button>
                <button
                  onClick={handleDelete}
                  className="flex w-full items-center gap-2 px-3 py-1.5 text-sm text-red-400 hover:bg-red-500/10 hover:text-red-300"
                >
                  <Trash2 className="h-3 w-3" />
                  Delete
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Children */}
      {hasChildren && isExpanded && (
        <div>
          {folder.children.map((child) => (
            <FolderItem
              key={child.id}
              folder={child}
              currentFolderId={currentFolderId}
              expandedFolders={expandedFolders}
              onToggleExpanded={onToggleExpanded}
              buildUrl={buildUrl}
              depth={depth + 1}
            />
          ))}
        </div>
      )}
    </div>
  )
}
