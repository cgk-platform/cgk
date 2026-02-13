'use client'

import { Button, cn, Input, Textarea } from '@cgk-platform/ui'
import {
  X,
  Download,
  Heart,
  Trash2,
  ExternalLink,
  Copy,
  FileImage,
  FileVideo,
  FileAudio,
  FileText,
  Tag,
  Folder,
  ChevronLeft,
  ChevronRight,
  Shield,
} from 'lucide-react'
import Image from 'next/image'
import { useState, useEffect } from 'react'

import type { Asset, AssetType, Collection } from '@cgk-platform/dam'

export interface AssetDetailModalProps {
  asset: Asset | null
  isOpen: boolean
  onClose: () => void
  onSave?: (updates: Partial<Asset>) => Promise<void>
  onDelete?: (assetId: string) => Promise<void>
  onDownload?: (assetId: string) => void
  onFavorite?: (assetId: string) => Promise<void>
  onNavigate?: (direction: 'prev' | 'next') => void
  hasNext?: boolean
  hasPrev?: boolean
  collections?: Collection[]
  isLoading?: boolean
}

const assetTypeIcons: Record<AssetType, React.ComponentType<{ className?: string }>> = {
  image: FileImage,
  video: FileVideo,
  audio: FileAudio,
  document: FileText,
}

function formatFileSize(bytes: number | null): string {
  if (!bytes) return '--'
  const units = ['B', 'KB', 'MB', 'GB']
  let size = bytes
  let unitIndex = 0
  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024
    unitIndex++
  }
  return `${size.toFixed(unitIndex === 0 ? 0 : 1)} ${units[unitIndex]}`
}

function formatDate(date: string | null): string {
  if (!date) return '--'
  return new Date(date).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function AssetDetailModal({
  asset,
  isOpen,
  onClose,
  onSave,
  onDelete,
  onDownload,
  onFavorite,
  onNavigate,
  hasNext,
  hasPrev,
  collections = [],
}: AssetDetailModalProps) {
  const [activeTab, setActiveTab] = useState<'preview' | 'metadata' | 'rights'>('preview')
  const [editedTitle, setEditedTitle] = useState('')
  const [editedDescription, setEditedDescription] = useState('')
  const [editedTags, setEditedTags] = useState<string[]>([])
  const [newTag, setNewTag] = useState('')
  const [isDirty, setIsDirty] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [imageError, setImageError] = useState(false)

  // Reset state when asset changes
  useEffect(() => {
    if (asset) {
      setEditedTitle(asset.title)
      setEditedDescription(asset.description || '')
      setEditedTags([...asset.manual_tags])
      setIsDirty(false)
      setImageError(false)
    }
  }, [asset])

  // Handle keyboard navigation
  useEffect(() => {
    if (!isOpen) return

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        onClose()
      } else if (e.key === 'ArrowLeft' && hasPrev && onNavigate) {
        onNavigate('prev')
      } else if (e.key === 'ArrowRight' && hasNext && onNavigate) {
        onNavigate('next')
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, onClose, onNavigate, hasNext, hasPrev])

  const handleSave = async () => {
    if (!asset || !onSave || !isDirty) return

    setIsSaving(true)
    try {
      await onSave({
        title: editedTitle,
        description: editedDescription || null,
        manual_tags: editedTags,
      })
      setIsDirty(false)
    } finally {
      setIsSaving(false)
    }
  }

  const handleAddTag = () => {
    const tag = newTag.trim().toLowerCase()
    if (tag && !editedTags.includes(tag)) {
      setEditedTags([...editedTags, tag])
      setIsDirty(true)
    }
    setNewTag('')
  }

  const handleRemoveTag = (tag: string) => {
    setEditedTags(editedTags.filter(t => t !== tag))
    setIsDirty(true)
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
  }

  if (!isOpen || !asset) return null

  const TypeIcon = assetTypeIcons[asset.asset_type]

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-slate-950/90 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative flex h-[90vh] w-[90vw] max-w-7xl overflow-hidden rounded-2xl border border-slate-700 bg-slate-900 shadow-2xl">
        {/* Navigation arrows */}
        {onNavigate && (
          <>
            {hasPrev && (
              <button
                onClick={() => onNavigate('prev')}
                className="absolute left-4 top-1/2 z-10 -translate-y-1/2 rounded-full bg-slate-800/80 p-3 text-slate-300 backdrop-blur-sm hover:bg-slate-700 hover:text-white"
              >
                <ChevronLeft className="h-6 w-6" />
              </button>
            )}
            {hasNext && (
              <button
                onClick={() => onNavigate('next')}
                className="absolute right-4 top-1/2 z-10 -translate-y-1/2 rounded-full bg-slate-800/80 p-3 text-slate-300 backdrop-blur-sm hover:bg-slate-700 hover:text-white"
              >
                <ChevronRight className="h-6 w-6" />
              </button>
            )}
          </>
        )}

        {/* Preview area */}
        <div className="relative flex flex-1 items-center justify-center bg-slate-950 p-8">
          {asset.asset_type === 'image' && asset.file_url && !imageError ? (
            <Image
              src={asset.file_url}
              alt={asset.title}
              fill
              className="object-contain p-8"
              onError={() => setImageError(true)}
            />
          ) : asset.asset_type === 'video' && asset.file_url ? (
            <video
              src={asset.file_url}
              controls
              className="max-h-full max-w-full"
            />
          ) : asset.asset_type === 'audio' && asset.file_url ? (
            <div className="flex flex-col items-center gap-6">
              <div className="flex h-32 w-32 items-center justify-center rounded-full bg-amber-500/10">
                <FileAudio className="h-16 w-16 text-amber-500" />
              </div>
              <audio src={asset.file_url} controls className="w-96" />
            </div>
          ) : (
            <div className="flex flex-col items-center gap-4">
              <TypeIcon className="h-24 w-24 text-slate-600" />
              <p className="text-slate-500">Preview not available</p>
              {asset.file_url && (
                <Button variant="outline" asChild>
                  <a href={asset.file_url} target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="mr-2 h-4 w-4" />
                    Open in new tab
                  </a>
                </Button>
              )}
            </div>
          )}

          {/* Close button */}
          <button
            onClick={onClose}
            className="absolute right-4 top-4 rounded-full bg-slate-800/80 p-2 text-slate-300 backdrop-blur-sm hover:bg-slate-700 hover:text-white"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Details panel */}
        <div className="flex w-96 flex-col border-l border-slate-800 bg-slate-900">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-slate-800 p-4">
            <div className="flex items-center gap-2">
              <TypeIcon className="h-5 w-5 text-slate-400" />
              <span className="text-sm font-medium uppercase text-slate-400">
                {asset.asset_type}
              </span>
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={() => onFavorite?.(asset.id)}
                className="rounded-md p-1.5 text-slate-400 hover:bg-slate-800 hover:text-rose-400"
              >
                <Heart className={cn(
                  'h-4 w-4',
                  asset.is_favorite && 'fill-rose-500 text-rose-500'
                )} />
              </button>
              <button
                onClick={() => onDownload?.(asset.id)}
                className="rounded-md p-1.5 text-slate-400 hover:bg-slate-800 hover:text-slate-200"
              >
                <Download className="h-4 w-4" />
              </button>
              <button
                onClick={() => onDelete?.(asset.id)}
                className="rounded-md p-1.5 text-slate-400 hover:bg-slate-800 hover:text-red-400"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex border-b border-slate-800">
            {(['preview', 'metadata', 'rights'] as const).map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={cn(
                  'flex-1 py-3 text-sm font-medium capitalize transition-colors',
                  activeTab === tab
                    ? 'border-b-2 border-amber-500 text-amber-500'
                    : 'text-slate-500 hover:text-slate-300'
                )}
              >
                {tab}
              </button>
            ))}
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-4">
            {activeTab === 'preview' && (
              <div className="space-y-4">
                {/* Title */}
                <div>
                  <label className="mb-1.5 block text-xs font-medium uppercase text-slate-500">
                    Title
                  </label>
                  <Input
                    value={editedTitle}
                    onChange={(e) => { setEditedTitle(e.target.value); setIsDirty(true) }}
                    className="bg-slate-800 border-slate-700"
                  />
                </div>

                {/* Description */}
                <div>
                  <label className="mb-1.5 block text-xs font-medium uppercase text-slate-500">
                    Description
                  </label>
                  <Textarea
                    value={editedDescription}
                    onChange={(e) => { setEditedDescription(e.target.value); setIsDirty(true) }}
                    rows={3}
                    className="bg-slate-800 border-slate-700"
                  />
                </div>

                {/* Tags */}
                <div>
                  <label className="mb-1.5 block text-xs font-medium uppercase text-slate-500">
                    Tags
                  </label>
                  <div className="flex flex-wrap gap-1 mb-2">
                    {editedTags.map(tag => (
                      <span
                        key={tag}
                        className="flex items-center gap-1 rounded-full bg-amber-500/20 px-2 py-0.5 text-xs text-amber-400"
                      >
                        {tag}
                        <button onClick={() => handleRemoveTag(tag)} className="hover:text-amber-200">
                          <X className="h-3 w-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <Input
                      value={newTag}
                      onChange={(e) => setNewTag(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleAddTag()}
                      placeholder="Add tag..."
                      className="bg-slate-800 border-slate-700"
                    />
                    <Button size="sm" variant="outline" onClick={handleAddTag}>
                      <Tag className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                {/* AI tags */}
                {asset.ai_tags.length > 0 && (
                  <div>
                    <label className="mb-1.5 block text-xs font-medium uppercase text-slate-500">
                      AI Tags
                    </label>
                    <div className="flex flex-wrap gap-1">
                      {asset.ai_tags.map(tag => (
                        <span
                          key={tag}
                          className="rounded-full bg-violet-500/20 px-2 py-0.5 text-xs text-violet-400"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Collections */}
                {collections.length > 0 && (
                  <div>
                    <label className="mb-1.5 block text-xs font-medium uppercase text-slate-500">
                      In Collections
                    </label>
                    <div className="space-y-1">
                      {collections.map(c => (
                        <div key={c.id} className="flex items-center gap-2 text-sm text-slate-300">
                          <Folder className="h-4 w-4 text-amber-500" />
                          {c.name}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'metadata' && (
              <div className="space-y-3">
                <InfoRow label="File size" value={formatFileSize(asset.file_size_bytes)} />
                {asset.width && asset.height && (
                  <InfoRow label="Dimensions" value={`${asset.width} x ${asset.height}`} />
                )}
                {asset.duration_seconds && (
                  <InfoRow
                    label="Duration"
                    value={`${Math.floor(asset.duration_seconds / 60)}:${(asset.duration_seconds % 60).toString().padStart(2, '0')}`}
                  />
                )}
                <InfoRow label="MIME type" value={asset.mime_type} />
                {asset.file_extension && (
                  <InfoRow label="Extension" value={asset.file_extension.toUpperCase()} />
                )}
                <InfoRow label="Quality" value={asset.quality_variant} />
                <InfoRow label="Created" value={formatDate(asset.created_at)} />
                <InfoRow label="Updated" value={formatDate(asset.updated_at)} />
                <InfoRow label="Views" value={asset.view_count.toString()} />
                <InfoRow label="Downloads" value={asset.download_count.toString()} />

                {/* File URL */}
                <div>
                  <label className="mb-1.5 block text-xs font-medium uppercase text-slate-500">
                    File URL
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      value={asset.file_url}
                      readOnly
                      className="flex-1 truncate rounded-lg bg-slate-800 px-3 py-2 text-xs text-slate-400"
                    />
                    <button
                      onClick={() => copyToClipboard(asset.file_url)}
                      className="rounded-lg p-2 text-slate-400 hover:bg-slate-800 hover:text-slate-200"
                    >
                      <Copy className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                {asset.file_hash && (
                  <InfoRow label="File hash" value={asset.file_hash.substring(0, 16) + '...'} />
                )}
              </div>
            )}

            {activeTab === 'rights' && (
              <div className="space-y-4">
                <div className="flex items-center gap-3 rounded-lg border border-slate-700 bg-slate-800/50 p-3">
                  <Shield className={cn(
                    'h-8 w-8',
                    asset.rights_status === 'active' ? 'text-teal-500' :
                    asset.rights_status === 'pending' ? 'text-amber-500' :
                    asset.rights_status === 'expired' ? 'text-red-500' :
                    'text-slate-500'
                  )} />
                  <div>
                    <p className="font-medium capitalize text-slate-200">{asset.rights_status}</p>
                    <p className="text-sm text-slate-500">Usage rights status</p>
                  </div>
                </div>

                {asset.rights_holder && (
                  <InfoRow label="Rights holder" value={asset.rights_holder} />
                )}
                {asset.rights_expires_at && (
                  <InfoRow label="Expires" value={formatDate(asset.rights_expires_at)} />
                )}
                {asset.rights_notes && (
                  <div>
                    <label className="mb-1.5 block text-xs font-medium uppercase text-slate-500">
                      Notes
                    </label>
                    <p className="text-sm text-slate-300">{asset.rights_notes}</p>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Footer */}
          {isDirty && (
            <div className="flex items-center justify-end gap-2 border-t border-slate-800 p-4">
              <Button
                variant="ghost"
                onClick={() => {
                  if (asset) {
                    setEditedTitle(asset.title)
                    setEditedDescription(asset.description || '')
                    setEditedTags([...asset.manual_tags])
                    setIsDirty(false)
                  }
                }}
              >
                Cancel
              </Button>
              <Button onClick={handleSave} disabled={isSaving}>
                {isSaving ? 'Saving...' : 'Save Changes'}
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-sm text-slate-500">{label}</span>
      <span className="text-sm text-slate-300">{value}</span>
    </div>
  )
}
