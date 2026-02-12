/**
 * Video Detail Page
 *
 * Shows video player with:
 * - HLS.js video player
 * - Video metadata and editing
 * - Transcription viewer (when available)
 * - AI-generated content
 * - Analytics
 *
 * @ai-pattern tenant-isolation
 */

import { withTenant } from '@cgk/db'
import {
  getVideo,
  getVideoAnalytics,
} from '@cgk/video'
import { Button, Card, CardContent, CardHeader, CardTitle } from '@cgk/ui'
import { ArrowLeft, Edit, Share2, Trash2 } from 'lucide-react'
import { headers } from 'next/headers'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { Suspense } from 'react'

import { VideoPlayer } from '@/components/admin/video/video-player'
import { VideoStatusBadge } from '@/components/admin/video/video-status-badge'
import { formatDuration, formatFileSize } from '@/lib/video/types'

interface Props {
  params: Promise<{ id: string }>
}

export default async function VideoDetailPage({ params }: Props) {
  const { id: videoId } = await params
  const headerList = await headers()
  const tenantSlug = headerList.get('x-tenant-slug')

  if (!tenantSlug) {
    return (
      <div className="flex items-center justify-center py-16 text-zinc-400">
        Please log in to view this video
      </div>
    )
  }

  const video = await withTenant(tenantSlug, () => getVideo(tenantSlug, videoId))

  if (!video) {
    notFound()
  }

  return (
    <div className="space-y-6 p-6">
      {/* Back Link */}
      <Link
        href="/admin/videos"
        className="inline-flex items-center gap-2 text-sm text-zinc-400 hover:text-white"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Library
      </Link>

      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold text-white">{video.title}</h1>
          {video.description && (
            <p className="text-sm text-zinc-400">{video.description}</p>
          )}
          <div className="flex items-center gap-4 pt-2">
            <VideoStatusBadge status={video.status} />
            {video.durationSeconds && (
              <span className="text-sm text-zinc-500">
                {formatDuration(video.durationSeconds)}
              </span>
            )}
            {video.fileSizeBytes && (
              <span className="text-sm text-zinc-500">
                {formatFileSize(video.fileSizeBytes)}
              </span>
            )}
            <span className="text-sm text-zinc-500">
              {new Date(video.createdAt).toLocaleDateString()}
            </span>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm">
            <Edit className="mr-2 h-4 w-4" />
            Edit
          </Button>
          <Button variant="outline" size="sm">
            <Share2 className="mr-2 h-4 w-4" />
            Share
          </Button>
          <Button variant="outline" size="sm" className="text-red-400 hover:text-red-300">
            <Trash2 className="mr-2 h-4 w-4" />
            Delete
          </Button>
        </div>
      </div>

      {/* Video Player */}
      {video.status === 'ready' && video.muxPlaybackId ? (
        <VideoPlayer
          playbackId={video.muxPlaybackId}
          title={video.title}
          className="aspect-video max-h-[70vh]"
        />
      ) : (
        <Card>
          <CardContent className="flex aspect-video items-center justify-center rounded-lg bg-zinc-900">
            {video.status === 'error' ? (
              <div className="text-center">
                <p className="text-red-400">Video processing failed</p>
                {video.errorMessage && (
                  <p className="mt-2 text-sm text-zinc-500">{video.errorMessage}</p>
                )}
              </div>
            ) : (
              <div className="text-center">
                <div className="mb-4 h-12 w-12 animate-spin rounded-full border-4 border-zinc-700 border-t-primary mx-auto" />
                <p className="text-zinc-400">
                  {video.status === 'uploading'
                    ? 'Uploading video...'
                    : 'Processing video...'}
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Content Grid */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Video Details */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-medium uppercase tracking-wider text-zinc-500">
                    Created
                  </label>
                  <p className="text-sm text-zinc-200">
                    {new Date(video.createdAt).toLocaleString()}
                  </p>
                </div>
                <div>
                  <label className="text-xs font-medium uppercase tracking-wider text-zinc-500">
                    Updated
                  </label>
                  <p className="text-sm text-zinc-200">
                    {new Date(video.updatedAt).toLocaleString()}
                  </p>
                </div>
                {video.recordingType && (
                  <div>
                    <label className="text-xs font-medium uppercase tracking-wider text-zinc-500">
                      Recording Type
                    </label>
                    <p className="text-sm capitalize text-zinc-200">
                      {video.recordingType.replace('_', ' + ')}
                    </p>
                  </div>
                )}
                {video.muxAssetId && (
                  <div>
                    <label className="text-xs font-medium uppercase tracking-wider text-zinc-500">
                      Asset ID
                    </label>
                    <p className="text-sm font-mono text-zinc-400">
                      {video.muxAssetId}
                    </p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Analytics */}
          <Suspense fallback={<AnalyticsSkeleton />}>
            <VideoAnalyticsCard tenantSlug={tenantSlug} videoId={videoId} />
          </Suspense>
        </div>
      </div>
    </div>
  )
}

async function VideoAnalyticsCard({
  tenantSlug,
  videoId,
}: {
  tenantSlug: string
  videoId: string
}) {
  const analytics = await withTenant(tenantSlug, () =>
    getVideoAnalytics(tenantSlug, videoId),
  )

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Analytics</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <StatItem label="Total Views" value={analytics.totalViews} />
          <StatItem label="Unique Viewers" value={analytics.uniqueViewers} />
          <StatItem
            label="Avg. Watch Time"
            value={formatDuration(analytics.averageWatchTimeSeconds)}
          />
          <StatItem
            label="Completion Rate"
            value={`${Math.round(analytics.completionRate * 100)}%`}
          />
        </div>
      </CardContent>
    </Card>
  )
}

function StatItem({ label, value }: { label: string; value: string | number }) {
  return (
    <div>
      <p className="text-xs font-medium uppercase tracking-wider text-zinc-500">
        {label}
      </p>
      <p className="text-xl font-semibold text-white">{value}</p>
    </div>
  )
}

function AnalyticsSkeleton() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Analytics</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="space-y-2">
              <div className="h-3 w-16 animate-pulse rounded bg-zinc-800" />
              <div className="h-6 w-12 animate-pulse rounded bg-zinc-800" />
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
