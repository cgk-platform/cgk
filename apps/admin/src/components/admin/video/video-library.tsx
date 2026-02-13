'use client'

import { Button, cn } from '@cgk-platform/ui'
import {
  Grid,
  List,
  Plus,
  Search,
  Upload,
} from 'lucide-react'
import Link from 'next/link'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { useState, useTransition } from 'react'

import { UploadModal } from './upload-modal'
import { VideoCard } from './video-card'
import { VideoStatusBadge } from './video-status-badge'
import { deleteVideoAction } from '@/lib/video/actions'
import { formatDuration, type ViewMode } from '@/lib/video/types'

import type { Video, VideoStatus } from '@cgk-platform/video'

interface VideoLibraryProps {
  videos: Video[]
  totalCount: number
  currentPage: number
  totalPages: number
  currentFolderId: string | null
  currentStatus: VideoStatus | null
  currentSearch: string
  viewMode: ViewMode
}

const VIDEO_STATUSES: VideoStatus[] = ['ready', 'processing', 'uploading', 'error']

export function VideoLibrary({
  videos,
  totalCount,
  currentPage,
  totalPages,
  currentFolderId,
  currentStatus,
  currentSearch,
  viewMode: initialViewMode,
}: VideoLibraryProps) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [, startTransition] = useTransition()

  const [viewMode, setViewMode] = useState<ViewMode>(initialViewMode)
  const [showUploadModal, setShowUploadModal] = useState(false)
  const [searchValue, setSearchValue] = useState(currentSearch)

  const buildUrl = (updates: Record<string, string | null>) => {
    const params = new URLSearchParams(searchParams.toString())
    for (const [key, value] of Object.entries(updates)) {
      if (value === null) {
        params.delete(key)
      } else {
        params.set(key, value)
      }
    }
    return `${pathname}?${params.toString()}`
  }

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    startTransition(() => {
      router.push(buildUrl({ search: searchValue || null, page: null }))
    })
  }

  const handleStatusFilter = (status: VideoStatus | null) => {
    startTransition(() => {
      router.push(buildUrl({ status: status, page: null }))
    })
  }

  const handleDelete = async (videoId: string) => {
    if (!confirm('Are you sure you want to delete this video?')) return

    const result = await deleteVideoAction(videoId)
    if (result.success) {
      router.refresh()
    }
  }

  const handleUploadComplete = () => {
    router.refresh()
  }

  return (
    <div className="flex-1 space-y-4">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          {/* Search */}
          <form onSubmit={handleSearch} className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
            <input
              type="text"
              value={searchValue}
              onChange={(e) => setSearchValue(e.target.value)}
              placeholder="Search videos..."
              className="h-10 w-64 rounded-lg border border-zinc-700 bg-zinc-800 pl-10 pr-4 text-sm text-white placeholder:text-zinc-500 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </form>

          {/* Status Filter */}
          <div className="flex items-center gap-1 rounded-lg border border-zinc-700 bg-zinc-800 p-1">
            <button
              onClick={() => handleStatusFilter(null)}
              className={cn(
                'rounded px-3 py-1.5 text-xs font-medium transition-colors',
                !currentStatus
                  ? 'bg-zinc-700 text-white'
                  : 'text-zinc-400 hover:text-white',
              )}
            >
              All
            </button>
            {VIDEO_STATUSES.map((status) => (
              <button
                key={status}
                onClick={() => handleStatusFilter(status)}
                className={cn(
                  'rounded px-3 py-1.5 text-xs font-medium capitalize transition-colors',
                  currentStatus === status
                    ? 'bg-zinc-700 text-white'
                    : 'text-zinc-400 hover:text-white',
                )}
              >
                {status}
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* View Toggle */}
          <div className="flex items-center gap-1 rounded-lg border border-zinc-700 bg-zinc-800 p-1">
            <button
              onClick={() => setViewMode('grid')}
              className={cn(
                'rounded p-1.5 transition-colors',
                viewMode === 'grid'
                  ? 'bg-zinc-700 text-white'
                  : 'text-zinc-400 hover:text-white',
              )}
              title="Grid view"
            >
              <Grid className="h-4 w-4" />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={cn(
                'rounded p-1.5 transition-colors',
                viewMode === 'list'
                  ? 'bg-zinc-700 text-white'
                  : 'text-zinc-400 hover:text-white',
              )}
              title="List view"
            >
              <List className="h-4 w-4" />
            </button>
          </div>

          {/* Upload Button */}
          <Button onClick={() => setShowUploadModal(true)}>
            <Upload className="mr-2 h-4 w-4" />
            Upload
          </Button>
        </div>
      </div>

      {/* Results Info */}
      <div className="flex items-center justify-between text-sm text-zinc-400">
        <span>
          {totalCount === 0
            ? 'No videos found'
            : `${totalCount} video${totalCount === 1 ? '' : 's'}`}
        </span>
        {currentSearch && (
          <button
            onClick={() => {
              setSearchValue('')
              startTransition(() => {
                router.push(buildUrl({ search: null, page: null }))
              })
            }}
            className="text-primary hover:underline"
          >
            Clear search
          </button>
        )}
      </div>

      {/* Video Grid/List */}
      {videos.length === 0 ? (
        <EmptyState
          hasFilters={!!(currentSearch || currentStatus || currentFolderId)}
          onUpload={() => setShowUploadModal(true)}
        />
      ) : viewMode === 'grid' ? (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {videos.map((video) => (
            <VideoCard
              key={video.id}
              video={video}
              onDelete={handleDelete}
            />
          ))}
        </div>
      ) : (
        <VideoListView videos={videos} onDelete={handleDelete} />
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 pt-4">
          <Button
            variant="outline"
            size="sm"
            disabled={currentPage <= 1}
            onClick={() => {
              startTransition(() => {
                router.push(buildUrl({ page: String(currentPage - 1) }))
              })
            }}
          >
            Previous
          </Button>
          <span className="px-4 text-sm text-zinc-400">
            Page {currentPage} of {totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={currentPage >= totalPages}
            onClick={() => {
              startTransition(() => {
                router.push(buildUrl({ page: String(currentPage + 1) }))
              })
            }}
          >
            Next
          </Button>
        </div>
      )}

      {/* Upload Modal */}
      <UploadModal
        isOpen={showUploadModal}
        onClose={() => setShowUploadModal(false)}
        onUploadComplete={handleUploadComplete}
        folderId={currentFolderId ?? undefined}
      />
    </div>
  )
}

function VideoListView({
  videos,
  onDelete,
}: {
  videos: Video[]
  onDelete: (id: string) => void
}) {
  return (
    <div className="overflow-hidden rounded-lg border border-zinc-800">
      <table className="w-full">
        <thead>
          <tr className="border-b border-zinc-800 bg-zinc-900/50">
            <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-zinc-400">
              Video
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-zinc-400">
              Status
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-zinc-400">
              Duration
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-zinc-400">
              Created
            </th>
            <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-zinc-400">
              Actions
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-zinc-800">
          {videos.map((video) => (
            <tr
              key={video.id}
              className="bg-zinc-900/30 transition-colors hover:bg-zinc-800/50"
            >
              <td className="px-4 py-3">
                <Link
                  href={`/admin/videos/${video.id}`}
                  className="font-medium text-white hover:text-primary"
                >
                  {video.title}
                </Link>
              </td>
              <td className="px-4 py-3">
                <VideoStatusBadge status={video.status} />
              </td>
              <td className="px-4 py-3 text-sm text-zinc-400">
                {formatDuration(video.durationSeconds)}
              </td>
              <td className="px-4 py-3 text-sm text-zinc-400">
                {new Date(video.createdAt).toLocaleDateString()}
              </td>
              <td className="px-4 py-3 text-right">
                <div className="flex items-center justify-end gap-2">
                  <Link
                    href={`/admin/videos/${video.id}`}
                    className="rounded px-2 py-1 text-xs text-zinc-400 hover:bg-zinc-700 hover:text-white"
                  >
                    View
                  </Link>
                  <button
                    onClick={() => onDelete(video.id)}
                    className="rounded px-2 py-1 text-xs text-red-400 hover:bg-red-500/10 hover:text-red-300"
                  >
                    Delete
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function EmptyState({
  hasFilters,
  onUpload,
}: {
  hasFilters: boolean
  onUpload: () => void
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-zinc-700 bg-zinc-900/50 py-16">
      <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-zinc-800">
        <Upload className="h-8 w-8 text-zinc-500" />
      </div>
      {hasFilters ? (
        <>
          <h3 className="mb-2 text-lg font-medium text-white">
            No videos found
          </h3>
          <p className="mb-4 text-sm text-zinc-400">
            Try adjusting your search or filters
          </p>
        </>
      ) : (
        <>
          <h3 className="mb-2 text-lg font-medium text-white">
            No videos yet
          </h3>
          <p className="mb-4 text-sm text-zinc-400">
            Upload your first video to get started
          </p>
          <Button onClick={onUpload}>
            <Plus className="mr-2 h-4 w-4" />
            Upload Video
          </Button>
        </>
      )}
    </div>
  )
}
