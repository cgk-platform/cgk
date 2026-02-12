'use client'

import { Button, cn } from '@cgk/ui'
import {
  X,
  Folder,
  Tag,
  Trash2,
  Archive,
  Heart,
  Download,
  MoreHorizontal,
  CheckCircle2,
} from 'lucide-react'
import { useState, useRef, useEffect } from 'react'

import type { BulkOperation } from '@cgk/dam'

export interface BulkActionsBarProps {
  selectedCount: number
  onClose: () => void
  onAction: (operation: BulkOperation, options?: Record<string, unknown>) => void
  collections?: { id: string; name: string }[]
  isLoading?: boolean
}

export function BulkActionsBar({
  selectedCount,
  onClose,
  onAction,
  collections = [],
  isLoading = false,
}: BulkActionsBarProps) {
  const [showMoveMenu, setShowMoveMenu] = useState(false)
  const [showTagInput, setShowTagInput] = useState(false)
  const [tagInput, setTagInput] = useState('')
  const [showMoreMenu, setShowMoreMenu] = useState(false)

  const moveMenuRef = useRef<HTMLDivElement>(null)
  const moreMenuRef = useRef<HTMLDivElement>(null)

  // Close menus on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (moveMenuRef.current && !moveMenuRef.current.contains(e.target as Node)) {
        setShowMoveMenu(false)
      }
      if (moreMenuRef.current && !moreMenuRef.current.contains(e.target as Node)) {
        setShowMoreMenu(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleAddTags = () => {
    if (tagInput.trim()) {
      const tags = tagInput.split(',').map(t => t.trim()).filter(t => t)
      onAction('tag', { tags_to_add: tags })
      setTagInput('')
      setShowTagInput(false)
    }
  }

  if (selectedCount === 0) return null

  return (
    <div className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2">
      <div className={cn(
        'flex items-center gap-3 rounded-2xl border border-slate-700 bg-slate-900/95 px-4 py-3 shadow-2xl backdrop-blur-sm',
        'animate-in slide-in-from-bottom-4 duration-300'
      )}>
        {/* Selection count */}
        <div className="flex items-center gap-2 border-r border-slate-700 pr-4">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-amber-500">
            <CheckCircle2 className="h-4 w-4 text-slate-900" />
          </div>
          <div>
            <p className="text-sm font-medium text-slate-200">
              {selectedCount} selected
            </p>
          </div>
        </div>

        {/* Move to collection */}
        <div className="relative" ref={moveMenuRef}>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowMoveMenu(!showMoveMenu)}
            disabled={isLoading || collections.length === 0}
            className="gap-2"
          >
            <Folder className="h-4 w-4" />
            Move
          </Button>

          {showMoveMenu && (
            <div className="absolute bottom-full left-0 mb-2 w-48 rounded-lg border border-slate-700 bg-slate-800 py-1 shadow-xl">
              <p className="px-3 py-1.5 text-xs font-medium uppercase text-slate-500">
                Move to collection
              </p>
              {collections.length === 0 ? (
                <p className="px-3 py-2 text-sm text-slate-400">No collections</p>
              ) : (
                collections.map(collection => (
                  <button
                    key={collection.id}
                    onClick={() => {
                      onAction('move', { collection_id: collection.id })
                      setShowMoveMenu(false)
                    }}
                    className="flex w-full items-center gap-2 px-3 py-2 text-sm text-slate-300 hover:bg-slate-700"
                  >
                    <Folder className="h-4 w-4 text-amber-500" />
                    {collection.name}
                  </button>
                ))
              )}
            </div>
          )}
        </div>

        {/* Add tags */}
        <div className="relative">
          {showTagInput ? (
            <div className="flex items-center gap-2">
              <input
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleAddTags()
                  if (e.key === 'Escape') setShowTagInput(false)
                }}
                placeholder="tag1, tag2, ..."
                autoFocus
                className="w-40 rounded-lg border border-slate-600 bg-slate-800 px-3 py-1.5 text-sm text-slate-200 placeholder:text-slate-500 focus:border-amber-500 focus:outline-none"
              />
              <Button size="sm" onClick={handleAddTags} disabled={!tagInput.trim()}>
                Add
              </Button>
              <button
                onClick={() => setShowTagInput(false)}
                className="text-slate-500 hover:text-slate-300"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          ) : (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowTagInput(true)}
              disabled={isLoading}
              className="gap-2"
            >
              <Tag className="h-4 w-4" />
              Tag
            </Button>
          )}
        </div>

        {/* Favorite */}
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onAction('favorite')}
          disabled={isLoading}
          className="gap-2"
        >
          <Heart className="h-4 w-4" />
          Favorite
        </Button>

        {/* Download */}
        <Button
          variant="ghost"
          size="sm"
          onClick={() => {/* Download logic */}}
          disabled={isLoading}
          className="gap-2"
        >
          <Download className="h-4 w-4" />
          Download
        </Button>

        {/* More actions */}
        <div className="relative" ref={moreMenuRef}>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowMoreMenu(!showMoreMenu)}
            disabled={isLoading}
          >
            <MoreHorizontal className="h-4 w-4" />
          </Button>

          {showMoreMenu && (
            <div className="absolute bottom-full right-0 mb-2 w-40 rounded-lg border border-slate-700 bg-slate-800 py-1 shadow-xl">
              <button
                onClick={() => {
                  onAction('archive')
                  setShowMoreMenu(false)
                }}
                className="flex w-full items-center gap-2 px-3 py-2 text-sm text-slate-300 hover:bg-slate-700"
              >
                <Archive className="h-4 w-4" />
                Archive
              </button>
              <button
                onClick={() => {
                  onAction('unfavorite')
                  setShowMoreMenu(false)
                }}
                className="flex w-full items-center gap-2 px-3 py-2 text-sm text-slate-300 hover:bg-slate-700"
              >
                <Heart className="h-4 w-4" />
                Unfavorite
              </button>
              <div className="my-1 border-t border-slate-700" />
              <button
                onClick={() => {
                  onAction('delete')
                  setShowMoreMenu(false)
                }}
                className="flex w-full items-center gap-2 px-3 py-2 text-sm text-red-400 hover:bg-red-500/10"
              >
                <Trash2 className="h-4 w-4" />
                Delete
              </button>
            </div>
          )}
        </div>

        {/* Divider */}
        <div className="h-6 w-px bg-slate-700" />

        {/* Close */}
        <button
          onClick={onClose}
          className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-slate-200"
        >
          <X className="h-5 w-5" />
        </button>
      </div>
    </div>
  )
}
