'use client'

import { PROFILES } from '@cgk-platform/openclaw/profiles'
import { use, useCallback, useEffect, useState } from 'react'

import { MediaGallery } from '@/components/media/media-gallery'
import { MediaLightbox } from '@/components/media/media-lightbox'
import { RefreshButton } from '@/components/ui/refresh-button'

interface MediaFile {
  name: string
  type: 'image' | 'video'
  size: number
  mtime: string
}

export default function MediaPage({
  params,
}: {
  params: Promise<{ profile: string }>
}) {
  const { profile } = use(params)
  const config = PROFILES[profile as keyof typeof PROFILES]
  const [files, setFiles] = useState<MediaFile[]>([])
  const [loading, setLoading] = useState(true)
  const [hasMore, setHasMore] = useState(false)
  const [loadingMore, setLoadingMore] = useState(false)
  const [typeFilter, setTypeFilter] = useState<string>('')
  const [lightboxFile, setLightboxFile] = useState<MediaFile | null>(null)

  const fetchData = useCallback(async (offset = 0, append = false) => {
    try {
      const params = new URLSearchParams({ offset: String(offset), limit: '50' })
      if (typeFilter) params.set('type', typeFilter)
      const res = await fetch(`/api/openclaw/${profile}/media?${params}`)
      const data = await res.json()
      const newFiles = data.files || []
      setFiles((prev) => append ? [...prev, ...newFiles] : newFiles)
      setHasMore(data.hasMore ?? false)
    } catch {
      // ignore
    } finally {
      setLoading(false)
      setLoadingMore(false)
    }
  }, [profile, typeFilter])

  useEffect(() => {
    setLoading(true)
    fetchData()
  }, [fetchData])

  const loadMore = useCallback(() => {
    setLoadingMore(true)
    fetchData(files.length, true)
  }, [fetchData, files.length])

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            Media — {config?.label || profile}
          </h1>
          <p className="text-muted-foreground">
            {files.length} files{hasMore ? '+' : ''}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="rounded-md border bg-background px-2 py-1 text-sm"
          >
            <option value="">All Types</option>
            <option value="image">Images</option>
            <option value="video">Videos</option>
          </select>
          <RefreshButton onRefresh={() => fetchData()} />
        </div>
      </div>

      {loading ? (
        <div className="h-64 animate-pulse rounded-lg border bg-card" />
      ) : (
        <MediaGallery
          files={files}
          profile={profile}
          hasMore={hasMore}
          loadingMore={loadingMore}
          onLoadMore={loadMore}
          onSelect={setLightboxFile}
        />
      )}

      {lightboxFile && (
        <MediaLightbox
          file={lightboxFile}
          profile={profile}
          onClose={() => setLightboxFile(null)}
        />
      )}
    </div>
  )
}
