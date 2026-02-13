/**
 * Video Library Page
 *
 * Full video library with grid/list view, folders, search, and upload
 *
 * @ai-pattern tenant-isolation
 */

import { withTenant } from '@cgk-platform/db'
import { getAllFolders, getVideos, type VideoStatus } from '@cgk-platform/video'
import { headers } from 'next/headers'
import { Suspense } from 'react'

import { FolderSidebar } from '@/components/admin/video/folder-sidebar'
import { VideoLibrary } from '@/components/admin/video/video-library'

import type { ViewMode } from '@/lib/video/types'

interface VideoPageProps {
  searchParams: Promise<{
    page?: string
    search?: string
    status?: string
    folder?: string
    view?: string
  }>
}

export default async function VideosPage({ searchParams }: VideoPageProps) {
  const params = await searchParams

  return (
    <div className="flex h-[calc(100vh-4rem)] overflow-hidden">
      <Suspense fallback={<SidebarSkeleton />}>
        <FolderSidebarLoader />
      </Suspense>

      <main className="flex-1 overflow-y-auto p-6">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-white">Video Library</h1>
          <p className="text-sm text-zinc-400">
            Manage and organize your video content
          </p>
        </div>

        <Suspense fallback={<VideoGridSkeleton />}>
          <VideoLibraryLoader params={params} />
        </Suspense>
      </main>
    </div>
  )
}

async function FolderSidebarLoader() {
  const headerList = await headers()
  const tenantSlug = headerList.get('x-tenant-slug')
  const userId = headerList.get('x-user-id')

  if (!tenantSlug || !userId) {
    return <div className="w-64 border-r border-zinc-800 bg-zinc-900/50" />
  }

  const folders = await withTenant(tenantSlug, () => getAllFolders(tenantSlug, userId))

  // Get total video count
  const { totalCount } = await withTenant(tenantSlug, () =>
    getVideos(tenantSlug, userId, { limit: 1 }),
  )

  return <FolderSidebar folders={folders} totalVideoCount={totalCount} />
}

async function VideoLibraryLoader({
  params,
}: {
  params: {
    page?: string
    search?: string
    status?: string
    folder?: string
    view?: string
  }
}) {
  const headerList = await headers()
  const tenantSlug = headerList.get('x-tenant-slug')
  const userId = headerList.get('x-user-id')

  if (!tenantSlug || !userId) {
    return (
      <div className="flex items-center justify-center py-16 text-zinc-400">
        Please log in to view videos
      </div>
    )
  }

  const page = Math.max(1, parseInt(params.page || '1', 10))
  const limit = 20
  const offset = (page - 1) * limit
  const search = params.search || ''
  const status = (params.status as VideoStatus) || undefined
  const folderId = params.folder || undefined
  const viewMode = (params.view as ViewMode) || 'grid'

  const { rows: videos, totalCount } = await withTenant(tenantSlug, () =>
    getVideos(tenantSlug, userId, {
      limit,
      offset,
      search,
      status,
      folderId,
      sort: 'created_at',
      dir: 'desc',
    }),
  )

  const totalPages = Math.ceil(totalCount / limit)

  return (
    <VideoLibrary
      videos={videos}
      totalCount={totalCount}
      currentPage={page}
      totalPages={totalPages}
      currentFolderId={folderId ?? null}
      currentStatus={status ?? null}
      currentSearch={search}
      viewMode={viewMode}
    />
  )
}

function SidebarSkeleton() {
  return (
    <aside className="w-64 flex-shrink-0 border-r border-zinc-800 bg-zinc-900/50">
      <div className="border-b border-zinc-800 px-4 py-3">
        <div className="h-5 w-20 animate-pulse rounded bg-zinc-800" />
      </div>
      <div className="space-y-2 p-2">
        <div className="h-10 animate-pulse rounded-lg bg-zinc-800" />
        <div className="h-10 animate-pulse rounded-lg bg-zinc-800" />
        <div className="h-10 animate-pulse rounded-lg bg-zinc-800" />
      </div>
    </aside>
  )
}

function VideoGridSkeleton() {
  return (
    <div className="space-y-4">
      {/* Toolbar skeleton */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-10 w-64 animate-pulse rounded-lg bg-zinc-800" />
          <div className="h-10 w-48 animate-pulse rounded-lg bg-zinc-800" />
        </div>
        <div className="flex items-center gap-3">
          <div className="h-10 w-20 animate-pulse rounded-lg bg-zinc-800" />
          <div className="h-10 w-24 animate-pulse rounded-lg bg-zinc-800" />
        </div>
      </div>

      {/* Grid skeleton */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="space-y-3">
            <div className="aspect-video animate-pulse rounded-lg bg-zinc-800" />
            <div className="space-y-2">
              <div className="h-4 w-3/4 animate-pulse rounded bg-zinc-800" />
              <div className="h-3 w-1/2 animate-pulse rounded bg-zinc-800" />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
