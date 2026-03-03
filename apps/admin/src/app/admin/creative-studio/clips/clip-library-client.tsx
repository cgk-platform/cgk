'use client'

import { useState } from 'react'
import { Badge, Button, Card, Input } from '@cgk-platform/ui'
import { AlertTriangle, ChevronLeft, ChevronRight, Film, Search, Star, X } from 'lucide-react'
import { useRouter } from 'next/navigation'

export interface ClipRow {
  id: string
  title: string
  description: string | null
  thumbnail_url: string | null
  mux_playback_id: string | null
  duration_seconds: number | null
  clip_source_type: string | null
  has_burned_captions: boolean
  segment_count: string | null
  avg_quality: string | null
  created_at: string
}

interface ClipLibraryClientProps {
  clips: ClipRow[]
  search: string
  sourceFilter: string
  page: number
  totalCount: number
  pageSize: number
}

export function ClipLibraryClient({
  clips,
  search,
  sourceFilter,
  page,
  totalCount,
  pageSize,
}: ClipLibraryClientProps) {
  const router = useRouter()
  const [searchValue, setSearchValue] = useState(search)
  const [previewClip, setPreviewClip] = useState<ClipRow | null>(null)

  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize))

  const buildUrl = (overrides: { search?: string; source?: string; page?: number }) => {
    const params = new URLSearchParams()
    const s = overrides.search ?? searchValue
    const src = overrides.source ?? sourceFilter
    const p = overrides.page ?? 1
    if (s) params.set('search', s)
    if (src) params.set('source', src)
    if (p > 1) params.set('page', String(p))
    return `/admin/creative-studio/clips?${params.toString()}`
  }

  const handleSearch = () => {
    router.push(buildUrl({ search: searchValue, page: 1 }))
  }

  const handleSourceChange = (value: string) => {
    router.push(buildUrl({ source: value, page: 1 }))
  }

  return (
    <>
      <div className="flex items-center justify-between border-b border-slate-800 px-6 py-4">
        <div>
          <h1 className="text-xl font-semibold text-slate-100">Clip Library</h1>
          <p className="text-sm text-slate-400">{totalCount} video clips</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
            <Input
              placeholder="Search clips..."
              value={searchValue}
              onChange={(e) => setSearchValue(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              className="w-72 border-slate-700 bg-slate-800 pl-9"
            />
          </div>
          <select
            value={sourceFilter}
            onChange={(e) => handleSourceChange(e.target.value)}
            className="rounded-md border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-200 focus:outline-none focus:ring-1 focus:ring-slate-600"
          >
            <option value="">All Sources</option>
            <option value="social">Social</option>
            <option value="stock">Stock</option>
            <option value="gdrive">Google Drive</option>
            <option value="veo">Veo (AI)</option>
            <option value="kling">Kling (AI)</option>
            <option value="inbound">Inbound</option>
            <option value="recorded">Recorded</option>
          </select>
          {(search || sourceFilter) && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => router.push('/admin/creative-studio/clips')}
              className="text-slate-400 hover:text-slate-200"
            >
              Clear
            </Button>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6">
        {clips.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20">
            <Film className="mb-3 h-12 w-12 text-slate-600" />
            <p className="text-slate-400">No clips found</p>
            <p className="mt-1 text-sm text-slate-500">
              Upload clips to the DAM or run the catalog migration
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
            {clips.map((clip) => (
              <ClipCard key={clip.id} clip={clip} onPreview={() => setPreviewClip(clip)} />
            ))}
          </div>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-3 border-t border-slate-800 px-6 py-3">
          <Button
            variant="outline"
            size="sm"
            disabled={page <= 1}
            onClick={() => router.push(buildUrl({ page: page - 1 }))}
            className="border-slate-700 text-slate-300"
          >
            <ChevronLeft className="mr-1 h-4 w-4" />
            Previous
          </Button>
          <span className="text-sm text-slate-400">
            Page {page} of {totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={page >= totalPages}
            onClick={() => router.push(buildUrl({ page: page + 1 }))}
            className="border-slate-700 text-slate-300"
          >
            Next
            <ChevronRight className="ml-1 h-4 w-4" />
          </Button>
        </div>
      )}

      {/* Preview modal */}
      {previewClip && <ClipPreviewModal clip={previewClip} onClose={() => setPreviewClip(null)} />}
    </>
  )
}

function ClipCard({ clip, onPreview }: { clip: ClipRow; onPreview: () => void }) {
  const quality = clip.avg_quality ? Math.round(parseFloat(clip.avg_quality)) : null
  const segments = clip.segment_count ? parseInt(clip.segment_count, 10) : 0
  const duration = clip.duration_seconds ? formatDuration(clip.duration_seconds) : null

  const thumbUrl = clip.mux_playback_id
    ? `https://image.mux.com/${clip.mux_playback_id}/thumbnail.webp?width=320&height=180&fit=smartcrop`
    : clip.thumbnail_url

  return (
    <Card
      className="group cursor-pointer overflow-hidden border-slate-800 bg-slate-900 p-0 transition-all hover:border-slate-600 hover:shadow-lg"
      onClick={onPreview}
    >
      <div className="relative aspect-video bg-slate-800">
        {thumbUrl ? (
          <img src={thumbUrl} alt={clip.title} className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full items-center justify-center">
            <Film className="h-8 w-8 text-slate-600" />
          </div>
        )}

        {duration && (
          <span className="absolute bottom-1 right-1 rounded bg-black/70 px-1.5 py-0.5 text-xs text-white">
            {duration}
          </span>
        )}

        {clip.has_burned_captions && (
          <span
            className="absolute right-1 top-1 rounded bg-amber-500/90 p-1"
            title="Has burned-in captions"
          >
            <AlertTriangle className="h-3 w-3 text-black" />
          </span>
        )}

        {quality !== null && quality > 0 && (
          <div className="absolute left-1 top-1 flex items-center gap-0.5 rounded bg-black/70 px-1.5 py-0.5">
            {Array.from({ length: 5 }).map((_, i) => (
              <Star
                key={i}
                className={`h-2.5 w-2.5 ${
                  i < quality ? 'fill-amber-400 text-amber-400' : 'text-slate-600'
                }`}
              />
            ))}
          </div>
        )}
      </div>

      <div className="p-2">
        <p className="truncate text-sm font-medium text-slate-200">{clip.title}</p>
        <div className="mt-1 flex items-center gap-2">
          {clip.clip_source_type && (
            <Badge variant="secondary" className="px-1.5 py-0 text-[10px]">
              {clip.clip_source_type}
            </Badge>
          )}
          {segments > 0 && <span className="text-[10px] text-slate-500">{segments} segments</span>}
        </div>
      </div>
    </Card>
  )
}

function ClipPreviewModal({ clip, onClose }: { clip: ClipRow; onClose: () => void }) {
  const quality = clip.avg_quality ? Math.round(parseFloat(clip.avg_quality)) : null
  const segments = clip.segment_count ? parseInt(clip.segment_count, 10) : 0

  const mp4Url = clip.mux_playback_id
    ? `https://stream.mux.com/${clip.mux_playback_id}/medium.mp4`
    : null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-2xl rounded-lg border border-slate-700 bg-slate-900 p-0 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={onClose}
          className="absolute right-3 top-3 z-10 rounded-full bg-slate-800 p-1.5 text-slate-400 transition-colors hover:text-slate-200"
        >
          <X className="h-4 w-4" />
        </button>

        {/* Video player */}
        <div className="aspect-video overflow-hidden rounded-t-lg bg-black">
          {mp4Url ? (
            <video src={mp4Url} controls autoPlay className="h-full w-full" />
          ) : (
            <div className="flex h-full items-center justify-center">
              <Film className="h-12 w-12 text-slate-600" />
              <p className="ml-3 text-slate-500">No playback available</p>
            </div>
          )}
        </div>

        {/* Metadata */}
        <div className="space-y-3 p-4">
          <h3 className="text-lg font-semibold text-slate-100">{clip.title}</h3>

          {clip.description && <p className="text-sm text-slate-400">{clip.description}</p>}

          <div className="flex flex-wrap items-center gap-3">
            {clip.clip_source_type && <Badge variant="secondary">{clip.clip_source_type}</Badge>}
            {clip.duration_seconds && (
              <span className="text-sm text-slate-400">
                {formatDuration(clip.duration_seconds)}
              </span>
            )}
            {segments > 0 && <span className="text-sm text-slate-400">{segments} segments</span>}
            {quality !== null && quality > 0 && (
              <div className="flex items-center gap-0.5">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star
                    key={i}
                    className={`h-3.5 w-3.5 ${
                      i < quality ? 'fill-amber-400 text-amber-400' : 'text-slate-600'
                    }`}
                  />
                ))}
              </div>
            )}
            {clip.has_burned_captions && (
              <span className="flex items-center gap-1 text-xs text-amber-400">
                <AlertTriangle className="h-3 w-3" />
                Burned captions
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60)
  const s = Math.floor(seconds % 60)
  return m > 0 ? `${m}:${s.toString().padStart(2, '0')}` : `${s}s`
}
