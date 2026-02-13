/**
 * Video Trimming API
 *
 * POST /api/admin/videos/[id]/trim - Create a trimmed clip
 */

export const dynamic = 'force-dynamic'

import { headers } from 'next/headers'
import { NextResponse } from 'next/server'

import { getVideo } from '@cgk-platform/video'
import {
  createClip,
  getTrimJobs,
  validateTrimRequest,
  type MuxClient,
  type TrimRequest,
} from '@cgk-platform/video/creator-tools'

interface RouteParams {
  params: Promise<{ id: string }>
}

// Lazy load Mux client to avoid issues if not configured
async function getMuxClient() {
  const { getMuxClient: getClient } = await import('@cgk-platform/video')
  return getClient()
}

export async function GET(_request: Request, { params }: RouteParams) {
  const headerList = await headers()
  const tenantSlug = headerList.get('x-tenant-slug')

  if (!tenantSlug) {
    return NextResponse.json({ error: 'Tenant not found' }, { status: 400 })
  }

  const { id: videoId } = await params
  const jobs = await getTrimJobs(tenantSlug, videoId)

  return NextResponse.json({ jobs })
}

export async function POST(request: Request, { params }: RouteParams) {
  const headerList = await headers()
  const tenantSlug = headerList.get('x-tenant-slug')
  const userId = headerList.get('x-user-id')

  if (!tenantSlug) {
    return NextResponse.json({ error: 'Tenant not found' }, { status: 400 })
  }

  if (!userId) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
  }

  const { id: videoId } = await params

  // Get video to check duration
  const video = await getVideo(tenantSlug, videoId)
  if (!video) {
    return NextResponse.json({ error: 'Video not found' }, { status: 404 })
  }

  if (video.status !== 'ready') {
    return NextResponse.json({ error: 'Video is not ready for trimming' }, { status: 400 })
  }

  if (!video.durationSeconds) {
    return NextResponse.json({ error: 'Video duration unknown' }, { status: 400 })
  }

  let body: TrimRequest
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const validation = validateTrimRequest(body, video.durationSeconds)
  if (!validation.valid) {
    return NextResponse.json({ error: validation.errors.join(', ') }, { status: 400 })
  }

  try {
    const muxClient = await getMuxClient() as MuxClient
    const result = await createClip(muxClient, tenantSlug, userId, videoId, body)

    if (!result.success) {
      return NextResponse.json({ error: result.error || 'Failed to create clip' }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      videoId: result.newVideoId,
      muxAssetId: result.newMuxAssetId,
      duration: result.duration,
      playbackId: result.playbackId,
    }, { status: 201 })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to create clip'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
