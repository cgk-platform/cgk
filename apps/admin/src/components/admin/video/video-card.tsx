'use client'

import { cn } from '@cgk/ui'
import { getThumbnailUrl } from '@cgk/video'
import { Clock, Eye, Play, MoreVertical, Folder, Pencil, Trash2, Share2 } from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'
import { useState } from 'react'

import { VideoStatusBadge } from './video-status-badge'
import { formatDuration } from '@/lib/video/types'

import type { Video } from '@cgk/video'

interface VideoCardProps {
  video: Video
  viewCount?: number
  onDelete?: (videoId: string) => void
  onShare?: (videoId: string) => void
  onEdit?: (videoId: string) => void
}

export function VideoCard({
  video,
  viewCount = 0,
  onDelete,
  onShare,
  onEdit,
}: VideoCardProps) {
  const [showMenu, setShowMenu] = useState(false)
  const [imageError, setImageError] = useState(false)

  const thumbnailUrl = video.muxPlaybackId && !imageError
    ? getThumbnailUrl(video.muxPlaybackId, { width: 400, time: 2 })
    : null

  const isPlayable = video.status === 'ready' && video.muxPlaybackId

  return (
    <div className="group relative">
      {/* Thumbnail Container */}
      <Link
        href={`/admin/videos/${video.id}`}
        className={cn(
          'relative block aspect-video overflow-hidden rounded-lg',
          'bg-zinc-900 ring-1 ring-white/10',
          'transition-all duration-200',
          isPlayable && 'hover:ring-2 hover:ring-primary/50 hover:shadow-xl hover:shadow-primary/10',
        )}
      >
        {thumbnailUrl ? (
          <Image
            src={thumbnailUrl}
            alt={video.title}
            fill
            className="object-cover transition-transform duration-300 group-hover:scale-105"
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
            onError={() => setImageError(true)}
          />
        ) : (
          <div className="flex h-full items-center justify-center bg-gradient-to-br from-zinc-800 to-zinc-900">
            <Play className="h-12 w-12 text-zinc-600" />
          </div>
        )}

        {/* Gradient Overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />

        {/* Duration Badge */}
        {video.durationSeconds && video.durationSeconds > 0 && (
          <div className="absolute bottom-2 right-2 flex items-center gap-1 rounded bg-black/70 px-1.5 py-0.5 text-xs font-medium text-white backdrop-blur-sm">
            <Clock className="h-3 w-3" />
            {formatDuration(video.durationSeconds)}
          </div>
        )}

        {/* Play Button Overlay */}
        {isPlayable && (
          <div className="absolute inset-0 flex items-center justify-center opacity-0 transition-opacity duration-200 group-hover:opacity-100">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/90 shadow-lg backdrop-blur-sm">
              <Play className="h-6 w-6 text-white" fill="currentColor" />
            </div>
          </div>
        )}

        {/* Status Badge (non-ready videos) */}
        {video.status !== 'ready' && (
          <div className="absolute left-2 top-2">
            <VideoStatusBadge status={video.status} />
          </div>
        )}
      </Link>

      {/* Video Info */}
      <div className="mt-3 space-y-1">
        <div className="flex items-start justify-between gap-2">
          <Link
            href={`/admin/videos/${video.id}`}
            className="line-clamp-2 text-sm font-medium text-zinc-100 hover:text-white"
          >
            {video.title}
          </Link>

          {/* Actions Menu */}
          <div className="relative">
            <button
              onClick={() => setShowMenu(!showMenu)}
              className="rounded p-1 text-zinc-400 opacity-0 transition-opacity hover:bg-zinc-800 hover:text-zinc-100 group-hover:opacity-100"
            >
              <MoreVertical className="h-4 w-4" />
            </button>

            {showMenu && (
              <>
                <div
                  className="fixed inset-0 z-10"
                  onClick={() => setShowMenu(false)}
                />
                <div className="absolute right-0 top-full z-20 mt-1 w-40 rounded-lg border border-zinc-700 bg-zinc-800 py-1 shadow-xl">
                  <button
                    onClick={() => {
                      setShowMenu(false)
                      onEdit?.(video.id)
                    }}
                    className="flex w-full items-center gap-2 px-3 py-2 text-sm text-zinc-300 hover:bg-zinc-700 hover:text-white"
                  >
                    <Pencil className="h-4 w-4" />
                    Edit
                  </button>
                  <button
                    onClick={() => {
                      setShowMenu(false)
                      onShare?.(video.id)
                    }}
                    className="flex w-full items-center gap-2 px-3 py-2 text-sm text-zinc-300 hover:bg-zinc-700 hover:text-white"
                  >
                    <Share2 className="h-4 w-4" />
                    Share
                  </button>
                  <hr className="my-1 border-zinc-700" />
                  <button
                    onClick={() => {
                      setShowMenu(false)
                      onDelete?.(video.id)
                    }}
                    className="flex w-full items-center gap-2 px-3 py-2 text-sm text-red-400 hover:bg-red-500/10 hover:text-red-300"
                  >
                    <Trash2 className="h-4 w-4" />
                    Delete
                  </button>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Metadata Row */}
        <div className="flex items-center gap-3 text-xs text-zinc-500">
          {viewCount > 0 && (
            <span className="flex items-center gap-1">
              <Eye className="h-3 w-3" />
              {viewCount.toLocaleString()} views
            </span>
          )}
          {video.folderId && (
            <span className="flex items-center gap-1">
              <Folder className="h-3 w-3" />
            </span>
          )}
          <span>
            {new Date(video.createdAt).toLocaleDateString()}
          </span>
        </div>
      </div>
    </div>
  )
}
