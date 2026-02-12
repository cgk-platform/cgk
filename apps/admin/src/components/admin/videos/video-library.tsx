'use client'

import { Button, cn, Input } from '@cgk/ui'
import {
  Clock,
  Filter,
  Grid3X3,
  List,
  MoreHorizontal,
  Play,
  Search,
  Upload,
} from 'lucide-react'
import { useState } from 'react'

import type { Video, VideoStatus } from '@cgk/video'

import { StatusBadge } from './status-indicator'

interface VideoLibraryProps {
  videos: Video[]
  totalCount: number
  isLoading?: boolean
  onVideoClick: (video: Video) => void
  onUploadClick: () => void
  onSearch: (query: string) => void
  onFilterStatus: (status: VideoStatus | null) => void
  className?: string
}

/**
 * Video library grid/list view
 *
 * Features:
 * - Grid and list view toggle
 * - Search and filter
 * - Video thumbnails with duration overlay
 * - Status badges
 */
export function VideoLibrary({
  videos,
  totalCount,
  isLoading,
  onVideoClick,
  onUploadClick,
  onSearch,
  onFilterStatus,
  className,
}: VideoLibraryProps) {
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<VideoStatus | null>(null)

  const handleSearch = (query: string) => {
    setSearchQuery(query)
    onSearch(query)
  }

  const handleStatusFilter = (status: VideoStatus | null) => {
    setStatusFilter(status)
    onFilterStatus(status)
  }

  return (
    <div className={cn('flex flex-col gap-4', className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold">Video Library</h2>
          <p className="text-sm text-muted-foreground">
            {totalCount} video{totalCount !== 1 ? 's' : ''}
          </p>
        </div>
        <Button onClick={onUploadClick}>
          <Upload className="mr-2 h-4 w-4" />
          Upload Video
        </Button>
      </div>

      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-4">
        {/* Search */}
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={(e) => handleSearch(e.target.value)}
            placeholder="Search videos..."
            className="pl-9"
          />
        </div>

        {/* Status filter */}
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <div className="flex gap-1">
            {(['all', 'ready', 'processing', 'error'] as const).map((status) => (
              <button
                key={status}
                onClick={() => handleStatusFilter(status === 'all' ? null : status)}
                className={cn(
                  'rounded-md px-3 py-1.5 text-sm transition-colors',
                  (statusFilter === null && status === 'all') ||
                    statusFilter === status
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted hover:bg-muted/80'
                )}
              >
                {status === 'all' ? 'All' : status.charAt(0).toUpperCase() + status.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {/* View toggle */}
        <div className="flex rounded-md border">
          <button
            onClick={() => setViewMode('grid')}
            className={cn(
              'flex h-9 w-9 items-center justify-center transition-colors',
              viewMode === 'grid'
                ? 'bg-muted'
                : 'hover:bg-muted/50'
            )}
            title="Grid view"
          >
            <Grid3X3 className="h-4 w-4" />
          </button>
          <button
            onClick={() => setViewMode('list')}
            className={cn(
              'flex h-9 w-9 items-center justify-center transition-colors',
              viewMode === 'list'
                ? 'bg-muted'
                : 'hover:bg-muted/50'
            )}
            title="List view"
          >
            <List className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Video grid/list */}
      {isLoading ? (
        <div className="flex h-64 items-center justify-center">
          <div className="text-center">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent mx-auto" />
            <p className="mt-2 text-sm text-muted-foreground">Loading videos...</p>
          </div>
        </div>
      ) : videos.length === 0 ? (
        <div className="flex h-64 flex-col items-center justify-center rounded-lg border border-dashed">
          <Play className="h-12 w-12 text-muted-foreground/50" />
          <p className="mt-4 text-lg font-medium">No videos yet</p>
          <p className="text-sm text-muted-foreground">
            Upload your first video to get started
          </p>
          <Button className="mt-4" onClick={onUploadClick}>
            <Upload className="mr-2 h-4 w-4" />
            Upload Video
          </Button>
        </div>
      ) : viewMode === 'grid' ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {videos.map((video) => (
            <VideoCard
              key={video.id}
              video={video}
              onClick={() => onVideoClick(video)}
            />
          ))}
        </div>
      ) : (
        <div className="space-y-2">
          {videos.map((video) => (
            <VideoRow
              key={video.id}
              video={video}
              onClick={() => onVideoClick(video)}
            />
          ))}
        </div>
      )}
    </div>
  )
}

interface VideoCardProps {
  video: Video
  onClick: () => void
}

function VideoCard({ video, onClick }: VideoCardProps) {
  const thumbnailUrl = video.thumbnailUrl ||
    (video.muxPlaybackId
      ? `https://image.mux.com/${video.muxPlaybackId}/thumbnail.jpg?width=480`
      : null)

  return (
    <div
      onClick={onClick}
      className="group cursor-pointer overflow-hidden rounded-lg border bg-card transition-shadow hover:shadow-lg"
    >
      {/* Thumbnail */}
      <div className="relative aspect-video bg-muted">
        {thumbnailUrl ? (
          <img
            src={thumbnailUrl}
            alt={video.title}
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="flex h-full items-center justify-center">
            <Play className="h-12 w-12 text-muted-foreground/30" />
          </div>
        )}

        {/* Play overlay */}
        <div className="absolute inset-0 flex items-center justify-center bg-black/0 opacity-0 transition-all group-hover:bg-black/40 group-hover:opacity-100">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white/90">
            <Play className="h-6 w-6 text-black ml-0.5" />
          </div>
        </div>

        {/* Duration */}
        {video.durationSeconds && (
          <div className="absolute bottom-2 right-2 rounded bg-black/80 px-1.5 py-0.5 text-xs font-medium text-white">
            {formatDuration(video.durationSeconds)}
          </div>
        )}

        {/* Status badge */}
        {video.status !== 'ready' && (
          <div className="absolute left-2 top-2">
            <StatusBadge status={video.status} />
          </div>
        )}
      </div>

      {/* Info */}
      <div className="p-3">
        <h3 className="truncate font-medium">{video.title}</h3>
        <div className="mt-1 flex items-center gap-3 text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <Clock className="h-3 w-3" />
            {formatRelativeDate(video.createdAt)}
          </span>
        </div>
      </div>
    </div>
  )
}

interface VideoRowProps {
  video: Video
  onClick: () => void
}

function VideoRow({ video, onClick }: VideoRowProps) {
  const thumbnailUrl = video.thumbnailUrl ||
    (video.muxPlaybackId
      ? `https://image.mux.com/${video.muxPlaybackId}/thumbnail.jpg?width=160`
      : null)

  return (
    <div
      onClick={onClick}
      className="group flex cursor-pointer items-center gap-4 rounded-lg border bg-card p-3 transition-colors hover:bg-muted/50"
    >
      {/* Thumbnail */}
      <div className="relative h-16 w-28 shrink-0 overflow-hidden rounded bg-muted">
        {thumbnailUrl ? (
          <img
            src={thumbnailUrl}
            alt={video.title}
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="flex h-full items-center justify-center">
            <Play className="h-6 w-6 text-muted-foreground/30" />
          </div>
        )}
        {video.durationSeconds && (
          <div className="absolute bottom-1 right-1 rounded bg-black/80 px-1 py-0.5 text-[10px] font-medium text-white">
            {formatDuration(video.durationSeconds)}
          </div>
        )}
      </div>

      {/* Info */}
      <div className="min-w-0 flex-1">
        <h3 className="truncate font-medium">{video.title}</h3>
        {video.description && (
          <p className="mt-0.5 truncate text-sm text-muted-foreground">
            {video.description}
          </p>
        )}
        <div className="mt-1 flex items-center gap-3 text-xs text-muted-foreground">
          <span>{formatRelativeDate(video.createdAt)}</span>
          <StatusBadge status={video.status} />
        </div>
      </div>

      {/* Actions */}
      <button
        onClick={(e) => {
          e.stopPropagation()
          // Open context menu
        }}
        className="rounded p-2 text-muted-foreground opacity-0 transition-opacity hover:bg-muted group-hover:opacity-100"
      >
        <MoreHorizontal className="h-4 w-4" />
      </button>
    </div>
  )
}

function formatDuration(seconds: number): string {
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  const secs = Math.floor(seconds % 60)

  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }
  return `${minutes}:${secs.toString().padStart(2, '0')}`
}

function formatRelativeDate(date: Date): string {
  const now = new Date()
  const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24))

  if (diffDays === 0) return 'Today'
  if (diffDays === 1) return 'Yesterday'
  if (diffDays < 7) return `${diffDays} days ago`
  if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`
  if (diffDays < 365) return `${Math.floor(diffDays / 30)} months ago`
  return `${Math.floor(diffDays / 365)} years ago`
}
