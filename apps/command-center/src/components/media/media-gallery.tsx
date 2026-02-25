'use client'

import { Button } from '@cgk-platform/ui'
import { Play } from 'lucide-react'

interface MediaFile {
  name: string
  type: 'image' | 'video'
  size: number
  mtime: string
}

interface MediaGalleryProps {
  files: MediaFile[]
  profile: string
  hasMore: boolean
  loadingMore: boolean
  onLoadMore: () => void
  onSelect: (file: MediaFile) => void
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes}B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)}KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)}MB`
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function MediaGallery({ files, profile, hasMore, loadingMore, onLoadMore, onSelect }: MediaGalleryProps) {
  if (files.length === 0) {
    return (
      <div className="rounded-lg border bg-card p-8 text-center text-sm text-muted-foreground">
        No media files
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
        {files.map((file) => (
          <button
            key={file.name}
            onClick={() => onSelect(file)}
            className="group overflow-hidden rounded-lg border bg-card transition-all hover:shadow-lg hover:-translate-y-0.5"
          >
            <div className="relative aspect-square bg-muted">
              {file.type === 'image' ? (
                <img
                  src={`/api/openclaw/${profile}/media/${encodeURIComponent(file.name)}`}
                  alt={file.name}
                  className="h-full w-full object-cover"
                  loading="lazy"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center bg-navy-100">
                  <Play className="h-10 w-10 text-muted-foreground/50" />
                </div>
              )}
              {file.type === 'video' && (
                <div className="absolute left-2 top-2 rounded bg-black/60 px-1.5 py-0.5 text-2xs font-medium text-white">
                  VIDEO
                </div>
              )}
            </div>
            <div className="p-2">
              <p className="truncate text-xs font-medium" title={file.name}>
                {file.name}
              </p>
              <div className="flex items-center justify-between text-2xs text-muted-foreground">
                <span>{formatDate(file.mtime)}</span>
                <span>{formatSize(file.size)}</span>
              </div>
            </div>
          </button>
        ))}
      </div>

      {hasMore && (
        <div className="flex justify-center">
          <Button variant="outline" size="sm" onClick={onLoadMore} disabled={loadingMore}>
            {loadingMore ? 'Loading...' : 'Load More'}
          </Button>
        </div>
      )}
    </div>
  )
}
